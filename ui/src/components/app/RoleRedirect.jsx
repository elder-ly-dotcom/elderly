import { Navigate } from "react-router-dom";

import { useAuthStore } from "../../store/authStore";

const roleMap = {
  CUSTOMER: "/customer/dashboard",
  WORKER: "/worker/dashboard",
  ADMIN: "/admin/dashboard",
};

export default function RoleRedirect() {
  const { token, role } = useAuthStore();

  if (!token || !role) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={roleMap[role] ?? "/"} replace />;
}
