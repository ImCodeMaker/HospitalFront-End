import { useQuery } from "@tanstack/react-query";
import { useSubscription } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import { motion } from "framer-motion";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

// ── GraphQL real-time subscription ────────────────────────────────────────────
const DASHBOARD_SUBSCRIPTION = gql`
  subscription OnDashboardUpdated {
    dashboardUpdated {
      todayRevenue
      todayAppointments
      pendingInvoices
      lowStockCount
    }
  }
`;

// ── REST fallback queries ─────────────────────────────────────────────────────
async function fetchDailyRevenue() {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await api.get(`/reports/daily-revenue?date=${today}`);
  return data as { totalRevenue: number; totalInvoices: number; paidInvoices: number };
}

async function fetchLowStock() {
  const { data } = await api.get("/reports/inventory");
  return (data as any[]).filter((m) => m.isLowStock).length;
}

async function fetchTodayAppointments() {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await api.get(`/appointments?from=${today}T00:00:00Z&to=${today}T23:59:59Z`);
  return (data as any)?.totalCount ?? 0;
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  index: number;
}

function StatCard({ label, value, sub, color = "brand", index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35, ease: "easeOut" }}
      className="bg-surface-900 border border-surface-800 rounded-2xl p-5 flex flex-col gap-2 hover:border-surface-700 transition-colors"
    >
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={`text-3xl font-bold text-${color}-400`}>{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const revenueQ = useQuery({
    queryKey: ["dashboard", "revenue"],
    queryFn: fetchDailyRevenue,
  });

  const stockQ = useQuery({
    queryKey: ["dashboard", "lowstock"],
    queryFn: fetchLowStock,
  });

  const apptQ = useQuery({
    queryKey: ["dashboard", "appointments"],
    queryFn: fetchTodayAppointments,
  });

  // Real-time updates via GraphQL subscription
  useSubscription(DASHBOARD_SUBSCRIPTION, {
    onData: () => {
      revenueQ.refetch();
      stockQ.refetch();
      apptQ.refetch();
    },
  });

  const revenue = revenueQ.data?.totalRevenue ?? 0;
  const lowStock = stockQ.data ?? 0;
  const appointments = apptQ.data ?? 0;
  const paidInvoices = revenueQ.data?.paidInvoices ?? 0;
  const totalInvoices = revenueQ.data?.totalInvoices ?? 0;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-white">
          {greeting}, {user?.fullName?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {new Date().toLocaleDateString("es-DO", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </motion.div>

      {/* KPI Grid */}
      <div
        data-tour="dashboard-stats"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          index={0}
          label="Ingresos hoy"
          value={`RD$ ${revenue.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`}
          sub={`${paidInvoices} facturas pagadas`}
          color="brand"
        />
        <StatCard
          index={1}
          label="Citas hoy"
          value={appointments}
          sub="programadas"
          color="emerald"
        />
        <StatCard
          index={2}
          label="Facturas pendientes"
          value={totalInvoices - paidInvoices}
          sub="por cobrar"
          color="amber"
        />
        <StatCard
          index={3}
          label="Stock bajo"
          value={lowStock}
          sub="medicamentos"
          color={lowStock > 0 ? "red" : "emerald"}
        />
      </div>

      {/* Placeholder panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="bg-surface-900 border border-surface-800 rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-slate-300 mb-4">
            Próximas citas
          </h2>
          <p className="text-sm text-slate-500">Cargando…</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.38, duration: 0.3 }}
          className="bg-surface-900 border border-surface-800 rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-slate-300 mb-4">
            Alertas de inventario
          </h2>
          {lowStock === 0 ? (
            <p className="text-sm text-emerald-400">
              ✓ Todos los medicamentos en stock adecuado
            </p>
          ) : (
            <p className="text-sm text-amber-400">
              ⚠ {lowStock} medicamentos por debajo del umbral mínimo
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
