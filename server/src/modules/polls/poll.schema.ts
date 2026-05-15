import mongoose, { Document, Schema, Types } from "mongoose";

// Option
interface IOption {
  _id: Types.ObjectId;
  text: string;
  order: number;
}

const optionSchema = new Schema<IOption>(
  {
    text: {
      type: String,
      required: [true, "Option text is required"],
      trim: true,
      minlength: [1, "Option text cannot be empty"],
      maxlength: [300, "Option text must be at most 300 characters"],
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }, // each option gets its own ObjectId — needed to track which option was chosen in a response
);

// Question
interface IQuestion {
  _id: Types.ObjectId;
  text: string;
  isRequired: boolean;
  order: number;
  options: IOption[];
}

const questionSchema = new Schema<IQuestion>(
  {
    text: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
      minlength: [3, "Question must be at least 3 characters"],
      maxlength: [500, "Question must be at most 500 characters"],
    },
    isRequired: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    options: {
      type: [optionSchema],
      validate: {
        validator: (opts: IOption[]) => opts.length >= 2 && opts.length <= 10,
        message: "Each question must have between 2 and 10 options",
      },
    },
  },
  { _id: true },
);

// Poll
type PollStatus = "active" | "expired" | "published";

export interface IPoll extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  createdBy: Types.ObjectId;

  questions: IQuestion[];

  // Whether respondents must be logged in to answer.
  // false = anyone with the link can respond (anonymous allowed)
  // true  = only authenticated users can respond
  requiresAuth: boolean;

  // Whether responses store the respondent's identity.
  // Can be true even if requiresAuth is false — "I know who you are but
  // I'll anonymise your response in the analytics display"
  isAnonymous: boolean;

  status: PollStatus;
  expiresAt: Date;
  publishedAt?: Date;

  // Denormalised count — incremented atomically on each response submission
  // via $inc. This lets the real-time socket emit a count without running
  // an aggregation on every response.
  totalResponses: number;

  createdAt: Date;
  updatedAt: Date;
}

const pollSchema = new Schema<IPoll>(
  {
    title: {
      type: String,
      required: [true, "Poll title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [200, "Title must be at most 200 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description must be at most 1000 characters"],
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // powers "get my polls" query efficiently
    },

    questions: {
      type: [questionSchema],
      validate: {
        validator: (qs: IQuestion[]) => qs.length >= 1,
        message: "A poll must have at least one question",
      },
    },

    requiresAuth: {
      type: Boolean,
      default: false, // public by default — anyone can respond
    },

    isAnonymous: {
      type: Boolean,
      default: false, // responses are attributed by default
    },

    status: {
      type: String,
      enum: ["active", "expired", "published"],
      default: "active",
      index: true,
    },

    expiresAt: {
      type: Date,
      required: [true, "Expiry date is required"],
      index: true, // powers expiry checks and the cron/middleware sweep
      validate: {
        validator: (date: Date) => date > new Date(Date.now() - 5000),
        message: "Expiry date must be in the future",
      },
    },

    publishedAt: {
      type: Date,
    },

    totalResponses: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret["id"] = ret["_id"];
        delete ret["_id"];
        delete ret["__v"];
        return ret;
      },
    },
  },
);

// Indexes 

// Compound index: powers the "get my polls, sorted by newest" query
pollSchema.index({ createdBy: 1, createdAt: -1 });

// Compound index: powers the expiry sweep — find all active polls past their expiresAt
pollSchema.index({ status: 1, expiresAt: 1 });

// Pre-save middleware

// Auto-expire: if the poll's expiresAt has passed and status is still active,
// mark it expired before saving. This handles edge cases where the poll is
// fetched and re-saved without the service layer checking expiry explicitly.
pollSchema.pre("save", function () {
  if (this.status === "active" && this.expiresAt <= new Date()) {
    this.status = "expired";
  }
});

export const Poll = mongoose.model<IPoll>("Poll", pollSchema);
