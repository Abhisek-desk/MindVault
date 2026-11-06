import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../../stores/auth.store";

function PublicRoute() {
  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated
  );

  const isLoading = useAuthStore(
    (state) => state.isLoading
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F1E5]">
        <div className="w-10 h-10 border-4 border-[#F47768] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated
    ? <Navigate to="/dashboard" replace />
    : <Outlet />;
}

export default PublicRoute;