import { apiClient } from "@/api/axios";
import type { ApiResponse, AuthResponseData } from "@/types";

// ─── Request Shapes ───────────────────────────────────────────────────────────

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export const authApi = {
  login: (data: LoginInput) =>
    apiClient.post<ApiResponse<AuthResponseData>>("/auth/login", data).then((res) => res.data),

  register: (data: RegisterInput) =>
    apiClient.post<ApiResponse<AuthResponseData>>("/auth/register", data).then((res) => res.data),

  logout: () => apiClient.post("/auth/logout").then((res) => res.data),

  forgotPassword: (email: string) =>
    apiClient
      .post<ApiResponse<{ mockEmailContent?: string }>>("/auth/forgot-password", { email })
      .then((res) => res.data),

  resetPassword: (token: string, newPassword: string) =>
    apiClient
      .post<ApiResponse<{ message: string }>>("/auth/reset-password", { token, newPassword })
      .then((res) => res.data),
};
