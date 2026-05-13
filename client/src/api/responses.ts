import { apiClient } from "@/api/axios";
import type { ApiResponse } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Answer {
  questionId: string;
  optionId: string;
}

export interface SubmitResponseInput {
  answers: Answer[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const responsesApi = {
  /** POST /api/v1/polls/:pollId/respond */
  submit: (pollId: string, data: SubmitResponseInput) =>
    apiClient
      .post<ApiResponse<null>>(`/polls/${pollId}/respond`, data)
      .then((r) => r.data),
};

/**
 * Named export matching RespondPage's existing import.
 * submitResponse(pollId, { answers }) → calls responsesApi.submit
 */
export const submitResponse = (
  pollId: string,
  data: SubmitResponseInput,
): ReturnType<typeof responsesApi.submit> => responsesApi.submit(pollId, data);