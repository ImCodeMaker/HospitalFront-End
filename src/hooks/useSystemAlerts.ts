import { useQuery } from "@tanstack/react-query";
import { ncfApi } from "@/api/ncf";
import { useAuthStore } from "@/store/authStore";

export interface SystemAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  action?: { label: string; to: string };
}

export function useSystemAlerts() {
  const auth = useAuthStore();
  const enabled = auth.isAuthenticated && (auth.user?.roles?.includes("Admin") ?? false);

  const { data: ncfRanges } = useQuery({
    queryKey: ["ncf-ranges"],
    queryFn: ncfApi.list,
    refetchInterval: 5 * 60 * 1000,
    enabled,
  });

  const alerts: SystemAlert[] = [];

  ncfRanges?.forEach((r) => {
    if (!r.isActive) return;
    const expSoon = !r.isExpired && new Date(r.expirationDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
    if (r.isExpired) {
      alerts.push({
        id: `ncf-expired-${r.id}`,
        severity: "critical",
        title: `Rango NCF ${r.prefix} expirado`,
        message: `Las facturas con este tipo no se podrán emitir. Registra un rango nuevo.`,
        action: { label: "Configuración → NCF", to: "/settings" },
      });
    } else if (r.isExhausted) {
      alerts.push({
        id: `ncf-exhausted-${r.id}`,
        severity: "critical",
        title: `Rango NCF ${r.prefix} agotado`,
        message: `El último número del rango fue consumido. Registra un nuevo rango.`,
        action: { label: "Configuración → NCF", to: "/settings" },
      });
    } else if (r.remaining < 100) {
      alerts.push({
        id: `ncf-low-${r.id}`,
        severity: "warning",
        title: `Rango NCF ${r.prefix} bajo`,
        message: `Solo quedan ${r.remaining} números. Solicita un rango nuevo a la DGII.`,
        action: { label: "Configuración → NCF", to: "/settings" },
      });
    } else if (expSoon) {
      alerts.push({
        id: `ncf-soon-${r.id}`,
        severity: "warning",
        title: `Rango NCF ${r.prefix} expira pronto`,
        message: `Expira el ${new Date(r.expirationDate).toLocaleDateString("es-DO")}.`,
        action: { label: "Configuración → NCF", to: "/settings" },
      });
    }
  });

  return { alerts };
}
