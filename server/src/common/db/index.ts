import mongoose from "mongoose";
import { env } from "../config/env.js";

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("[DB] MongoDB connected successfully");
  } catch (err) {
    console.error("[DB] Connection failed:", err);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("[DB] MongoDB disconnected — reconnecting...");
});

mongoose.connection.on("error", (err) => {
  console.error("[DB] MongoDB runtime error:", err);
});
