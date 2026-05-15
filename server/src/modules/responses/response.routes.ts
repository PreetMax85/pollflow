import { Router } from "express";
import { ResponseController } from "./response.controller.js";
import { asyncHandler } from "../../common/utils/async-handler.js";
import { optionalAuth } from "../../common/middleware/optional-auth.middleware.js";
import { responseLimiter } from "../../common/middleware/rate-limit.js";

const router = Router();

router.post(
  "/:pollId/respond",
  responseLimiter,
  optionalAuth,
  asyncHandler(ResponseController.submit),
);

export { router as responseRoutes };
