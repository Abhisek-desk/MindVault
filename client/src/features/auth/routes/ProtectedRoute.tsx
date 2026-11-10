import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../../stores/auth.store";
import PageMetadata from "../../../components/common/PageMetadata";

function ProtectedRoute() {
  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated
  );

  const isLoading = useAuthStore(
    (state) => state.isLoading
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F1E5]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#F47768] border-t-transparent rounded-full animate-spin mx-auto" />

          <p className="mt-4 text-[#17243D] font-medium">
            Loading Mind Vault...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <PageMetadata
        title="My Workspace - Mind Vault"
        description="Your personal Mind Vault knowledge workspace."
      />

      <Outlet />
    </>
  );
}

export default ProtectedRoute;