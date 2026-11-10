import { createBrowserRouter } from "react-router-dom";

import NotFound from "../components/common/NotFound";

import ProtectedRoute from "../features/auth/routes/ProtectedRoute";
import PublicRoute from "../features/auth/routes/PublicRoute";
import LandingPage from '../features/landing/pages/LandingPage'

import {
  LoginPage,
  RegisterPage,
  DashboardPage,
  NotesPage,
  FoldersPage,
  LibraryPage,
  PackReaderPage,
  SearchPage,
  ConflictsPage,
  RoutePage,
} from "./route-pages";

// =====================================
// APPLICATION ROUTER
// =====================================

const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      {
        path: "/login",
        element: (
          <RoutePage>
            <LoginPage />
          </RoutePage>
        ),
      },
      {
        path: "/register",
        element: (
          <RoutePage>
            <RegisterPage />
          </RoutePage>
        ),
      },
    ],
  },

  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/dashboard",
        element: (
          <RoutePage>
            <DashboardPage />
          </RoutePage>
        ),
      },
      {
        path: "/notes",
        element: (
          <RoutePage>
            <NotesPage />
          </RoutePage>
        ),
      },
      {
        path: "/folders",
        element: (
          <RoutePage>
            <FoldersPage />
          </RoutePage>
        ),
      },
      {
        path: "/library",
        element: (
          <RoutePage>
            <LibraryPage />
          </RoutePage>
        ),
      },
      {
        path: "/library/read/:packId",
        element: (
          <RoutePage>
            <PackReaderPage />
          </RoutePage>
        ),
      },
      {
        path: "/search",
        element: (
          <RoutePage>
            <SearchPage />
          </RoutePage>
        ),
      },
      {
        path: "/conflicts",
        element: (
          <RoutePage>
            <ConflictsPage />
          </RoutePage>
        ),
      },
    ],
  },

  {
    path: "/",
    element: (
      <RoutePage>
        <LandingPage />
      </RoutePage>
    ),
  },

  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
