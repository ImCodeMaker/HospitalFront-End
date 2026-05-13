import { useQuery } from "@apollo/client/react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuthStore, type UserRole } from "@/store/authStore";
import { Card, CardHeader, CardAction, StatusPill } from "@/components/ui/Card";
import {
  ADMIN_DASHBOARD_QUERY,
  DOCTOR_DASHBOARD_QUERY,
  LAB_TECH_DASHBOARD_QUERY,
  RECEPTIONIST_DASHBOARD_QUERY,
  type AdminDashboard,
  type DoctorDashboard,
  type LabTechDashboard,
  type ReceptionistDashboard,
  type AppointmentSummary,
} from "@/graphql/dashboards";
import {
  REVENUE_TREND_QUERY,
  CONSULTS_BY_SPECIALTY_QUERY,
  TOP_DIAGNOSES_QUERY,
  PAYMENT_METHOD_DISTRIBUTION_QUERY,
  NO_SHOW_RATE_QUERY,
  type RevenueTrendPoint,
  type SpecialtyVolumeSlice,
  type DiagnosisFrequency,
  type PaymentMethodSlice,
} from "@/graphql/analytics";

const SPECIALTY_COLORS = ["#a78bfa", "#4ea561", "#7c3aed", "#b89eff", "#f59e0b", "#ec4899", "#06b6d4"];

function pickRole(roles: UserRole[] | undefined): UserRole {
  if (!roles) return "Receptionist";
  const priority: UserRole[] = ["Admin", "Doctor", "LabTechnician", "Receptionist", "Nurse"];
  return priority.find((r) => roles.includes(r)) ?? "Receptionist";
}

function fmtMoney(n: number, compact = false) {
  return compact && Math.abs(n) >= 1000
    ? `RD$ ${(n / 1000).toFixed(1)}K`
    : `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 0 })}`;
}

function Chevron() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ProgressBar({ value, max = 100, color = "from-brand-400 to-brand-600" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full h-2 bg-surface-200 rounded-full overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: "easeOut" }}
        className={`h-full bg-gradient-to-r ${color} rounded-full`} />
    </div>
  );
}

function MiniBars({ values, max }: { values: number[]; max: number }) {
  const safeMax = max || 1;
  return (
    <div className="flex items-end gap-[3px] h-12 mt-2">
      {values.map((v, i) => (
        <motion.div key={i}
          initial={{ height: 0 }}
          animate={{ height: `${(v / safeMax) * 100}%` }}
          transition={{ delay: i * 0.02, duration: 0.5, ease: "easeOut" }}
          className="flex-1 bg-gradient-to-t from-brand-300 to-brand-500 rounded-sm min-h-[3px]"
        />
      ))}
    </div>
  );
}

function ItemAvatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${color} shrink-0`}>
      {initials}
    </div>
  );
}

function ListRow({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3 border-b border-surface-800 last:border-0">
      <div className="flex items-center gap-3 min-w-0">{left}</div>
      <div className="shrink-0 flex items-center gap-2 text-right">{right}</div>
    </li>
  );
}

/* ───────────────────────────── ADMIN ───────────────────────────── */

function AdminPanel({ data }: { data: AdminDashboard }) {
  const trendQ = useQuery<{ revenueTrend: RevenueTrendPoint[] }>(REVENUE_TREND_QUERY, { variables: { days: 30 } });
  const specQ = useQuery<{ consultsBySpecialty: SpecialtyVolumeSlice[] }>(CONSULTS_BY_SPECIALTY_QUERY, { variables: { days: 30 } });
  const diagQ = useQuery<{ topDiagnoses: DiagnosisFrequency[] }>(TOP_DIAGNOSES_QUERY, { variables: { top: 10, days: 30 } });
  const payQ = useQuery<{ paymentMethodDistribution: PaymentMethodSlice[] }>(PAYMENT_METHOD_DISTRIBUTION_QUERY, { variables: { days: 30 } });
  const nsQ = useQuery<{ noShowRate: number }>(NO_SHOW_RATE_QUERY, { variables: { days: 30 } });

  const trend = trendQ.data?.revenueTrend ?? [];
  const trendValues = trend.map((p) => p.total);
  const maxTrend = Math.max(...trendValues, 1);

  const specialties = specQ.data?.consultsBySpecialty ?? [];
  const totalSpecConsults = specialties.reduce((s, x) => s + x.count, 0) || 1;

  const consultsTarget = data.monthConsultCount > 0 ? data.monthConsultCount * 1.2 : 100;
  const onboardingPct = Math.min(100, Math.round((data.todayConsultCount / Math.max(1, data.todayConsultCount + 3)) * 100));

  return (
    <div className="grid grid-cols-12 gap-5">
      {/* Payments tracker */}
      <Card className="col-span-12 lg:col-span-7" delay={0}>
        <CardHeader
          icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-8v8m0 0v2m0-10V6" /></svg>}
          title="Seguimiento de pagos"
          subtitle="Ingresos del mes y facturas pendientes"
          action={<CardAction>Gestionar <Chevron /></CardAction>}
        />
        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-surface-300 p-4">
            <p className="text-xs text-ink/60 font-medium">Pendientes</p>
            <p className="text-3xl font-bold text-ink mt-2 tracking-tight">{data.pendingInvoicesCount}</p>
            <p className="text-xs text-ink/50 mt-1">facturas por cobrar</p>
          </div>
          <div className="rounded-2xl p-4 text-white shadow-sm" style={{ background: "#1c1b1f" }}>
            <p className="text-xs text-white/60 font-medium">Recaudado hoy</p>
            <p className="text-3xl font-bold mt-2 tracking-tight">{fmtMoney(data.todayRevenue, true)}</p>
            <p className="text-xs text-white/60 mt-1">{data.todayConsultCount} consultas</p>
          </div>
        </div>
        <div className="px-5 pb-5">
          <p className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider mb-2">Tendencia 30 días</p>
          <MiniBars values={trendValues.length > 0 ? trendValues : [0]} max={maxTrend} />
        </div>
        <div className="px-5 pb-5">
          <div className="rounded-xl bg-surface-300 px-4 py-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-surface-100 flex items-center justify-center text-ink/60">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4l3 2" /></svg>
              </span>
              <span className="text-ink">Mes a la fecha: <strong>{fmtMoney(data.monthRevenue, true)}</strong></span>
            </div>
            <button className="px-3 py-1.5 rounded-lg text-white text-xs font-medium" style={{ background: "#1c1b1f" }}>Ver detalles</button>
          </div>
        </div>
      </Card>

      {/* Today's actions */}
      <Card className="col-span-12 lg:col-span-5" delay={0.05}>
        <CardHeader
          icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" /></svg>}
          title="Para ti hoy"
          subtitle="Pendientes que requieren atención"
          action={<CardAction>Gestionar <Chevron /></CardAction>}
        />
        <ul className="px-5 py-2">
          <ListRow
            left={<><div className="relative"><div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-700"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4M12 16h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /></svg></div><span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-1">{data.lowStockCount}</span></div><div className="min-w-0"><p className="text-sm font-medium text-ink">Stock crítico</p><p className="text-xs text-ink/50">Medicamentos bajo el umbral</p></div></>}
            right={<button className="px-2.5 py-1 rounded-md text-xs font-medium border border-surface-700/40 hover:bg-surface-200">Revisar</button>}
          />
          <ListRow
            left={<><div className="relative"><div className="w-9 h-9 rounded-full bg-lavender-200 flex items-center justify-center text-lavender-700"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /></svg></div><span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full text-white text-[9px] font-bold flex items-center justify-center px-1" style={{ background: "#1c1b1f" }}>{data.pendingInvoicesCount}</span></div><div className="min-w-0"><p className="text-sm font-medium text-ink">Facturas pendientes</p><p className="text-xs text-ink/50">Aguardan pago o cobro</p></div></>}
            right={<button className="px-2.5 py-1 rounded-md text-xs font-medium border border-surface-700/40 hover:bg-surface-200">Revisar</button>}
          />
          <ListRow
            left={<><div className="w-9 h-9 rounded-full bg-mint-200 flex items-center justify-center text-mint-700"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" /></svg></div><div className="min-w-0"><p className="text-sm font-medium text-ink">Pacientes activos</p><p className="text-xs text-ink/50">Total en sistema</p></div></>}
            right={<span className="text-sm font-bold text-ink">{data.totalActivePatients}</span>}
          />
        </ul>

        <div className="m-5 mt-2 rounded-2xl bg-lavender-200/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-ink">Progreso del mes</p>
            <span className="text-2xl font-bold text-lavender-700">{onboardingPct}%</span>
          </div>
          <ProgressBar value={onboardingPct} max={100} />
          <p className="text-[10px] text-ink/50 uppercase tracking-wider mt-1.5">Meta diaria de consultas</p>
        </div>

        <div className="mx-5 mb-5 rounded-2xl bg-mint-200/60 p-4">
          <p className="text-sm font-semibold text-ink mb-2">Maximiza tu experiencia</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <svg className="w-4 h-4 text-mint-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <p className="text-xs text-ink/70">Configura plantillas por especialidad</p>
            </div>
            <button className="px-3 py-1.5 rounded-lg bg-white text-ink text-xs font-medium border border-white/80">Explorar</button>
          </div>
        </div>
      </Card>

      {/* Revenue trend */}
      <Card className="col-span-12 lg:col-span-8" delay={0.1}>
        <CardHeader
          icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l4-4 4 4 6-6" /></svg>}
          title="Historial de ingresos"
          action={<CardAction>Ver todo</CardAction>}
        />
        <ul className="px-5 py-2">
          {trend.length === 0 ? (
            <li className="py-8 text-center text-sm text-ink/50">Sin actividad reciente</li>
          ) : trend.slice(-6).reverse().map((p) => (
            <ListRow key={p.date}
              left={<><span className="w-9 h-9 rounded-full bg-surface-200 flex items-center justify-center text-ink/60 text-[10px] font-bold">ACH</span>
                <div className="min-w-0"><p className="text-sm font-medium text-ink">Recaudación {new Date(p.date).toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" })}</p><p className="text-xs text-ink/50">Total del día</p></div></>}
              right={<><span className="text-sm font-bold text-ink">{fmtMoney(p.total, true)}</span><StatusPill variant={p.total > 0 ? "success" : "neutral"}>{p.total > 0 ? "Activo" : "Sin actividad"}</StatusPill></>}
            />
          ))}
        </ul>
      </Card>

      {/* Specialty mix */}
      <Card className="col-span-12 lg:col-span-4" delay={0.15}>
        <CardHeader
          icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /></svg>}
          title="Por especialidad"
          subtitle="Últimos 30 días"
          action={<CardAction><Chevron /></CardAction>}
        />
        <div className="p-5">
          {specialties.length === 0 ? (
            <p className="text-sm text-ink/50 py-6 text-center">Sin consultas registradas</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {specialties.slice(0, 5).map((s, i) => {
                const pct = (s.count / totalSpecConsults) * 100;
                return (
                  <li key={s.specialtyId} className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: SPECIALTY_COLORS[i % SPECIALTY_COLORS.length] }}>
                      {s.specialty.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-ink truncate">{s.specialty}</p>
                      <ProgressBar value={pct} color={`from-[${SPECIALTY_COLORS[i % SPECIALTY_COLORS.length]}] to-[${SPECIALTY_COLORS[i % SPECIALTY_COLORS.length]}]`} />
                    </div>
                    <span className="text-sm font-bold text-ink shrink-0">{s.count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      {/* Top diagnoses */}
      <Card className="col-span-12 lg:col-span-6" delay={0.2}>
        <CardHeader
          icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" /></svg>}
          title="Top diagnósticos"
          subtitle="Últimos 30 días"
          action={<CardAction>Ver todo</CardAction>}
        />
        <div className="p-5">
          {(diagQ.data?.topDiagnoses ?? []).length === 0 ? (
            <p className="text-sm text-ink/50 py-6 text-center">Sin diagnósticos registrados</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {(diagQ.data?.topDiagnoses ?? []).slice(0, 7).map((d, i) => {
                const max = Math.max(...(diagQ.data?.topDiagnoses ?? []).map((x) => x.count), 1);
                const pct = (d.count / max) * 100;
                return (
                  <li key={d.diagnosisCode} className="flex items-center gap-3 text-xs">
                    <span className="w-6 text-right text-ink/40">{i + 1}</span>
                    <span className="font-mono text-ink/70 w-14">{d.diagnosisCode}</span>
                    <span className="flex-1 truncate text-ink/80">{d.description}</span>
                    <div className="w-24 h-2 bg-surface-200 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, delay: i * 0.04 }}
                        className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full" />
                    </div>
                    <span className="text-ink font-bold w-7 text-right">{d.count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      {/* Payment methods */}
      <Card className="col-span-12 lg:col-span-6" delay={0.25}>
        <CardHeader
          icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" /></svg>}
          title="Métodos de pago"
          subtitle="Distribución de cobros 30d"
          action={<CardAction>Filtrar <Chevron /></CardAction>}
        />
        <div className="p-5 flex flex-col gap-3">
          {(payQ.data?.paymentMethodDistribution ?? []).length === 0 ? (
            <p className="text-sm text-ink/50 py-6 text-center">Sin pagos registrados</p>
          ) : (
            (payQ.data?.paymentMethodDistribution ?? []).map((m, i) => (
              <div key={m.method} className="flex items-center gap-3 text-sm">
                <span className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: SPECIALTY_COLORS[i % SPECIALTY_COLORS.length] }}>
                  {m.method.slice(0, 3).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink">{m.method}</p>
                  <p className="text-xs text-ink/50">{m.count} transacciones</p>
                </div>
                <span className="text-sm font-bold text-ink">{fmtMoney(m.total, true)}</span>
              </div>
            ))
          )}
          <div className="mt-2 pt-3 border-t border-surface-800 flex items-center justify-between text-xs">
            <span className="text-ink/60">Tasa no-show 30d</span>
            <span className={`font-bold ${(nsQ.data?.noShowRate ?? 0) > 15 ? "text-rose-500" : "text-mint-700"}`}>
              {(nsQ.data?.noShowRate ?? 0).toFixed(1)}%
            </span>
          </div>
          <div className="text-xs">
            <p className="text-ink/60 mb-1.5">Avance mensual de consultas</p>
            <ProgressBar value={data.monthConsultCount} max={consultsTarget} />
            <p className="text-[10px] text-ink/40 mt-1">{data.monthConsultCount} / meta {Math.round(consultsTarget)}</p>
          </div>
        </div>
      </Card>

      {/* Stock alerts */}
      {data.lowStockAlerts.length > 0 && (
        <Card className="col-span-12" delay={0.3}>
          <CardHeader
            icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>}
            title="Alertas de inventario"
            subtitle={`${data.lowStockAlerts.length} medicamentos requieren atención`}
            action={<CardAction>Ver inventario</CardAction>}
          />
          <ul className="px-5 py-2">
            {data.lowStockAlerts.slice(0, 5).map((a, i) => (
              <ListRow key={a.id}
                left={<><ItemAvatar name={a.name} color={["bg-lavender-200 text-lavender-700","bg-mint-200 text-mint-700","bg-amber-200 text-amber-700","bg-rose-100 text-rose-700"][i % 4]} />
                  <div className="min-w-0"><p className="text-sm font-medium text-ink truncate">{a.name}</p><p className="text-xs text-ink/50 truncate">{a.genericName}</p></div></>}
                right={<><span className={`text-sm font-bold ${a.isOutOfStock ? "text-rose-500" : "text-amber-600"}`}>{a.currentStock} / {a.minimumStockThreshold}</span><StatusPill variant={a.isOutOfStock ? "danger" : "warning"}>{a.isOutOfStock ? "Agotado" : "Bajo"}</StatusPill></>}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ───────────────────────────── DOCTOR ───────────────────────────── */

function AppointmentItem({ a, i }: { a: AppointmentSummary; i: number }) {
  const COLORS = ["bg-lavender-200 text-lavender-700", "bg-mint-200 text-mint-700", "bg-amber-200 text-amber-700", "bg-rose-100 text-rose-700"];
  return (
    <ListRow
      left={<><ItemAvatar name={a.patientName} color={COLORS[i % COLORS.length]} />
        <div className="min-w-0"><p className="text-sm font-medium text-ink truncate">{a.patientName}</p><p className="text-xs text-ink/50 truncate">{a.reason ?? a.type}</p></div></>}
      right={<><span className="text-sm font-bold text-ink">{new Date(a.scheduledDate).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}</span><StatusPill variant={a.status === "Attended" ? "success" : a.status === "Confirmed" ? "info" : "neutral"}>{a.status}</StatusPill></>}
    />
  );
}

function DoctorPanel({ data }: { data: DoctorDashboard }) {
  return (
    <div className="grid grid-cols-12 gap-5">
      <Card className="col-span-12 md:col-span-4" delay={0}>
        <div className="p-5">
          <p className="text-xs font-semibold text-ink/50 uppercase tracking-wider">Citas hoy</p>
          <p className="text-5xl font-bold text-ink leading-none mt-3">{data.todayAppointmentCount}</p>
          <p className="text-xs text-ink/50 mt-2">programadas</p>
        </div>
      </Card>
      <Card className="col-span-12 md:col-span-4" delay={0.05}>
        <div className="p-5 bg-mint-200/40 rounded-2xl">
          <p className="text-xs font-semibold text-mint-700 uppercase tracking-wider">Consultas activas</p>
          <p className="text-5xl font-bold text-ink leading-none mt-3">{data.pendingConsultCount}</p>
          <p className="text-xs text-ink/60 mt-2">en progreso</p>
        </div>
      </Card>
      <Card className="col-span-12 md:col-span-4" delay={0.1}>
        <div className="p-5 rounded-2xl text-white" style={{ background: "#1c1b1f" }}>
          <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Labs sin revisar</p>
          <p className="text-5xl font-bold leading-none mt-3">{data.unreviewedLabResultsCount}</p>
          <p className="text-xs text-white/60 mt-2">requieren firma</p>
        </div>
      </Card>

      <Card className="col-span-12" delay={0.15}>
        <CardHeader
          icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /></svg>}
          title="Agenda de hoy"
          action={<CardAction>Filtrar <Chevron /></CardAction>}
        />
        <ul className="px-5 py-2">
          {data.todayAppointments.length === 0 ? (
            <li className="py-8 text-center text-sm text-ink/50">Sin citas programadas</li>
          ) : data.todayAppointments.map((a, i) => <AppointmentItem key={a.id} a={a} i={i} />)}
        </ul>
      </Card>
    </div>
  );
}

/* ───────────────────────────── RECEPTIONIST ───────────────────────────── */

function ReceptionistPanel({ data }: { data: ReceptionistDashboard }) {
  return (
    <div className="grid grid-cols-12 gap-5">
      {[
        { label: "Citas hoy", value: data.todayAppointmentCount, bg: "bg-white" },
        { label: "Confirmadas", value: data.confirmedCount, bg: "bg-mint-200/40" },
        { label: "Atendidas", value: data.attendedCount, bg: "bg-lavender-200/40" },
        { label: "Por facturar", value: data.pendingBillingCount, bg: "bg-[#1c1b1f] text-white" },
      ].map((kpi, i) => (
        <Card key={kpi.label} className="col-span-6 md:col-span-3" delay={i * 0.04}>
          <div className={`p-5 rounded-2xl ${kpi.bg}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider ${kpi.bg.includes("ink") ? "text-white/60" : "text-ink/50"}`}>{kpi.label}</p>
            <p className={`text-5xl font-bold leading-none mt-3 ${kpi.bg.includes("ink") ? "text-white" : "text-ink"}`}>{kpi.value}</p>
          </div>
        </Card>
      ))}

      <Card className="col-span-12" delay={0.2}>
        <CardHeader
          icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" /></svg>}
          title="Próximas citas"
          action={<CardAction>Filtrar <Chevron /></CardAction>}
        />
        <ul className="px-5 py-2">
          {data.todayAppointments.length === 0 ? (
            <li className="py-8 text-center text-sm text-ink/50">Sin citas programadas</li>
          ) : data.todayAppointments.map((a, i) => <AppointmentItem key={a.id} a={a} i={i} />)}
        </ul>
      </Card>
    </div>
  );
}

/* ───────────────────────────── LAB TECH ───────────────────────────── */

function LabTechPanel({ data }: { data: LabTechDashboard }) {
  return (
    <div className="grid grid-cols-12 gap-5">
      <Card className="col-span-12 md:col-span-4" delay={0}>
        <div className="p-5">
          <p className="text-xs font-semibold text-ink/50 uppercase tracking-wider">Órdenes pendientes</p>
          <p className="text-5xl font-bold text-ink leading-none mt-3">{data.pendingOrdersCount}</p>
        </div>
      </Card>
      <Card className="col-span-12 md:col-span-4" delay={0.05}>
        <div className={`p-5 rounded-2xl ${data.urgentOrdersCount > 0 ? "bg-rose-100" : "bg-mint-200/40"}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${data.urgentOrdersCount > 0 ? "text-rose-700" : "text-mint-700"}`}>Urgentes</p>
          <p className="text-5xl font-bold text-ink leading-none mt-3">{data.urgentOrdersCount}</p>
        </div>
      </Card>
      <Card className="col-span-12 md:col-span-4" delay={0.1}>
        <div className="p-5 rounded-2xl text-white" style={{ background: "#1c1b1f" }}>
          <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">En proceso</p>
          <p className="text-5xl font-bold leading-none mt-3">{data.inProgressCount}</p>
        </div>
      </Card>

      <Card className="col-span-12" delay={0.15}>
        <CardHeader
          icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 2v8.5L3.5 19a2 2 0 0 0 1.7 3h13.6a2 2 0 0 0 1.7-3L15 10.5V2M7 2h10" /></svg>}
          title="Cola priorizada"
          action={<CardAction>Filtrar <Chevron /></CardAction>}
        />
        <ul className="px-5 py-2">
          {data.pendingOrders.length === 0 ? (
            <li className="py-8 text-center text-sm text-mint-700">✓ Sin órdenes pendientes</li>
          ) : data.pendingOrders.slice(0, 10).map((o, i) => (
            <ListRow key={o.id}
              left={<><ItemAvatar name={o.testName} color={o.priority === "Stat" || o.priority === "Urgent" ? "bg-rose-100 text-rose-700" : ["bg-lavender-200 text-lavender-700","bg-mint-200 text-mint-700","bg-amber-200 text-amber-700"][i % 3]} />
                <div className="min-w-0"><p className="text-sm font-medium text-ink truncate">{o.testName}</p><p className="text-xs text-ink/50 truncate">{o.patientName}</p></div></>}
              right={<StatusPill variant={o.priority === "Stat" || o.priority === "Urgent" ? "danger" : "neutral"}>{o.priority}</StatusPill>}
            />
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ───────────────────────────── ROOT ───────────────────────────── */

function DashboardContent() {
  const { user } = useAuthStore();
  const role = pickRole(user?.roles);

  const adminQ = useQuery<{ adminDashboard: AdminDashboard }>(ADMIN_DASHBOARD_QUERY, { skip: role !== "Admin" });
  const doctorQ = useQuery<{ doctorDashboard: DoctorDashboard }>(DOCTOR_DASHBOARD_QUERY, {
    variables: { doctorId: user?.userId }, skip: role !== "Doctor" || !user?.userId,
  });
  const receptionistQ = useQuery<{ receptionistDashboard: ReceptionistDashboard }>(RECEPTIONIST_DASHBOARD_QUERY, {
    skip: role !== "Receptionist" && role !== "Nurse",
  });
  const labTechQ = useQuery<{ labTechDashboard: LabTechDashboard }>(LAB_TECH_DASHBOARD_QUERY, { skip: role !== "LabTechnician" });

  const loading = adminQ.loading || doctorQ.loading || receptionistQ.loading || labTechQ.loading;
  if (loading) {
    return <div className="flex items-center justify-center py-32"><span className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>;
  }
  if (role === "Admin" && adminQ.data) return <AdminPanel data={adminQ.data.adminDashboard} />;
  if (role === "Doctor" && doctorQ.data) return <DoctorPanel data={doctorQ.data.doctorDashboard} />;
  if (role === "LabTechnician" && labTechQ.data) return <LabTechPanel data={labTechQ.data.labTechDashboard} />;
  if ((role === "Receptionist" || role === "Nurse") && receptionistQ.data) return <ReceptionistPanel data={receptionistQ.data.receptionistDashboard} />;

  const errMsg =
    adminQ.error?.message ?? doctorQ.error?.message ?? receptionistQ.error?.message ?? labTechQ.error?.message;

  return (
    <Card className="p-6">
      <p className="text-sm text-ink font-semibold">No hay datos del panel disponibles</p>
      <p className="text-xs text-ink/60 mt-1">Rol detectado: <span className="font-mono">{role}</span></p>
      {errMsg && <p className="text-xs text-rose-600 mt-2">⚠ {errMsg}</p>}
      <p className="text-xs text-ink/50 mt-3">Verifica que el backend esté corriendo, vuelve a iniciar sesión si tu token expiró, o recarga la página.</p>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-5">
      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
        className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink tracking-tight">
          {t("dashboard.greeting")}, {user?.fullName?.split(" ")[0] ?? ""} <span className="inline-block">👋</span>
        </h1>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-ink/70 hover:text-ink bg-surface-100 dark:bg-surface-100 border border-surface-700/40 hover:bg-surface-200 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" /></svg>
          {t("dashboard.customize")}
        </button>
      </motion.div>
      <DashboardContent />
    </div>
  );
}
