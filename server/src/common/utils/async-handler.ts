import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async Express route handler and forwards any thrown error to next().
 * Without this wrapper, every controller needs a try/catch block. With it,
 * throwing an ApiError anywhere in a controller automatically reaches the
 * global error handler — no repeated boilerplate, no forgotten catch blocks.
 */
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
