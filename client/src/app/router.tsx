import {
  createBrowserRouter,
  Navigate
} from "react-router-dom";

import NotFound from "../components/common/NotFound";

import LoginPage from "../features/auth/pages/LoginPage";
import RegisterPage from "../features/auth/pages/RegisterPage";

import ProtectedRoute from "../features/auth/routes/ProtectedRoute";
import PublicRoute from "../features/auth/routes/PublicRoute";

import DashboardPage from "../features/dashboard/pages/DashboardPage";

const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      {
        path: "/login",
        element: <LoginPage />
      },
      {
        path: "/register",
        element: <RegisterPage />
      }
    ]
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/dashboard",
        element: <DashboardPage />
      }
    ]
  },
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />
  },
  {
    path: "*",
    element: <NotFound />
  }
]);

export default router;