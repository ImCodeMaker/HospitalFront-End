import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { TopNav } from "./TopNav";
import { useAuthStore } from "@/store/authStore";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { settingsApi } from "@/api/settings";
import { startOnboardingTour } from "@/lib/tour";

export function AppShell() {
  const { isAuthenticated, user, isFirstLogin, setFirstLogin } = useAuthStore();
  const navigate = useNavigate();

  const { data: clinic } = useQuery({
    queryKey: ["clinic-settings"],
    queryFn: settingsApi.getClinicSettings,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  useInactivityLogout(clinic?.sessionTimeoutMinutes ?? 15);

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
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex-1 overflow-auto px-6 pb-6 pt-2"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
