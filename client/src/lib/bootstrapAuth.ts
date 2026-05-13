import axios from "axios";
import { useAuthStore } from "@/store/useAuthStore";

const BASE_URL = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api/v1`;

interface RefreshResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
  };
}

/**
 * Attempt to silently restore the authenticated session.
 * Errors are swallowed intentionally — an expired or missing cookie
 * simply means the user is unauthenticated, which is a valid state.
 */
export const bootstrapAuth = async (): Promise<void> => {
  try {
    const { data } = await axios.post<RefreshResponse>(
      `${BASE_URL}/auth/refresh`,
      {},
      {
        withCredentials: true,
        validateStatus: (status) => status < 500,
      },
    );

    if (data.success && data.data.accessToken) {
      /**
       * We only have an access token here — not the user profile.
       * We need one more call to /auth/me (or decode the JWT) to hydrate the user.
       * Using /auth/me keeps this clean and avoids client-side JWT decoding.
       */
      useAuthStore.getState().setAccessToken(data.data.accessToken);

      // Fetch and store the user profile with the fresh token
      const profileResponse = await axios.get<{
        success: boolean;
        data: { id: string; name: string; email: string };
      }>(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${data.data.accessToken}` },
        withCredentials: true,
      });

      if (profileResponse.data.success) {
        useAuthStore.getState().setAuth(
          profileResponse.data.data,
          data.data.accessToken,
        );
      } else {
        // /auth/me returned success:false — wipe the orphaned token
        useAuthStore.getState().clearAuth();
      }
    }
  } catch {
    // Refresh failed (cookie expired or missing) — user stays unauthenticated.
    // ProtectedRoute will redirect them to /auth/login when they hit a guarded page.
    useAuthStore.getState().clearAuth();
  }
};