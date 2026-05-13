/**
 *
 * Global authentication state managed by Zustand.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  SECURITY CONTRACT                                               │
 * │  Access tokens live ONLY in this in-memory store.               │
 * │  They are NEVER written to localStorage / sessionStorage.        │
 * │  The refresh token travels exclusively via httpOnly cookie —     │
 * │  it is never readable from JavaScript.                           │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { create } from "zustand";

// ─── Domain Types ─────────────────────────────────────────────────────────────

/** Shape returned by the backend on login / register / refresh. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface AuthState {
  /** JWT access token — in-memory only, never persisted. */
  accessToken: string | null;

  /** Authenticated user's public profile. */
  user: AuthUser | null;

  /** Derived flag for convenient guard checks. */
  isAuthenticated: boolean;
}

interface AuthActions {
  /**
   * Called after a successful login / register.
   * Stores both the user profile and the fresh access token.
   */
  setAuth: (user: AuthUser, accessToken: string) => void;

  /**
   * Called by the Axios refresh interceptor after a silent token rotation.
   * Only the token changes — user profile stays the same.
   */
  setAccessToken: (accessToken: string) => void;

  /**
   * Called on logout or when a refresh attempt fails (e.g. refresh token expired).
   * Wipes all auth state, forcing the user back to the login screen.
   */
  clearAuth: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  // ── Initial State ────────────────────────────────────────────────────────
  accessToken: null,
  user: null,
  isAuthenticated: false,

  // ── Actions ──────────────────────────────────────────────────────────────
  setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),

  setAccessToken: (accessToken) => set({ accessToken }),

  clearAuth: () => set({ accessToken: null, user: null, isAuthenticated: false }),
}));

// ─── Selector Helpers ─────────────────────────────────────────────────────────
// Use these in components to subscribe to only the slice you need,
// preventing unnecessary re-renders.

/** Returns the raw access token string (for the Axios interceptor). */
export const selectAccessToken = (s: AuthState & AuthActions) => s.accessToken;

/** Returns the current user object. */
export const selectUser = (s: AuthState & AuthActions) => s.user;

/** Returns the boolean guard flag. */
export const selectIsAuthenticated = (s: AuthState & AuthActions) => s.isAuthenticated;
