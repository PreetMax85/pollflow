import { createBrowserRouter, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore, selectIsAuthenticated } from "@/store/useAuthStore";

// Lazy Page Imports
// Code-split every page so the initial bundle stays small.
// Each import() becomes a separate chunk that Vite loads on demand.

import { lazy, Suspense } from "react";

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const CreatePollPage = lazy(() => import("@/pages/polls/CreatePollPage"));
const EditPollPage = lazy(() => import("@/pages/polls/EditPollPage"));
const AnalyticsPage = lazy(() => import("@/pages/polls/AnalyticsPage"));
const RespondPage = lazy(() => import("@/pages/respond/RespondPage"));
const PollResultsPage = lazy(() => import("@/pages/polls/PollResultsPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

//  Loading Fallback

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  </div>
);

//  Route Guards

/**
 * Wraps any route that requires the user to be logged in.
 * Stores the attempted URL in location state so we can redirect back after login.
 */
const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
};

/**
 * Wraps auth pages (login, register).
 * Redirects already-authenticated users to the dashboard so they don't
 * see the login form after they're signed in.
 */
const PublicOnlyRoute = () => {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

const AppLayout = lazy(() => import("@/components/layout/AppLayout"));

// Router

export const router = createBrowserRouter([
  // Public: auth pages
  {
    element: (
      <Suspense fallback={<PageLoader />}>
        <PublicOnlyRoute />
      </Suspense>
    ),
    children: [
      {
        path: "/auth/login",
        element: <LoginPage />,
      },
      {
        path: "/auth/register",
        element: <RegisterPage />,
      },
      {
        path: "/auth/forgot-password",
        element: <ForgotPasswordPage />,
      },
    ],
  },

  {
    path: "/reset-password",
    element: (
      <Suspense fallback={<PageLoader />}>
        <ResetPasswordPage />
      </Suspense>
    ),
  },

  // Public: poll response page
  {
    path: "/polls/:pollId/respond",
    element: (
      <Suspense fallback={<PageLoader />}>
        <RespondPage />
      </Suspense>
    ),
  },
  {
    path: "/polls/:pollId/results",
    element: (
      <Suspense fallback={<PageLoader />}>
        <PollResultsPage />
      </Suspense>
    ),
  },

  // Landing page
  {
    path: "/",
    element: (
      <Suspense fallback={<PageLoader />}>
        <LandingPage />
      </Suspense>
    ),
  },

  // Protected: authenticated pages wrapped in AppLayout 
  {
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProtectedRoute />
      </Suspense>
    ),
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: "/dashboard",
            element: <DashboardPage />,
          },
          {
            path: "/polls/create",
            element: <CreatePollPage />,
          },
          {
            path: "/polls/:pollId/edit",
            element: <EditPollPage />,
          },
          {
            path: "/polls/:pollId/analytics",
            element: <AnalyticsPage />,
          },
        ],
      },
    ],
  },

  // 404
  {
    path: "*",
    element: (
      <Suspense fallback={<PageLoader />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);
