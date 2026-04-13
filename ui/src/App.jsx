import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

import PortalLayout from "./components/app/PortalLayout";
import ProtectedRoute from "./components/app/ProtectedRoute";
import RoleRedirect from "./components/app/RoleRedirect";
import LandingPage from "./pages/LandingPage";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import ElderManagement from "./pages/customer/ElderManagement";
import SubscriptionsPage from "./pages/customer/Subscriptions";
import CelebrationsPage from "./pages/customer/Celebrations";
import VisitBookings from "./pages/customer/VisitBookings";
import WorkerDashboard from "./pages/worker/WorkerDashboard";
import TaskReportingHub from "./pages/worker/TaskReportingHub";
import UpcomingVisits from "./pages/worker/UpcomingVisits";
import VisitReport from "./pages/worker/VisitReport";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ActiveWorkers from "./pages/admin/ActiveWorkers";
import WorkerVerification from "./pages/admin/WorkerVerification";
import EmergencyHub from "./pages/admin/EmergencyHub";
import UserManagement from "./pages/admin/UserManagement";
import WorkerTracker from "./pages/admin/WorkerTracker";
import VisitRequests from "./pages/admin/VisitRequests";
import { useAuthStore } from "./store/authStore";
import { requestNotificationSetup } from "./utils/notifications";
import apiClient from "./lib/apiClient";

export default function App() {
  const { token, hydrateUser, touchActivity, enforceInactivityTimeout } = useAuthStore();

  useEffect(() => {
    if (!token) return;
    apiClient.get("/auth/me").then((response) => hydrateUser(response.data));
    requestNotificationSetup().catch(() => {});
  }, [token, hydrateUser]);

  useEffect(() => {
    enforceInactivityTimeout();
    if (!token) return undefined;

    const markActive = () => touchActivity();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        enforceInactivityTimeout();
        touchActivity(true);
      }
    };

    window.addEventListener("pointerdown", markActive, { passive: true });
    window.addEventListener("keydown", markActive);
    window.addEventListener("touchstart", markActive, { passive: true });
    window.addEventListener("focus", markActive);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const intervalId = window.setInterval(() => {
      enforceInactivityTimeout();
    }, 60 * 60 * 1000);

    return () => {
      window.removeEventListener("pointerdown", markActive);
      window.removeEventListener("keydown", markActive);
      window.removeEventListener("touchstart", markActive);
      window.removeEventListener("focus", markActive);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [token, touchActivity, enforceInactivityTimeout]);

  return (
    <>
      <Toaster richColors position="top-right" />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<RoleRedirect />} />

        <Route element={<ProtectedRoute allowedRoles={["CUSTOMER"]} />}>
          <Route
            path="/customer"
            element={
              <PortalLayout
                title="Customer Portal"
                navClassName="bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                links={[
                  { to: "/customer/dashboard", label: "Dashboard" },
                  { to: "/customer/elders", label: "Profile" },
                  { to: "/customer/subscriptions", label: "Subscriptions" },
                  { to: "/customer/celebrations", label: "Celebrations" },
                  { to: "/customer/visits", label: "Visits" },
                ]}
              />
            }
          >
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="elders" element={<ElderManagement />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="celebrations" element={<CelebrationsPage />} />
            <Route path="visits" element={<VisitBookings />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["WORKER"]} />}>
          <Route
            path="/worker"
            element={
              <PortalLayout
                title="Worker Portal"
                navClassName="bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200"
                links={[
                  { to: "/worker/dashboard", label: "Visit Schedule" },
                  { to: "/worker/report/active", label: "Task Reporting" },
                  { to: "/worker/upcoming", label: "Upcoming Visits" },
                ]}
              />
            }
          >
            <Route path="dashboard" element={<WorkerDashboard />} />
            <Route path="report/:visitId" element={<VisitReport />} />
            <Route path="report/active" element={<TaskReportingHub />} />
            <Route path="upcoming" element={<UpcomingVisits />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
          <Route
            path="/admin"
            element={
              <PortalLayout
                title="Admin Control Center"
                navClassName="bg-orange-100 text-orange-800 ring-1 ring-orange-200"
                links={[
                  { to: "/admin/dashboard", label: "Dashboard" },
                  { to: "/admin/workers-active", label: "Workers With Us" },
                  { to: "/admin/workers-pending", label: "Pending Workers" },
                  { to: "/admin/visits", label: "Visit Requests" },
                  { to: "/admin/workers-tracker", label: "Worker Tracker" },
                  { to: "/admin/emergency", label: "Emergency Hub" },
                  { to: "/admin/users", label: "Users" },
                ]}
              />
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="workers-active" element={<ActiveWorkers />} />
            <Route path="workers-pending" element={<WorkerVerification />} />
            <Route path="visits" element={<VisitRequests />} />
            <Route path="workers-tracker" element={<WorkerTracker />} />
            <Route path="emergency" element={<EmergencyHub />} />
            <Route path="users" element={<UserManagement />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
