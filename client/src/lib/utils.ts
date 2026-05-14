import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract an error message from an API error response.
 * Backend errors return `{ success: false, error: "..." }`,
 * while success responses use `{ success: true, message: "...", data: ... }`.
 * This checks both keys so it works regardless of response shape.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data) return fallback;
  return (data.error ?? data.message ?? fallback) as string;
}
