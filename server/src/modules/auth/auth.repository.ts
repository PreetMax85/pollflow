import { User, IUser } from "./user.schema.js";
import { RegisterInput } from "./dtos/auth.dto.js";

/**
 * AuthRepository — all Mongoose calls for the auth module.
 *
 * Rule: zero business logic here. No throwing ApiErrors, no bcrypt, no tokens.
 * This layer only speaks to MongoDB. The service layer decides what to do with
 * what comes back. This separation means if we ever swap Mongoose for another
 * ORM, only this file changes.
 */
export class AuthRepository {
  /**
   * Returns the full user document including the hashed password.
   * ONLY used by login — the password hash is needed for bcrypt.compare().
   * Never return this object directly to the client.
   */
  static async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email }).lean();
  }

  /**
   * Returns a minimal safe user object — id, name, email only.
   * Used by refreshAccess to verify the user still exists.
   * Explicitly excludes password with .select("-password").
   */
  static async findById(id: string): Promise<{ id: string; name: string; email: string } | null> {
    const user = await User.findById(id)
      .select("-password -resetToken -resetTokenExpiresAt")
      .lean();
    if (!user) return null;
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };
  }

  /**
   * Finds a user by their hashed reset token where the token hasn't expired.
   * The expiry check happens at the DB query level — no need to re-check in service.
   */
  static async findByResetToken(hashedToken: string): Promise<IUser | null> {
    return User.findOne({
      resetToken: hashedToken,
      resetTokenExpiresAt: { $gt: new Date() }, // token must not be expired
    })
      .select("-password")
      .lean();
  }

  /**
   * Creates a new user. Returns only safe fields — no password hash in response.
   */
  static async createUser(
    data: RegisterInput,
    hashedPassword: string,
  ): Promise<{ id: string; name: string; email: string }> {
    const user = await User.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
    });

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };
  }

  /**
   * Stores a hashed reset token + expiry on the user document.
   * Raw token is emailed to the user — we never store raw tokens.
   */
  static async updateResetToken(
    userId: string,
    hashedToken: string,
    expiresAt: Date,
  ): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $set: {
        resetToken: hashedToken,
        resetTokenExpiresAt: expiresAt,
      },
    });
  }

  /**
   * Updates the user's password and atomically clears the reset token fields
   * so the same token can never be used twice.
   */
  static async updatePasswordAndClearToken(
    userId: string,
    newHashedPassword: string,
  ): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $set: { password: newHashedPassword },
      $unset: { resetToken: "", resetTokenExpiresAt: "" },
    });
  }
}
