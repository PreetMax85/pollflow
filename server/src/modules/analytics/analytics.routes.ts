import { Router } from "express";
import { AnalyticsController } from "./analytics.controller.js";
import { asyncHandler } from "../../common/utils/async-handler.js";
import { requireAuth } from "../../common/middleware/authenticate.middleware.js";

/**
 * Analytics Routes — mounted at /api/v1/analytics in index.ts
 *
 * Two endpoints, two different access levels:
 *
 * GET /:pollId          → requireAuth   → creator-only full dashboard
 * GET /:pollId/results  → public        → anyone, only if poll is published
 */
const router = Router();

// Creator dashboard — full analytics with timeline and anonymous breakdown
router.get("/:pollId", requireAuth, asyncHandler(AnalyticsController.getAnalytics));

// Public results page — no auth, but service checks poll.status === "published"
router.get("/:pollId/results", asyncHandler(AnalyticsController.getPublishedResults));

export { router as analyticsRoutes };
