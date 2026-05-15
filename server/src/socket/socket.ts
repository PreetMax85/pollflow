import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { env } from "../common/config/env.js";
import { Poll } from "../modules/polls/poll.schema.js";
import { verifyAccessToken } from "../common/utils/jwt.js";
import { TokenBlocklist } from "../modules/auth/token-blocklist.schema.js";

interface ServerToClientEvents {
  "poll:response-count": (payload: {
    pollId: string;
    totalResponses: number;
    timestamp: string;
  }) => void;

  "poll:analytics-update": (payload: {
    pollId: string;
    totalResponses: number;
    questions: QuestionAnalytics[];
    timestamp: string;
  }) => void;

  "poll:published": (payload: { pollId: string; timestamp: string }) => void;

  "poll:expired": (payload: { pollId: string; timestamp: string }) => void;

  "room:joined": (payload: { pollId: string; socketId: string }) => void;
}

interface ClientToServerEvents {
  "join:poll": (pollId: string) => void;
  "join:poll:admin": (payload: { pollId: string; token: string }) => void;
  "leave:poll": (pollId: string) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  userId?: string;
  joinedRooms: Set<string>;
}

export interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  isRequired: boolean;
  totalAnswers: number;
  options: {
    optionId: string;
    optionText: string;
    count: number;
    percentage: number;
  }[];
}

export interface AnalyticsSnapshot {
  totalResponses: number;
  questions: QuestionAnalytics[];
  dailyTimeline: { date: string; count: number }[];
}

let io: SocketServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const PUBLIC_PREFIX = "public:poll:";
const ADMIN_PREFIX = "poll:admin:";

export const initSocket = (
  httpServer: HttpServer,
): SocketServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> => {
  if (io) {
    console.warn("[Socket] initSocket called more than once — returning existing instance");
    return io;
  }

  io = new SocketServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  io.on(
    "connection",
    (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
      console.log(`[Socket] Client connected   : ${socket.id}`);
      socket.data.joinedRooms = new Set();

      // join:poll (public room)
      // Anyone can join — receives count updates, publish/expiry events.
      socket.on("join:poll", (pollId: string) => {
        if (!pollId || typeof pollId !== "string" || pollId.trim().length === 0) {
          console.warn(`[Socket] Invalid pollId from ${socket.id}: ${pollId}`);
          return;
        }

        const room = `${PUBLIC_PREFIX}${pollId.trim()}`;
        if (socket.data.joinedRooms.has(room)) return;

        socket.join(room);
        socket.data.joinedRooms.add(room);
        socket.emit("room:joined", { pollId, socketId: socket.id });

        console.log(`[Socket] ${socket.id} joined room : ${room}`);
      });

      // join:poll:admin (admin room — creator only)
      // Requires a valid Bearer token. Server verifies the token, checks that
      // the authenticated user is the poll creator, then joins the admin room.
      // Admin room receives full analytics updates including option breakdowns.
      socket.on("join:poll:admin", async (payload: { pollId: string; token: string }) => {
        try {
          if (!payload || !payload.pollId || !payload.token) {
            socket.emit("room:joined", { pollId: "error", socketId: socket.id });
            return;
          }

          const decoded = verifyAccessToken(payload.token);

          const isRevoked = await TokenBlocklist.exists({ jti: decoded.jti });
          if (isRevoked) {
            socket.emit("room:joined", { pollId: "error", socketId: socket.id });
            return;
          }

          const pollId = payload.pollId.trim();
          const poll = await Poll.findById(pollId).select("createdBy").lean();

          if (!poll || poll.createdBy.toString() !== decoded.userId) {
            socket.emit("room:joined", { pollId: "error", socketId: socket.id });
            return;
          }

          const room = `${ADMIN_PREFIX}${pollId}`;
          if (socket.data.joinedRooms.has(room)) return;

          socket.join(room);
          socket.data.joinedRooms.add(room);
          socket.emit("room:joined", { pollId, socketId: socket.id });

          console.log(`[Socket] ${socket.id} joined admin room : ${room}`);
        } catch {
          socket.emit("room:joined", { pollId: "error", socketId: socket.id });
        }
      });

      // leave:poll
      socket.on("leave:poll", (pollId: string) => {
        if (!pollId || typeof pollId !== "string") return;

        const publicRoom = `${PUBLIC_PREFIX}${pollId.trim()}`;
        const adminRoom = `${ADMIN_PREFIX}${pollId.trim()}`;

        socket.leave(publicRoom);
        socket.data.joinedRooms.delete(publicRoom);

        socket.leave(adminRoom);
        socket.data.joinedRooms.delete(adminRoom);

        console.log(`[Socket] ${socket.id} left rooms : ${publicRoom}, ${adminRoom}`);
      });

      socket.on("disconnect", (reason: string) => {
        console.log(`[Socket] Client disconnected: ${socket.id} — reason: ${reason}`);
        socket.data.joinedRooms.clear();
      });

      socket.on("error", (err: Error) => {
        console.error(`[Socket] Error on ${socket.id}:`, err.message);
      });
    },
  );

  console.log("[Socket] Socket.io initialized");
  return io;
};

// Emit Helpers

/**
 * Broadcast response count to the PUBLIC room.
 * Admin clients are also in the public room so they receive this too.
 */
export const emitResponseCount = (pollId: string, totalResponses: number): void => {
  if (!io) {
    console.warn("[Socket] emitResponseCount called before io was initialized");
    return;
  }
  io.to(`${PUBLIC_PREFIX}${pollId}`).emit("poll:response-count", {
    pollId,
    totalResponses,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Broadcast full analytics snapshot to the ADMIN room ONLY.
 * Option counts and percentages are private until the creator publishes results.
 * Only clients that authenticated and proved creator status receive this.
 */
export const emitAnalyticsUpdate = (pollId: string, snapshot: AnalyticsSnapshot): void => {
  if (!io) {
    console.warn("[Socket] emitAnalyticsUpdate called before io was initialized");
    return;
  }
  io.to(`${ADMIN_PREFIX}${pollId}`).emit("poll:analytics-update", {
    pollId,
    ...snapshot,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Notify ALL clients (both public and admin rooms) that results are published.
 * Public clients react by redirecting to the results page.
 * Admin clients see the status update on their dashboard.
 */
export const emitPollPublished = (pollId: string): void => {
  if (!io) {
    console.warn("[Socket] emitPollPublished called before io was initialized");
    return;
  }
  io.to(`${PUBLIC_PREFIX}${pollId}`).emit("poll:published", {
    pollId,
    timestamp: new Date().toISOString(),
  });
  io.to(`${ADMIN_PREFIX}${pollId}`).emit("poll:published", {
    pollId,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Notify ALL clients that the poll has expired.
 */
export const emitPollExpired = (pollId: string): void => {
  if (!io) {
    console.warn("[Socket] emitPollExpired called before io was initialized");
    return;
  }
  io.to(`${PUBLIC_PREFIX}${pollId}`).emit("poll:expired", {
    pollId,
    timestamp: new Date().toISOString(),
  });
  io.to(`${ADMIN_PREFIX}${pollId}`).emit("poll:expired", {
    pollId,
    timestamp: new Date().toISOString(),
  });
};

export const getIO = (): SocketServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> => {
  if (!io) {
    throw new Error("[Socket] Socket.io is not initialized. Call initSocket(httpServer) first.");
  }
  return io;
};
