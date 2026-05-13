import { Router } from "express";
import {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  refreshLimiter,
} from "../../common/middleware/rate-limit.js";
import { requireAuth } from "../../common/middleware/authenticate.middleware.js";
import { AuthController } from "./auth.controller.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

const router = Router();

// Public
router.post("/register", registerLimiter, asyncHandler(AuthController.register));
router.post("/login", loginLimiter, asyncHandler(AuthController.login));
router.post("/refresh", refreshLimiter, asyncHandler(AuthController.refresh));
router.post("/forgot-password", passwordResetLimiter, asyncHandler(AuthController.forgotPassword));
router.post("/reset-password", passwordResetLimiter, asyncHandler(AuthController.resetPassword));
router.get("/me", requireAuth, asyncHandler(AuthController.me));

// Requires valid access token so we can blocklist its jti on logout
router.post("/logout", requireAuth, asyncHandler(AuthController.logout));

export const authRoutes = router;
