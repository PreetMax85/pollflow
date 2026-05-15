import { Router } from "express";
import { AnalyticsController } from "./analytics.controller.js";
import { asyncHandler } from "../../common/utils/async-handler.js";
import { requireAuth } from "../../common/middleware/authenticate.middleware.js";

const router = Router();

// Creator dashboard — full analytics with timeline and anonymous breakdown
router.get("/:pollId", requireAuth, asyncHandler(AnalyticsController.getAnalytics));

// Public results page
router.get("/:pollId/results", asyncHandler(AnalyticsController.getPublishedResults));

export { router as analyticsRoutes };
