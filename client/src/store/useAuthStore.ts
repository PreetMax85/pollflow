import { create } from "zustand";

// Domain Types

/** Shape returned by the backend on login / register / refresh. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

// Store Shape

interface AuthState {
  /** JWT access token — in-memory only, never persisted. */
  accessToken: string | null;

  /** Authenticated user's public profile. */
  user: AuthUser | null;

  /** Derived flag for convenient guard checks. */
  isAuthenticated: boolean;
}

interface AuthActions {
  setAuth: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  clearAuth: () => void;
}

// Store

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,

  // Actions
  setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),

  setAccessToken: (accessToken) => set({ accessToken }),

  clearAuth: () => set({ accessToken: null, user: null, isAuthenticated: false }),
}));

/** Returns the raw access token string (for the Axios interceptor). */

/** Returns the current user object. */
export const selectUser = (s: AuthState & AuthActions) => s.user;

/** Returns the boolean guard flag. */
export const selectIsAuthenticated = (s: AuthState & AuthActions) => s.isAuthenticated;
