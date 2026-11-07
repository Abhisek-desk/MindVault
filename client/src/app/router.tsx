import { createBrowserRouter, Navigate } from "react-router-dom";

import NotFound from "../components/common/NotFound";

import LoginPage from "../features/auth/pages/LoginPage";
import RegisterPage from "../features/auth/pages/RegisterPage";

import ProtectedRoute from "../features/auth/routes/ProtectedRoute";
import PublicRoute from "../features/auth/routes/PublicRoute";

import DashboardPage from "../features/dashboard/pages/DashboardPage";
import NotesPage from "../features/notes/pages/NotesPage";
import FoldersPage from "../features/library/pages/FoldersPage";
import LibraryPage from "../features/library/pages/LibraryPage";
import PackReaderPage from "../features/library/pages/PackReaderPage";
import SearchPage from "../features/search/pages/SearchPage";
import ConflictsPage from "../features/sync/pages/ConflictsPage";

const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/register",
        element: <RegisterPage />,
      },
    ],
  },

  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/dashboard",
        element: <DashboardPage />,
      },
      {
        path: "/notes",
        element: <NotesPage />,
      },
      {
        path: "/folders",
        element: <FoldersPage />,
      },
      {
        path: "/library",
        element: <LibraryPage />,
      },
      {
        path: "/library/read/:packId",
        element: <PackReaderPage />,
      },
      {
        path: "/search",
        element: <SearchPage />,
      },
      {
        path: "/conflicts",
        element: <ConflictsPage />,
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
