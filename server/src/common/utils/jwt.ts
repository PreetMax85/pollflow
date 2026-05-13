import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { ApiError } from "./ApiError.js";
import { env } from "../config/env.js";

const ACCESS_SECRET = env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET;

export interface TokenPayload extends jwt.JwtPayload {
  userId: string;
  jti: string;
  type: "access" | "refresh"; // prevents token confusion attacks
}

export const generateAccessToken = (payload: { userId: string }): string => {
  const options = { expiresIn: env.JWT_ACCESS_EXPIRES_IN || "15m" } as jwt.SignOptions;
  return jwt.sign(
    { ...payload, type: "access", jti: crypto.randomUUID() }, // ← add jti
    ACCESS_SECRET,
    options,
  );
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as TokenPayload;
    if (decoded.type !== "access") {
      throw new Error("Wrong token type");
    }
    return decoded;
  } catch (error) {
    // Distinguish expired vs tampered for logging, but always throw the same error to the client
    if (error instanceof jwt.TokenExpiredError) {
      console.debug("[JWT] Access token expired");
    }
    throw ApiError.unauthorized("Invalid or expired access token");
  }
};

export const generateRefreshToken = (payload: { userId: string }): string => {
  const options = { expiresIn: env.JWT_REFRESH_EXPIRES_IN || "7d" } as jwt.SignOptions;
  return jwt.sign(
    { ...payload, type: "refresh", jti: crypto.randomUUID() }, // ← add jti
    REFRESH_SECRET,
    options,
  );
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET) as TokenPayload;
    if (decoded.type !== "refresh") {
      throw new Error("Wrong token type");
    }
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.debug("[JWT] Refresh token expired");
    }
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }
};

export const generateResetToken = (): {
  rawToken: string;
  hashedToken: string;
  resetTokenExpiresAt: Date;
} => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  return { rawToken, hashedToken, resetTokenExpiresAt };
};
