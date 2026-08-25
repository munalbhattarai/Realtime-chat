import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "../../hooks/useAuth";

const ProtectedRoute = () => {
  const location = useLocation();
  const { isAuthenticated, user, isLoading } = useSelector(
    (state) => state.auth,
  );
  const { fetchCurrentUser } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !user && !isLoading) {
      fetchCurrentUser();
    }
  }, [isAuthenticated, user, isLoading, fetchCurrentUser]);

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-900 text-zinc-400">
        <p className="text-sm">Loading user session...</p>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;