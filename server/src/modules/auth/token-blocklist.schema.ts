import mongoose, { Document, Schema } from "mongoose";

/**
 * TokenBlocklist — stores revoked JWT identifiers (jti claims).
 *
 * When a user logs out, we store their token's jti here. The auth middleware
 * checks this collection on every request. If the jti is found, the token is
 * rejected even if it hasn't expired yet.
 *
 * Why jti and not the full token?
 * - Storing the full token wastes space and is a security liability
 * - jti is a short UUID that uniquely identifies each token
 * - We only store access token jtis — refresh tokens are single-use by design
 *
 * TTL index: MongoDB automatically deletes documents after `expiresAt`.
 * This prevents the collection from growing forever. A revoked token that has
 * naturally expired is no longer a threat — no need to keep it.
 */

export interface ITokenBlocklist extends Document {
  jti: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

const tokenBlocklistSchema = new Schema<ITokenBlocklist>(
  {
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    // TTL index — MongoDB auto-deletes the document at this datetime.
    // Set this to the access token's expiry time so the blocklist self-cleans.
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// MongoDB TTL index — documents are automatically removed after expiresAt.
// The `expireAfterSeconds: 0` means "delete exactly at the expiresAt time".
tokenBlocklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TokenBlocklist = mongoose.model<ITokenBlocklist>(
  "TokenBlocklist",
  tokenBlocklistSchema,
);