import { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { AuthRequest } from "../../common/middleware/authenticate.middleware.js";
import { verifyRefreshToken } from "../../common/utils/jwt.js";
import { TokenBlocklist } from "./token-blocklist.schema.js";
import { env } from "../../common/config/env.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./dtos/auth.dto.js";

// Cookie Helper
const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
};

// Controller
// asyncHandler in the routes layer catches all throws and forwards them to the global error handler.

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const data = registerSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await AuthService.register(data);

    setRefreshCookie(res, refreshToken);
    ApiResponse.created(res, "User registered successfully", { user, accessToken });
  }

  static async login(req: Request, res: Response): Promise<void> {
    const data = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await AuthService.login(data);

    setRefreshCookie(res, refreshToken);
    ApiResponse.ok(res, "Login successful", { user, accessToken });
  }

  static async logout(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const { jti, userId, exp } = req.user;

    await AuthService.logout({
      jti,
      userId,
      ...(exp !== undefined && { exp }),
    });

    // Also blocklist the refresh token if it exists in the cookie
    const refreshTokenCookie = req.cookies?.refreshToken as string | undefined;
    if (refreshTokenCookie) {
      try {
        const refreshDecoded = verifyRefreshToken(refreshTokenCookie);
        const refreshExpiresAt = refreshDecoded.exp
          ? new Date(refreshDecoded.exp * 1000)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await TokenBlocklist.create({
          jti: refreshDecoded.jti,
          userId: refreshDecoded.userId,
          expiresAt: refreshExpiresAt,
        });
      } catch {
        // Refresh token is already invalid — nothing to blocklist
      }
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: env.NODE_ENV === "production" ? "none" : "strict",
    });

    ApiResponse.ok(res, "Logged out successfully");
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    if (!refreshToken) throw ApiError.unauthorized("Refresh token is missing");

    const { accessToken, refreshToken: newRefreshToken } =
      await AuthService.refreshAccess(refreshToken);

    setRefreshCookie(res, newRefreshToken);
    ApiResponse.ok(res, "Access token refreshed successfully", { accessToken });
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    const data = forgotPasswordSchema.parse(req.body);
    const result = await AuthService.forgotPassword(data);

    ApiResponse.ok(res, result.message, { mockEmailContent: result.mockEmailContent });
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    const data = resetPasswordSchema.parse(req.body);
    const result = await AuthService.resetPassword(data);
    ApiResponse.ok(res, result.message);
  }

  // ── /auth/me ────
  // Returns the currently authenticated user's profile.
  // Used by bootstrapAuth on every page load to repopulate Zustand after refresh.
  static async me(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) throw ApiError.unauthorized("Authentication required");

    const user = await AuthService.getMe(userId);
    ApiResponse.ok(res, "User fetched successfully", user);
  }
}
