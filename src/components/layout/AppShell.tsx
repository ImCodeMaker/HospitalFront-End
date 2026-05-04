import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { useAuthStore } from "@/store/authStore";
import { startOnboardingTour } from "@/lib/tour";

export function AppShell() {
  const { isAuthenticated, user, isFirstLogin, setFirstLogin } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isFirstLogin && user?.roles[0]) {
      const timer = setTimeout(() => {
        startOnboardingTour(user.roles[0]);
        setFirstLogin(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isFirstLogin, user, setFirstLogin]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      <Sidebar />

      {/* Title bar spacer for macOS traffic lights */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="h-8 drag-region bg-surface-950 shrink-0" />

        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex-1 overflow-auto p-6"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
