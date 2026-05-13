import { Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { AuthRequest } from "./authenticate.middleware.js";

/**
 * Attaches req.user if a valid Bearer token is present.
 * Never throws — unauthenticated requests pass through silently.
 * Used on: public poll-taking routes (anonymous + authenticated responses).
 */
export const optionalAuth = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      req.user = verifyAccessToken(token);
    }
  } catch {
    // Intentionally ignored — anonymous access is valid
  }
  next();
};