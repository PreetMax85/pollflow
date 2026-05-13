/**
 * Boot sequence: bootstrapAuth → render.
 * ErrorBoundary catches lazy-import failures (cold Vite server, network blip).
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { router } from "@/router";
import { bootstrapAuth } from "@/lib/bootstrapAuth";
import "./index.css";

// ─── Query Client ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if ((error as { response?: { status: number } })?.response?.status === 401) return false;
        return failureCount < 2;
      },
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});

// ─── Error Fallback ───────────────────────────────────────────────────────────
// Catches lazy-import failures (cold dev server, Vercel deploy race).

function AppErrorFallback() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 text-center px-4">
      <p className="text-lg font-semibold">Something went wrong</p>
      <p className="text-sm text-muted-foreground">
        The page failed to load.{" "}
        <a href="/" className="underline underline-offset-4 hover:text-foreground">
          Reload
        </a>
      </p>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("[main] #root element not found");

const root = createRoot(rootElement);

bootstrapAuth().finally(() => {
  root.render(
    <StrictMode>
      <ErrorBoundary FallbackComponent={AppErrorFallback}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <RouterProvider router={router} />
            <Toaster position="top-right" richColors closeButton />
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
});
