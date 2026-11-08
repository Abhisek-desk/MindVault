import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
} from "react-router-dom";

import NotFound from "../components/common/NotFound";

import ProtectedRoute from "../features/auth/routes/ProtectedRoute";
import PublicRoute from "../features/auth/routes/PublicRoute";

// =====================================
// LAZY-LOADED PAGES
// =====================================

const LoginPage = lazy(
  () => import("../features/auth/pages/LoginPage")
);

const RegisterPage = lazy(
  () => import("../features/auth/pages/RegisterPage")
);

const DashboardPage = lazy(
  () => import("../features/dashboard/pages/DashboardPage")
);

const NotesPage = lazy(
  () => import("../features/notes/pages/NotesPage")
);

const FoldersPage = lazy(
  () => import("../features/library/pages/FoldersPage")
);

const LibraryPage = lazy(
  () => import("../features/library/pages/LibraryPage")
);

const PackReaderPage = lazy(
  () => import("../features/library/pages/PackReaderPage")
);

const SearchPage = lazy(
  () => import("../features/search/pages/SearchPage")
);

const ConflictsPage = lazy(
  () => import("../features/sync/pages/ConflictsPage")
);

// =====================================
// LOADING FALLBACK
// =====================================

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F1E5]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#17243D]/20 border-t-[#F47768]" />

        <p className="text-sm font-medium text-[#17243D]">
          Loading Mind Vault...
        </p>
      </div>
    </div>
  );
}

// =====================================
// ROUTE WRAPPER
// =====================================

function loadPage(element: React.ReactNode) {
  return (
    <Suspense fallback={<PageLoader />}>
      {element}
    </Suspense>
  );
}

// =====================================
// APPLICATION ROUTER
// =====================================

const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      {
        path: "/login",
        element: loadPage(<LoginPage />),
      },
      {
        path: "/register",
        element: loadPage(<RegisterPage />),
      },
    ],
  },

  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/dashboard",
        element: loadPage(<DashboardPage />),
      },
      {
        path: "/notes",
        element: loadPage(<NotesPage />),
      },
      {
        path: "/folders",
        element: loadPage(<FoldersPage />),
      },
      {
        path: "/library",
        element: loadPage(<LibraryPage />),
      },
      {
        path: "/library/read/:packId",
        element: loadPage(<PackReaderPage />),
      },
      {
        path: "/search",
        element: loadPage(<SearchPage />),
      },
      {
        path: "/conflicts",
        element: loadPage(<ConflictsPage />),
      },
    ],
  },

  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },

  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;