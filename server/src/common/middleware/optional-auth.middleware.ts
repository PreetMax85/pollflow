import { Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { AuthRequest } from "./authenticate.middleware.js";
import { TokenBlocklist } from "../../modules/auth/token-blocklist.schema.js";

/**
 * Attaches req.user if a valid, non-revoked Bearer token is present.
 * Never throws — unauthenticated or revoked-token requests pass through silently.
 * Used on: public poll-taking routes (anonymous + authenticated responses).
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const decoded = verifyAccessToken(token);
      const isRevoked = await TokenBlocklist.exists({ jti: decoded.jti });
      if (!isRevoked) {
        req.user = decoded;
      }
    }
  } catch {
    // Intentionally ignored — anonymous access is valid
  }
  next();
};