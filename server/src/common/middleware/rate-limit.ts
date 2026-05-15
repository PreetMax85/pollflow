import rateLimit from "express-rate-limit";

/**
 * Applied to: POST /api/v1/auth/login
 * Tight limit — 10 attempts per 15 minutes per IP.
 * Rate limiting prevents brute-force attacks on login.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many login attempts from this IP. Please try again in 15 minutes.",
  },
});

/**
 * Applied to: POST /api/v1/auth/register
 * Prevents mass account creation from a single IP.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many accounts created from this IP. Please try again in 1 hour.",
  },
});

/**
 * Applied to: POST /api/v1/auth/forgot-password
 *             POST /api/v1/auth/reset-password
 * Rate limiting on reset endpoints prevents token brute-forcing.
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many password reset attempts. Please try again in 1 hour.",
  },
});

/**
 * Applied to: POST /api/v1/polls/:pollId/respond
 * Prevents a single IP from spamming anonymous responses to a poll.
 * Authenticated users are additionally deduplicated at the DB level.
 */
export const responseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many responses submitted from this IP.",
  },
});

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many refresh attempts." },
});
