import { Navigate, Outlet } from "react-router-dom";

import { useAuthStore } from "../../store/authStore";

export default function ProtectedRoute({ allowedRoles }) {
  const { token, role } = useAuthStore();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
