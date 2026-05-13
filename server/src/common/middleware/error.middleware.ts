import { MongoServerError } from "mongodb";
import { Error as MongooseError } from "mongoose";

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let statusCode = 500;
  let message = "Internal Server Error";

  // 1. Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = err.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    res.status(statusCode).json({ success: false, error: message });
    return;
  }

  // 2. Custom ApiErrors
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    if (statusCode >= 500) console.error("[ApiError 5xx]:", err);
    res.status(statusCode).json({ success: false, error: message });
    return;
  }

// 3. MongoDB duplicate key (email already registered, duplicate vote, etc.)
  if (err instanceof MongoServerError && err.code === 11000) {
    const isDuplicateResponse =
      err.message?.includes("unique_authenticated_response") ||
      err.message?.includes("unique_anonymous_response");
    res.status(409).json({
      success: false,
      error: isDuplicateResponse
        ? "You have already submitted a response for this poll."
        : `${Object.keys(err.keyValue ?? {})[0] ?? "field"} already exists.`,
    });
    return;
  }

  // 4. Mongoose validation error (schema-level, catches required fields etc.)
  if (err instanceof MongooseError.ValidationError) {
    const message = Object.values(err.errors).map((e) => e.message).join(", ");
    res.status(400).json({ success: false, error: message });
    return;
  }

  // 5. Mongoose CastError (invalid ObjectId in URL params)
  if (err instanceof MongooseError.CastError) {
    res.status(400).json({ success: false, error: `Invalid ${err.path}: ${err.value}` });
    return;
  }

  // 6. Fallback
  console.error("[Unhandled Error]:", err);
  res.status(statusCode).json({ success: false, error: message });
};