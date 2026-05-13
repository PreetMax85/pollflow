/**
*
 * Configured Axios instance for all API communication.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  INTERCEPTOR FLOW                                                        │
 * │                                                                          │
 * │  REQUEST  → attach Bearer token from Zustand store                       │
 * │  RESPONSE → on 401: silently call /auth/refresh (cookie-based)          │
 * │              → store new access token in Zustand                         │
 * │              → replay the original failed request                        │
 * │              → if refresh itself fails → clearAuth() → reject            │
 * │                                                                          │
 * │  Queue pattern prevents a thundering-herd of parallel refresh calls      │
 * │  when multiple requests 401 simultaneously.                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "@/store/useAuthStore";

// ─── Base Configuration ───────────────────────────────────────────────────────

const BASE_URL = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api/v1`;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  /**
   * CRITICAL: withCredentials must be true so the browser sends the
   * httpOnly refresh-token cookie on every request (including /refresh).
   */
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Shape the backend returns from POST /api/v1/auth/refresh.
 * ApiResponse.ok wraps the payload: { success, message, data: { accessToken } }
 */
interface RefreshTokenResponse {
  success: boolean;
  message: string;
  data: { accessToken: string };
}

/**
 * Extended config that carries a retry flag so we never refresh-loop
 * (i.e. if the /refresh call itself 401s, we don't try to refresh again).
 */
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/** A pending promise resolver/rejector waiting on an in-flight refresh. */
interface FailedQueueEntry {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

// ─── Refresh Queue State ──────────────────────────────────────────────────────

/**
 * Lock flag: true while a /refresh call is in-flight.
 * Subsequent 401s enqueue themselves instead of firing parallel refreshes.
 */
let isRefreshing = false;

/**
 * Queue of requests that 401'd while a refresh was already in progress.
 * Once the refresh resolves they are replayed; on failure they are rejected.
 */
let failedQueue: FailedQueueEntry[] = [];

/**
 * Drain the queue.
 * @param error  - Pass the refresh error to reject all queued callers.
 * @param token  - Pass the new access token to resolve all queued callers.
 */
const processQueue = (error: unknown, token: string | null): void => {
  failedQueue.forEach((entry) => {
    if (error !== null) {
      entry.reject(error);
    } else {
      // token is guaranteed non-null when error is null
      entry.resolve(token as string);
    }
  });
  failedQueue = [];
};

// ─── Request Interceptor ──────────────────────────────────────────────────────

/**
 * Attach the in-memory access token to every outgoing request.
 * Reading directly from getState() avoids subscribing the module to the store.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ─── Response Interceptor ─────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  // 2xx — pass through unchanged
  (response: AxiosResponse) => response,

  // Non-2xx — handle 401 with silent refresh, propagate everything else
  async (error: AxiosError): Promise<AxiosResponse> => {
    const originalRequest = error.config as RetryableRequestConfig;

    // Only intercept 401s that haven't already been retried.
    // The `_retry` guard prevents infinite loops if /refresh itself 401s.
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // ── A refresh is already in flight ─────────────────────────────────────
    if (isRefreshing) {
      // Enqueue this request; it will be replayed once the refresh settles.
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      });
    }

    // ── First 401 — kick off the refresh ───────────────────────────────────
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      /**
       * Use a plain axios instance (NOT apiClient) to avoid triggering
       * this same interceptor recursively. withCredentials sends the
       * httpOnly refresh cookie automatically.
       */
      const { data } = await axios.post<RefreshTokenResponse>(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      // ApiResponse envelope: response body → { success, message, data: { accessToken } }
      const { accessToken } = data.data;

      // Persist the new token in the Zustand store (memory only)
      useAuthStore.getState().setAccessToken(accessToken);

      // Replay all queued requests with the fresh token
      processQueue(null, accessToken);

      // Replay the original failed request
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh failed (e.g. refresh token expired) — log the user out
      processQueue(refreshError, null);
      useAuthStore.getState().clearAuth();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);