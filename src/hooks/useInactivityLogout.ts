import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

/**
 * Auto-logout when the user is inactive longer than `timeoutMinutes`.
 * Defaults to 15 minutes per clinic policy.
 */
export function useInactivityLogout(timeoutMinutes = 15) {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    const reset = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        logout();
        navigate("/login", { replace: true });
      }, timeoutMs);
    };

    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    reset();

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, reset));
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, timeoutMinutes, logout, navigate]);
}
