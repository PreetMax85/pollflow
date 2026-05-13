import { z } from "zod";

// ─── Option ───────────────────────────────────────────────────────────────────

const optionSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Option text cannot be empty")
    .max(300, "Option text must be at most 300 characters"),
});

// ─── Question ─────────────────────────────────────────────────────────────────

const questionSchema = z.object({
  text: z
    .string()
    .trim()
    .min(3, "Question must be at least 3 characters")
    .max(500, "Question must be at most 500 characters"),

  isRequired: z.boolean().default(true),

  options: z
    .array(optionSchema)
    .min(2, "Each question must have at least 2 options")
    .max(10, "A question can have at most 10 options"),
});

// ─── Create Poll ──────────────────────────────────────────────────────────────

export const createPollSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be at most 200 characters"),

  description: z
    .string()
    .trim()
    .max(1000, "Description must be at most 1000 characters")
    .optional(),

  questions: z
    .array(questionSchema)
    .min(1, "A poll must have at least one question")
    .max(20, "A poll can have at most 20 questions"),

  requiresAuth: z.boolean().default(false),

  isAnonymous: z.boolean().default(false),

  // expiresAt: must be a future ISO date string, coerced to Date
  expiresAt: z
    .string()
    .datetime({ message: "expiresAt must be a valid ISO 8601 datetime string" })
    .refine((val) => new Date(val) > new Date(), {
      message: "Expiry date must be in the future",
    })
    .transform((val) => new Date(val)),
});

// ─── Update Poll ──────────────────────────────────────────────────────────────
// Only title, description, and expiresAt can be updated after creation.
// Questions cannot be edited once the poll has responses — this prevents
// invalidating existing response data. The service enforces this rule.

export const updatePollSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be at most 200 characters")
    .optional(),

  description: z
    .string()
    .trim()
    .max(1000, "Description must be at most 1000 characters")
    .optional(),

  expiresAt: z
    .string()
    .datetime({ message: "expiresAt must be a valid ISO 8601 datetime string" })
    .refine((val) => new Date(val) > new Date(), {
      message: "New expiry date must be in the future",
    })
    .transform((val) => new Date(val))
    .optional(),
});

// ─── Poll List Query ──────────────────────────────────────────────────────────

export const pollListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  status: z.enum(["active", "expired", "published"]).optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreatePollInput = z.infer<typeof createPollSchema>;
export type UpdatePollInput = z.infer<typeof updatePollSchema>;
export type PollListQuery = z.infer<typeof pollListQuerySchema>;
