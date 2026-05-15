import mongoose, { Document, Schema } from "mongoose";

interface ITokenBlocklist extends Document {
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
tokenBlocklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TokenBlocklist = mongoose.model<ITokenBlocklist>(
  "TokenBlocklist",
  tokenBlocklistSchema,
);
