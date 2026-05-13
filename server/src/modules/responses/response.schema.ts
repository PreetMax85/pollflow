import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * IAnswer — a single question's answer within a response.
 *
 * Stores both IDs explicitly so analytics aggregations can group by
 * questionId and optionId without joining to the poll document.
 * This is a deliberate denormalisation for aggregation performance.
 */
export interface IAnswer {
  questionId: Types.ObjectId;
  optionId: Types.ObjectId;
}

const answerSchema = new Schema<IAnswer>(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    optionId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  { _id: false }, // answers are value objects, not entities — no independent ID needed
);

/**
 * IResponse — a single poll submission.
 *
 * respondentId is optional:
 * - Set when an authenticated user submits (even on anonymous polls,
 *   we store it server-side for duplicate prevention — it is just
 *   excluded from the analytics display if isAnonymous is true)
 * - Undefined when a guest submits to a poll that allows anonymous responses
 *
 * ipAddress is stored for anonymous duplicate mitigation (best-effort,
 * not a hard guarantee — proxies can share IPs). Never exposed via API.
 */
export interface IResponse extends Document {
  _id: Types.ObjectId;
  pollId: Types.ObjectId;
  respondentId?: Types.ObjectId;
  answers: IAnswer[];
  isAnonymous: boolean;
  ipAddress?: string;
  ipHash?: string;
  submittedAt: Date;
  createdAt: Date;
}

const responseSchema = new Schema<IResponse>(
  {
    pollId: {
      type: Schema.Types.ObjectId,
      ref: "Poll",
      required: true,
      index: true, // all analytics queries filter by pollId first
    },

    respondentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      // sparse: only index documents where respondentId exists.
      // Guest submissions don't have one — a non-sparse index would
      // index all those null values wastefully.
      index: { sparse: true },
    },

    answers: {
      type: [answerSchema],
      required: true,
      validate: {
        validator: (ans: IAnswer[]) => ans.length >= 1,
        message: "A response must include at least one answer",
      },
    },

    // Mirrors the poll's isAnonymous setting at submission time.
    // Stored here so analytics can filter correctly even if the poll
    // setting is changed later (though we prevent that in the service).
    isAnonymous: {
      type: Boolean,
      required: true,
      default: false,
    },

    // Stored for anonymous rate-limiting. Never returned in API responses.
    // select: false means it's excluded from all queries unless explicitly requested.
    ipAddress: {
      type: String,
      select: false,
    },

    // SHA-256 hash of the respondent's IP address.
    // Used for anonymous duplicate prevention — checked before saving, enforced
    // at DB level via the unique sparse index below.
    // Only set for anonymous (non-authenticated) submissions.
    ipHash: {
      type: String,
    },

    submittedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret["id"] = ret["_id"];
        delete ret["_id"];
        delete ret["__v"];
        delete ret["ipAddress"]; // never expose IP in responses
        return ret;
      },
    },
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Unique compound: one authenticated response per user per poll.
// sparse: true means the index skips documents where respondentId is absent
// (anonymous submissions) — preventing false uniqueness conflicts.
responseSchema.index(
  { pollId: 1, respondentId: 1 },
  {
    unique: true,
    sparse: true,
    name: "unique_authenticated_response",
  },
);

// Unique sparse: one anonymous response per IP per poll.
// sparse: true means the index skips documents where ipHash is absent
// (authenticated submissions) — preventing false uniqueness conflicts
// with the userId-based index above.
responseSchema.index(
  { pollId: 1, ipHash: 1 },
  {
    unique: true,
    sparse: true,
    name: "unique_anonymous_response",
  },
);

// Analytics index: all aggregation pipelines start with pollId + submittedAt
responseSchema.index({ pollId: 1, submittedAt: -1 });

export const Response = mongoose.model<IResponse>("Response", responseSchema);