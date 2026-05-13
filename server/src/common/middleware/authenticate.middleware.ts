import { TokenBlocklist } from "../../modules/auth/token-blocklist.schema.js";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/jwt.js";
import type { TokenPayload } from "../utils/jwt.js";

// Extend the Express Request to include our user payload
export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const requireAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Authentication token is missing or invalid");
    }

    const token = authHeader.split(" ")[1];
    if (!token) throw ApiError.unauthorized("Authentication token is missing");

    const decoded = verifyAccessToken(token);

    //token revocation check
    const isRevoked = await TokenBlocklist.exists({ jti: decoded.jti });
    if (isRevoked) throw ApiError.unauthorized("Token has been revoked");

    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};
