import { z } from "zod";

// Submit Response

const answerSchema = z.object({
  // We receive these as strings from the client
  // and validate they look like valid MongoDB ObjectIds before touching the DB.
  questionId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid question ID format"),

  optionId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid option ID format"),
});

export const submitResponseSchema = z.object({
  answers: z
    .array(answerSchema)
    .min(1, "At least one answer is required")
    .refine(
      (answers) => {
        const ids = answers.map((a) => a.questionId);
        return new Set(ids).size === ids.length;
      },
      "Duplicate answers for the same question are not allowed",
    ),
});

export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;
