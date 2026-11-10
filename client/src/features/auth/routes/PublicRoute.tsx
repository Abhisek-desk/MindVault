import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../../stores/auth.store";
import PageMetadata from "../../../components/common/PageMetadata";

function PublicRoute() {
  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated
  );

  const isLoading = useAuthStore(
    (state) => state.isLoading
  );

  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F1E5]">
        <div className="w-10 h-10 border-4 border-[#F47768] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const isLoginPage = location.pathname === "/login";

  return (
    <>
      <PageMetadata
        title={
          isLoginPage
            ? "Sign In - Mind Vault"
            : "Create Account - Mind Vault"
        }
        description={
          isLoginPage
            ? "Sign in to access your personal Mind Vault."
            : "Create your Mind Vault account and start building your personal knowledge library."
        }
      />

      <Outlet />
    </>
  );
}

export default PublicRoute;