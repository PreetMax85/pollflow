import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { AuthRepository } from "./auth.repository.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { TokenBlocklist } from "./token-blocklist.schema.js";
import { env } from "../../common/config/env.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyRefreshToken,
} from "../../common/utils/jwt.js";
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "./dtos/auth.dto.js";

export class AuthService {
  static async register(data: RegisterInput) {
    const existingUser = await AuthRepository.findByEmail(data.email);
    if (existingUser) {
      throw ApiError.conflict("A user with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password, env.BCRYPT_SALT_ROUNDS);

    const newUser = await AuthRepository.createUser(data, hashedPassword);

    const accessToken = generateAccessToken({ userId: newUser.id });
    const refreshToken = generateRefreshToken({ userId: newUser.id });

    return { user: newUser, accessToken, refreshToken };
  }

  static async login(data: LoginInput) {
    const user = await AuthRepository.findByEmail(data.email);

    // Same error message for both "user not found" and "wrong password" —
    // prevents user enumeration attacks (attacker can't tell which one failed)
    if (!user) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    const userId = user._id.toString();
    const accessToken = generateAccessToken({ userId });
    const refreshToken = generateRefreshToken({ userId });

    // Explicitly strip sensitive fields before returning user data
    const safeUser = { id: userId, name: user.name, email: user.email };

    return { user: safeUser, accessToken, refreshToken };
  }

  static async refreshAccess(token: string) {
    // 1. Verify the refresh token (throws ApiError if expired/invalid)
    const decoded = verifyRefreshToken(token);

    // 2. Replay detection — if this jti is already blocklisted, the token
    //    was already rotated (someone else used it first). Reject immediately.
    const isReplayed = await TokenBlocklist.exists({ jti: decoded.jti });
    if (isReplayed) {
      throw ApiError.unauthorized("Refresh token has been revoked");
    }

    // 3. Ensure user still exists in the database
    const user = await AuthRepository.findById(decoded.userId);
    if (!user) {
      throw ApiError.unauthorized("User no longer exists");
    }

    // 3. Blocklist the OLD refresh token's jti so it can only be used once
    const oldExp = decoded.exp;
    const expiresAt = oldExp
      ? new Date(oldExp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await TokenBlocklist.create({ jti: decoded.jti, userId: decoded.userId, expiresAt });

    // 4. Token rotation: issue both new tokens
    const newAccessToken = generateAccessToken({ userId: user.id });
    const newRefreshToken = generateRefreshToken({ userId: user.id });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  static async forgotPassword(data: ForgotPasswordInput) {
    const user = await AuthRepository.findByEmail(data.email);

    if (!user) {
      const { rawToken } = generateResetToken();
      return {
        message: "If an account with that email exists, a password reset link has been sent.",
        mockEmailContent: `Click here to reset: ${env.CLIENT_URL}/reset?token=${rawToken}`,
      };
    }

    const { rawToken, hashedToken, resetTokenExpiresAt } = generateResetToken();

    await AuthRepository.updateResetToken(user._id.toString(), hashedToken, resetTokenExpiresAt);

    return {
      message: "If an account with that email exists, a password reset link has been sent.",
      mockEmailContent: `Click here to reset: ${env.CLIENT_URL}/reset?token=${rawToken}`,
    };
  }

  static async resetPassword(data: ResetPasswordInput) {
    const hashedToken = crypto.createHash("sha256").update(data.token).digest("hex");

    const user = await AuthRepository.findByResetToken(hashedToken);
    if (!user) {
      throw ApiError.badRequest("Invalid or expired password reset token");
    }

    const newHashedPassword = await bcrypt.hash(data.newPassword, env.BCRYPT_SALT_ROUNDS);

    await AuthRepository.updatePasswordAndClearToken(user._id.toString(), newHashedPassword);

    return { message: "Password has been successfully reset. You can now log in." };
  }

  static async logout({
    jti,
    userId,
    exp,
  }: {
    jti: string;
    userId: string;
    exp?: number;
  }): Promise<void> {
    // Blocklist the access token's jti so it can't be reused after logout
    // TTL is set to the token's natural expiry — DB self-cleans after that
    const expiresAt = exp ? new Date(exp * 1000) : new Date(Date.now() + 15 * 60 * 1000); // fallback: 15m

    await TokenBlocklist.create({ jti, userId, expiresAt });
  }

  static async getMe(userId: string): Promise<{ id: string; name: string; email: string }> {
    const user = await AuthRepository.findById(userId);
    if (!user) throw ApiError.notFound("User not found");
    return user;
  }
}
