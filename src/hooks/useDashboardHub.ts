import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import {
  connectDashboardHub,
  disconnectDashboardHub,
  type CriticalLabResultPayload,
} from "@/api/signalr";

export function useDashboardHub(
  onCriticalLab?: (p: CriticalLabResultPayload) => void
) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    (async () => {
      try {
        const conn = await connectDashboardHub();
        if (cancelled) return;

        conn.on("AppointmentChanged", () => {
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        });
        conn.on("LabOrderChanged", () => {
          queryClient.invalidateQueries({ queryKey: ["lab-orders"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        });
        conn.on("BillingChanged", () => {
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        });
        conn.on("InventoryChanged", () => {
          queryClient.invalidateQueries({ queryKey: ["medications"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        });
        conn.on("CajaChanged", () => {
          queryClient.invalidateQueries({ queryKey: ["caja"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        });
        conn.on("CriticalLabResult", (payload: CriticalLabResultPayload) => {
          queryClient.invalidateQueries({ queryKey: ["lab-orders"] });
          onCriticalLab?.(payload);
        });
      } catch (err) {
        console.error("SignalR connection failed:", err);
      }
    })();

    return () => {
      cancelled = true;
      void disconnectDashboardHub();
    };
  }, [isAuthenticated, queryClient, onCriticalLab]);
}
