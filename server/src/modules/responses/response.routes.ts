import { Router } from "express";
import { ResponseController } from "./response.controller.js";
import { asyncHandler } from "../../common/utils/async-handler.js";
import { optionalAuth } from "../../common/middleware/optional-auth.middleware.js";
import { responseLimiter } from "../../common/middleware/rate-limit.js";

/**
 * Response Routes
 *
 * Mounted at /api/v1/polls in index.ts (same base as poll routes).
 * This gives us the nested URL: POST /api/v1/polls/:pollId/respond
 *
 * optionalAuth: if a Bearer token is present and valid, req.user is populated.
 * If absent or invalid, req.user stays undefined — no error thrown.
 * The controller passes req.user?.userId to the service which handles both cases.
 *
 * responseLimiter: prevents a single IP from spamming anonymous responses.
 * Authenticated users are additionally protected by the DB-level unique index.
 */
const router = Router();

router.post(
  "/:pollId/respond",
  responseLimiter,
  optionalAuth,
  asyncHandler(ResponseController.submit),
);

export { router as responseRoutes };