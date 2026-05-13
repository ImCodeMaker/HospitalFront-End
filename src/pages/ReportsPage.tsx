import { useState } from "react";
import { useQuery as useRQQuery } from "@tanstack/react-query";
import { useQuery as useApolloQuery } from "@apollo/client/react";
import { motion } from "framer-motion";
import { reportsApi } from "@/api/reports";
import {
  PATIENT_DEMOGRAPHICS_QUERY,
  PRESCRIPTION_ANALYSIS_QUERY,
  CONSULT_VOLUME_BY_DOCTOR_QUERY,
  STAFF_PERFORMANCE_QUERY,
  CONTROLLED_SUBSTANCE_LOG_QUERY,
  type DemographicsReport,
  type PrescriptionFrequency,
  type ConsultVolumeByDoctorRow,
  type StaffPerformanceRow,
  type ControlledSubstanceEntry,
} from "@/graphql/analytics";

type Tab = "revenue" | "receivables" | "inventory" | "analytics";

function fmt(v: number) { return v.toLocaleString("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }); }
function fmtCompact(n: number) {
  return Math.abs(n) >= 1000
    ? `RD$ ${(n / 1000).toFixed(1)}K`
    : `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 0 })}`;
}
function formatDate(iso: string) { return new Date(iso).toLocaleDateString("es-DO", { year: "numeric", month: "short", day: "numeric" }); }
function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-DO", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const AGING_COLORS: Record<string, string> = {
  "0-30": "bg-emerald-500/15 text-emerald-400",
  "31-60": "bg-amber-500/15 text-amber-400",
  "61-90": "bg-orange-500/15 text-orange-400",
  "90+": "bg-red-500/15 text-red-400",
};

const GENDER_COLORS = ["#a78bfa", "#4ea561", "#7c3aed", "#b89eff", "#f59e0b", "#ec4899"];

function DonutChart({ segments }: { segments: { value: number; color: string; label: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 60;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#e8e1cd" strokeWidth="22" />
        {segments.map((s, i) => {
          const dash = (s.value / total) * circumference;
          const seg = (
            <circle
              key={i}
              cx="80" cy="80" r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="22"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += dash;
          return seg;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-ink">{total}</span>
        <span className="text-xs text-ink/60">total</span>
      </div>
    </div>
  );
}

function AnalyticsPanel() {
  const [days, setDays] = useState<number>(30);

  const demoQ = useApolloQuery<{ patientDemographics: DemographicsReport }>(PATIENT_DEMOGRAPHICS_QUERY);
  const presQ = useApolloQuery<{ prescriptionAnalysis: PrescriptionFrequency[] }>(PRESCRIPTION_ANALYSIS_QUERY, { variables: { top: 10, days } });
  const consultQ = useApolloQuery<{ consultVolumeByDoctor: ConsultVolumeByDoctorRow[] }>(CONSULT_VOLUME_BY_DOCTOR_QUERY, { variables: { days } });
  const staffQ = useApolloQuery<{ staffPerformance: StaffPerformanceRow[] }>(STAFF_PERFORMANCE_QUERY, { variables: { days } });
  const ctrlQ = useApolloQuery<{ controlledSubstanceLog: ControlledSubstanceEntry[] }>(CONTROLLED_SUBSTANCE_LOG_QUERY);

  const demo = demoQ.data?.patientDemographics;
  const prescriptions = presQ.data?.prescriptionAnalysis ?? [];
  const consults = consultQ.data?.consultVolumeByDoctor ?? [];
  const staff = staffQ.data?.staffPerformance ?? [];
  const controlled = ctrlQ.data?.controlledSubstanceLog ?? [];

  const maxAge = Math.max(...(demo?.ageBuckets.map((b) => b.count) ?? [0]), 1);
  const maxPres = Math.max(...prescriptions.map((p) => p.count), 1);

  const genderSegments = (demo?.genderBreakdown ?? []).map((g, i) => ({
    value: g.count,
    color: GENDER_COLORS[i % GENDER_COLORS.length],
    label: g.gender,
  }));

  // Combine doctor consult metrics with staff revenue/completed metrics
  const consultLookup = new Map(consults.map((c) => [c.doctorId, c]));
  const staffLookup = new Map(staff.map((s) => [s.userId, s]));
  const combinedIds = Array.from(new Set([...consultLookup.keys(), ...staffLookup.keys()]));
  const combined = combinedIds.map((id) => {
    const c = consultLookup.get(id);
    const s = staffLookup.get(id);
    return {
      id,
      name: c?.doctorName ?? s?.fullName ?? "—",
      role: s?.role ?? "Doctor",
      consultCount: c?.consultCount ?? 0,
      averageMinutes: c?.averageMinutes ?? 0,
      patientsAttended: s?.patientsAttended ?? 0,
      revenueGenerated: s?.revenueGenerated ?? 0,
      completedTasks: s?.completedTasks ?? 0,
    };
  }).sort((a, b) => b.revenueGenerated - a.revenueGenerated);

  const loading = demoQ.loading || presQ.loading || consultQ.loading || staffQ.loading || ctrlQ.loading;

  return (
    <motion.div key="analytics" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
      {/* Header chips: days selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-ink/60 mr-1">Período:</span>
        {[30, 60, 90, 180].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              days === d
                ? "bg-ink text-surface-100 border-ink"
                : "bg-surface-100 text-ink/70 border-surface-700/50 hover:bg-surface-200"
            }`}
          >
            {d} días
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <span className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Demographics - age buckets */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:col-span-2 rounded-3xl bg-lavender-200 p-6 flex flex-col gap-4 border border-lavender-300/30"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-lavender-700">Demografía de pacientes</h2>
              <span className="text-xs text-lavender-700/70 bg-white/60 rounded-full px-2 py-0.5">
                {demo?.totalActive ?? 0} activos
              </span>
            </div>
            {(demo?.ageBuckets ?? []).length === 0 ? (
              <p className="text-sm text-lavender-700/60 py-6 text-center">Sin datos demográficos</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {(demo?.ageBuckets ?? []).map((b, i) => {
                  const pct = (b.count / maxAge) * 100;
                  return (
                    <li key={b.range} className="flex items-center gap-3 text-xs">
                      <span className="w-12 text-ink/70 font-mono">{b.range}</span>
                      <div className="flex-1 h-3 bg-white/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, delay: i * 0.05 }}
                          className="h-full bg-gradient-to-r from-brand-500 to-brand-700 rounded-full"
                        />
                      </div>
                      <span className="text-ink font-semibold w-10 text-right">{b.count}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>

          {/* Gender donut */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="rounded-3xl bg-surface-100 border border-surface-700/40 p-6 flex flex-col gap-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">Género</h2>
              <span className="text-xs text-ink/50">activos</span>
            </div>
            {genderSegments.length === 0 ? (
              <p className="text-sm text-ink/50 py-6 text-center">Sin datos</p>
            ) : (
              <>
                <DonutChart segments={genderSegments} />
                <ul className="flex flex-col gap-1 mt-1">
                  {(demo?.genderBreakdown ?? []).map((g, i) => (
                    <li key={g.gender} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: GENDER_COLORS[i % GENDER_COLORS.length] }} />
                      <span className="text-ink/70 truncate flex-1">{g.gender}</span>
                      <span className="text-ink font-semibold">{g.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </motion.div>

          {/* Top medications */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="lg:col-span-3 rounded-3xl bg-surface-100 border border-surface-700/40 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-ink">Top 10 medicamentos prescritos</h2>
              <span className="text-xs text-ink/50">{days}d</span>
            </div>
            {prescriptions.length === 0 ? (
              <p className="text-sm text-ink/50 py-6 text-center">Sin prescripciones en el período</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {prescriptions.map((p, i) => {
                  const pct = (p.count / maxPres) * 100;
                  return (
                    <li key={p.drugName} className="flex items-center gap-3 text-xs">
                      <span className="w-6 text-right text-ink/40">{i + 1}</span>
                      <span className="text-ink/80 w-44 truncate">{p.drugName}</span>
                      <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, delay: i * 0.04 }}
                          className="h-full bg-gradient-to-r from-brand-500 to-brand-700 rounded-full"
                        />
                      </div>
                      <span className="text-ink font-semibold w-10 text-right">{p.count}</span>
                      <span className="text-ink/50 w-20 text-right">{p.uniquePatients} pac.</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>

          {/* Doctor performance combined view */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="lg:col-span-3 rounded-3xl bg-surface-100 border border-surface-700/40 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-ink">Desempeño del personal médico</h2>
              <span className="text-xs text-ink/50">{days}d</span>
            </div>
            {combined.length === 0 ? (
              <p className="text-sm text-ink/50 py-6 text-center">Sin actividad clínica en el período</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700/40">
                      {["Doctor", "Rol", "Consultas", "Min. promedio", "Pacientes", "Completadas", "Ingresos"].map((h) => (
                        <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-ink/50 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {combined.map((r) => (
                      <tr key={r.id} className="border-b border-surface-700/40 last:border-0 hover:bg-surface-200/40 transition-colors">
                        <td className="px-3 py-2.5 text-ink font-medium">{r.name}</td>
                        <td className="px-3 py-2.5 text-ink/60">{r.role}</td>
                        <td className="px-3 py-2.5 text-ink">{r.consultCount}</td>
                        <td className="px-3 py-2.5 text-ink/70">{r.averageMinutes.toFixed(1)} min</td>
                        <td className="px-3 py-2.5 text-ink/70">{r.patientsAttended}</td>
                        <td className="px-3 py-2.5 text-ink/70">{r.completedTasks}</td>
                        <td className="px-3 py-2.5 font-semibold text-mint-700">{fmtCompact(r.revenueGenerated)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Controlled substances */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="lg:col-span-3 rounded-3xl bg-navy-500 p-6 shadow-sm text-white"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold">Sustancias controladas</h2>
              <span className="text-xs opacity-70 bg-white/10 rounded-full px-2 py-0.5">últimos 30 días</span>
            </div>
            {controlled.length === 0 ? (
              <p className="text-sm opacity-60 py-6 text-center">Sin sustancias controladas registradas</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      {["Medicamento", "Clase", "Stock actual", "Dispensado (30d)", "Última dispensación"].map((h) => (
                        <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold opacity-60 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {controlled.map((m) => (
                      <tr key={m.medicationId} className="border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors">
                        <td className="px-3 py-2.5 font-medium">{m.medicationName}</td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-200">
                            {m.classCode ?? "—"}
                          </span>
                        </td>
                        <td className={`px-3 py-2.5 font-semibold ${m.currentStock <= 0 ? "text-red-300" : m.currentStock < 20 ? "text-amber-300" : ""}`}>
                          {m.currentStock}
                        </td>
                        <td className="px-3 py-2.5 opacity-80">{m.dispensed30d}</td>
                        <td className="px-3 py-2.5 opacity-70 text-xs">{formatDateTime(m.lastDispensedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("revenue");
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: revenueRaw, isLoading: revLoading } = useRQQuery({
    queryKey: ["revenue", selectedDate],
    queryFn: () => reportsApi.dailyRevenue(selectedDate),
    enabled: tab === "revenue",
  });
  const revenue = revenueRaw ? [revenueRaw] : undefined;

  const { data: receivables, isLoading: recLoading } = useRQQuery({
    queryKey: ["receivables"],
    queryFn: reportsApi.accountsReceivable,
    enabled: tab === "receivables",
  });

  const { data: invReport, isLoading: invLoading } = useRQQuery({
    queryKey: ["inventory-report"],
    queryFn: reportsApi.inventoryReport,
    enabled: tab === "inventory",
  });

  const totalRevenue = revenue?.reduce((s, d) => s + d.totalRevenue, 0) ?? 0;
  const totalInvoices = revenue?.reduce((s, d) => s + d.totalInvoices, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Reportes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Análisis financiero e inventario</p>
        </div>
        {tab === "revenue" && (
          <button
            onClick={async () => {
              const blob = await reportsApi.downloadRevenuePdf(selectedDate);
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `reporte-ingresos-${selectedDate}.pdf`; a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-ink text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            PDF
          </button>
        )}
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-800">
        {([["revenue", "Ingresos"], ["receivables", "Cuentas por Cobrar"], ["inventory", "Inventario"], ["analytics", "Análiticas"]] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? "border-brand-500 text-ink" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "revenue" && (
        <motion.div key="revenue" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          {/* Date selector */}
          <div className="flex items-center gap-3">
            <input type="date" className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
              <p className="text-xs text-slate-500 mb-1">Ingresos Totales</p>
              <p className="text-2xl font-bold text-emerald-400">{fmt(totalRevenue)}</p>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
              <p className="text-xs text-slate-500 mb-1">Total Facturas</p>
              <p className="text-2xl font-bold text-ink">{totalInvoices}</p>
            </div>
          </div>

          {/* Daily table */}
          <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
            {revLoading ? <div className="flex items-center justify-center py-12"><span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
              : !revenue || revenue.length === 0 ? <div className="flex items-center justify-center py-12"><p className="text-slate-400 text-sm">Sin datos para el período</p></div>
              : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-800">
                      {["Fecha", "Total", "Efectivo", "Tarjeta", "Transferencia", "Seguro", "Facturas", "Pagadas"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {revenue.map((d) => (
                      <tr key={d.date} className="border-b border-surface-800 last:border-0 hover:bg-surface-800/30 transition-colors">
                        <td className="px-4 py-3 text-slate-300">{formatDate(d.date)}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-400">{fmt(d.totalRevenue)}</td>
                        <td className="px-4 py-3 text-slate-400">{fmt(d.cashRevenue)}</td>
                        <td className="px-4 py-3 text-slate-400">{fmt(d.cardRevenue)}</td>
                        <td className="px-4 py-3 text-slate-400">{fmt(d.transferRevenue)}</td>
                        <td className="px-4 py-3 text-slate-400">{fmt(d.insuranceRevenue)}</td>
                        <td className="px-4 py-3 text-slate-400">{d.totalInvoices}</td>
                        <td className="px-4 py-3 text-slate-400">{d.paidInvoices}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </motion.div>
      )}

      {tab === "receivables" && (
        <motion.div key="receivables" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
          {recLoading ? <div className="flex items-center justify-center py-12"><span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
            : !receivables || receivables.length === 0 ? <div className="flex items-center justify-center py-12"><p className="text-slate-400 text-sm">Sin cuentas pendientes</p></div>
            : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    {["Factura", "Paciente", "Saldo", "Fecha Factura", "Días", "Antigüedad"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {receivables.map((r) => (
                    <tr key={r.invoiceId} className="border-b border-surface-800 last:border-0 hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3 text-slate-300 font-mono text-xs">{r.invoiceNumber}</td>
                      <td className="px-4 py-3 text-ink">{r.patientName}</td>
                      <td className="px-4 py-3 font-semibold text-red-400">{fmt(r.balanceDue)}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(r.invoiceDate)}</td>
                      <td className="px-4 py-3 text-slate-400">{r.daysOutstanding}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${AGING_COLORS[r.agingBucket] ?? "bg-slate-500/15 text-slate-400"}`}>
                          {r.agingBucket} días
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </motion.div>
      )}

      {tab === "inventory" && (
        <motion.div key="inventory" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
          {invLoading ? <div className="flex items-center justify-center py-12"><span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
            : !invReport || invReport.length === 0 ? <div className="flex items-center justify-center py-12"><p className="text-slate-400 text-sm">Sin datos</p></div>
            : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    {["Medicamento", "Stock", "Mín.", "Precio", "Estado"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invReport.map((m) => (
                    <tr key={m.id} className="border-b border-surface-800 last:border-0 hover:bg-surface-800/30">
                      <td className="px-4 py-3">
                        <p className="text-ink font-medium">{m.genericName}</p>
                        {m.brandName && <p className="text-xs text-slate-500">{m.brandName}</p>}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${m.isOutOfStock ? "text-red-400" : m.isLowStock ? "text-amber-400" : "text-ink"}`}>{m.currentStock}</td>
                      <td className="px-4 py-3 text-slate-500">{m.minimumStockThreshold}</td>
                      <td className="px-4 py-3 text-slate-300">{fmt(m.salePrice)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {m.isOutOfStock && <span className="text-xs bg-red-500/15 text-red-400 rounded-full px-2 py-0.5">Sin stock</span>}
                          {!m.isOutOfStock && m.isLowStock && <span className="text-xs bg-amber-500/15 text-amber-400 rounded-full px-2 py-0.5">Bajo</span>}
                          {m.isExpired && <span className="text-xs bg-red-500/15 text-red-400 rounded-full px-2 py-0.5">Vencido</span>}
                          {m.isExpiringSoon && !m.isExpired && <span className="text-xs bg-orange-500/15 text-orange-400 rounded-full px-2 py-0.5">Próx. vencer</span>}
                          {!m.isOutOfStock && !m.isLowStock && !m.isExpired && !m.isExpiringSoon && <span className="text-xs bg-emerald-500/15 text-emerald-400 rounded-full px-2 py-0.5">Normal</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </motion.div>
      )}

      {tab === "analytics" && <AnalyticsPanel />}
    </div>
  );
}
