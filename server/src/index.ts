import express, { Application, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./common/config/env.js";
import { connectDB } from "./common/db/index.js";
import { errorHandler } from "./common/middleware/error.middleware.js";
import { ApiResponse } from "./common/utils/ApiResponse.js";
import { initSocket, getIO } from "./socket/socket.js";

// Route Imports
import { authRoutes } from "./modules/auth/auth.routes.js";
import { pollRoutes } from "./modules/polls/poll.routes.js";
import { responseRoutes } from "./modules/responses/response.routes.js";
import { analyticsRoutes } from "./modules/analytics/analytics.routes.js";

// App + HTTP Server
const app: Application = express();
const httpServer = createServer(app);

// Initialize Socket.io on the HTTP server
initSocket(httpServer);

// Rate Limiting 
// Global limiter: protects against scraping/DoS without blocking legitimate traffic.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests from this IP, please try again after 15 minutes.",
  },
  skip: (req: Request) => req.path === "/health",
});

// Core Middleware
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true, 
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(helmet());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// Trust proxy before rate limiter — Railway sends real IP in x-forwarded-for
if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Global rate limiter BEFORE body parsers — block abusive IPs before CPU spend
app.use(globalLimiter);

// Limit request body size to prevent payload-based attacks
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Cookie parser — needed to read the httpOnly refresh token cookie
app.use(cookieParser());

// Health Check ─
// Returns real system state
app.get("/health", (_req: Request, res: Response) => {
  const dbStateMap: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  ApiResponse.ok(res, "System healthy", {
    uptime: Math.round(process.uptime()),
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    db: {
      status: dbStateMap[mongoose.connection.readyState] ?? "unknown",
    },
  });
});

// API Routes 
// All routes are versioned under /api/v1
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/polls", pollRoutes);
app.use("/api/v1/polls", responseRoutes); // mounted on /polls because responses are nested: /polls/:pollId/respond
app.use("/api/v1/analytics", analyticsRoutes);

// 404 Handler
// Catches any request that didn't match a defined route.
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "The requested resource does not exist on this server.",
  });
});

// Global Error Handler
// Catches everything: Zod errors, ApiErrors, Mongoose errors, unhandled throws.
app.use((err: unknown, req: Request, res: Response, next: NextFunction): void => {
  errorHandler(err, req, res, next);
});

// Bootstrap
// We connect to DB before starting the HTTP server. If DB connection fails,
// the process exits immediately — we never start accepting traffic with no DB.
const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    httpServer.listen(env.PORT, () => {
      console.log(`[Server] PollFlow API running in ${env.NODE_ENV} mode`);
      console.log(`[Server] Port         : ${env.PORT}`);
      console.log(`[Server] Health check : http://localhost:${env.PORT}/health`);
      console.log(`[Server] API base     : http://localhost:${env.PORT}/api/v1`);
      console.log(`[Server] Client URL   : ${env.CLIENT_URL}`);
    });
  } catch (err) {
    console.error("[Server] Failed to start:", err);
    process.exit(1);
  }
};

startServer();

// Unhandled Rejection Handler
process.on("unhandledRejection", (reason, promise) => {
  console.error("[Server] Unhandled Rejection at:", promise, "reason:", reason);
});

// Graceful Shutdown
// Close HTTP server, Socket.io, and MongoDB in order on SIGTERM/SIGINT.
// Ensures clean shutdown — HTTP server, Socket.io, and MongoDB close in order.
const shutdown = async (signal: string): Promise<void> => {
  console.log(`\n[Server] ${signal} received — shutting down gracefully...`);

  // 1. Stop accepting new connections, drain active ones
  await new Promise<void>((resolve, reject) => {
    httpServer.close((err) => {
      if (err) {
        console.error("[Server] Error closing HTTP server:", err.message);
        return reject(err);
      }
      console.log("[Server] HTTP server closed");
      resolve();
    });
  });

  // 2. Explicitly close Socket.io
  await getIO().close();
  console.log("[Socket] Socket.io closed");

  // 3. Close MongoDB connection
  await mongoose.connection.close();
  console.log("[DB] MongoDB connection closed");

  process.exit(0);
};

process.on("SIGTERM", () =>
  shutdown("SIGTERM").catch((err) => {
    console.error("[Server] SIGTERM shutdown failed:", err);
    process.exit(1);
  }),
);
process.on("SIGINT", () =>
  shutdown("SIGINT").catch((err) => {
    console.error("[Server] SIGINT shutdown failed:", err);
    process.exit(1);
  }),
);
