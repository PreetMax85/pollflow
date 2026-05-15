import axios from "axios";
import { apiClient } from "@/api/axios";
import type { ApiResponse, Poll, CreatePollInput, FullAnalytics, PublishedResults } from "@/types";

const BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api/v1`;

interface MyPollsData {
  polls: Poll[];
}

// Poll API

export const pollsApi = {
  /** Private — GET /api/v1/polls/my */
  getMyPolls: () => apiClient.get<ApiResponse<MyPollsData>>("/polls/my").then((r) => r.data),

  /**
   * PUBLIC — GET /api/v1/polls/:pollId
   * Uses plain axios so anonymous users (RespondPage) don't trigger refresh loop.
   * withCredentials still sent so optionalAuth middleware can read token if present.
   */
  getById: (pollId: string) =>
    axios
      .get<ApiResponse<Poll>>(`${BASE}/polls/${pollId}`, { withCredentials: true })
      .then((r) => r.data),

  /** Private — POST /api/v1/polls */
  create: (data: CreatePollInput) =>
    apiClient.post<ApiResponse<Poll>>("/polls", data).then((r) => r.data),

  /** Private — PATCH /api/v1/polls/:pollId */
  update: (pollId: string, data: Partial<CreatePollInput>) =>
    apiClient.patch<ApiResponse<Poll>>(`/polls/${pollId}`, data).then((r) => r.data),

  /** Private — DELETE /api/v1/polls/:pollId */
  delete: (pollId: string) =>
    apiClient.delete<ApiResponse<null>>(`/polls/${pollId}`).then((r) => r.data),

  /** Private — POST /api/v1/polls/:pollId/duplicate */
  duplicate: (pollId: string) =>
    apiClient.post<ApiResponse<Poll>>(`/polls/${pollId}/duplicate`).then((r) => r.data),

  /** Private — POST /api/v1/polls/:pollId/close */
  close: (pollId: string) =>
    apiClient.post<ApiResponse<Poll>>(`/polls/${pollId}/close`).then((r) => r.data),

  /** Private — POST /api/v1/polls/:pollId/publish */
  publish: (pollId: string) =>
    apiClient.post<ApiResponse<Poll>>(`/polls/${pollId}/publish`).then((r) => r.data),
};

// Analytics API

export const analyticsApi = {
  /** Private — GET /api/v1/analytics/:pollId (creator dashboard) */
  getAnalytics: (pollId: string) =>
    apiClient.get<ApiResponse<FullAnalytics>>(`/analytics/${pollId}`).then((r) => r.data),

  /**
   * PUBLIC — GET /api/v1/analytics/:pollId/results
   * Plain axios — no auth interceptor.
   */
  getPublishedResults: (pollId: string) =>
    axios
      .get<ApiResponse<PublishedResults>>(`${BASE}/analytics/${pollId}/results`, {
        withCredentials: true,
      })
      .then((r) => r.data),
};
