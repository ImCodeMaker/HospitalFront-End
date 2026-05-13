import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { lazy, Suspense } from "react";
import LoginPage from "@/pages/LoginPage";
import ErrorBoundaryPage from "@/pages/ErrorBoundaryPage";

function Loading() {
  return (
    <div className="flex items-center justify-center h-full">
      <span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );
}

function page(factory: () => Promise<{ default: React.ComponentType }>) {
  const C = lazy(factory);
  return (
    <Suspense fallback={<Loading />}>
      <C />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage />, errorElement: <ErrorBoundaryPage /> },
  { path: "/signup", element: page(() => import("@/pages/SignupPage")), errorElement: <ErrorBoundaryPage /> },
  {
    path: "/",
    element: <AppShell />,
    errorElement: <ErrorBoundaryPage />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: page(() => import("@/pages/DashboardPage")) },
      { path: "patients", element: page(() => import("@/pages/PatientsPage")) },
      { path: "patients/:id", element: page(() => import("@/pages/PatientDetailPage")) },
      { path: "appointments", element: page(() => import("@/pages/AppointmentsPage")) },
      { path: "consults", element: page(() => import("@/pages/ConsultsPage")) },
      { path: "consults/:id", element: page(() => import("@/pages/ConsultDetailPage")) },
      { path: "prescriptions", element: page(() => import("@/pages/PrescriptionsPage")) },
      { path: "lab", element: page(() => import("@/pages/LabPage")) },
      { path: "billing", element: page(() => import("@/pages/BillingPage")) },
      { path: "inventory", element: page(() => import("@/pages/InventoryPage")) },
      { path: "caja", element: page(() => import("@/pages/CajaPage")) },
      { path: "hr", element: page(() => import("@/pages/HRPage")) },
      { path: "reports", element: page(() => import("@/pages/ReportsPage")) },
      { path: "settings", element: page(() => import("@/pages/SettingsPage")) },
      { path: "audit", element: page(() => import("@/pages/AuditPage")) },
      { path: "no-show", element: page(() => import("@/pages/NoShowPage")) },
      { path: "portal", element: page(() => import("@/pages/PortalPage")) },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
