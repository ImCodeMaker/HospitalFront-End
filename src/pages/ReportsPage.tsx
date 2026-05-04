import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { reportsApi } from "@/api/reports";

type Tab = "revenue" | "receivables" | "inventory";

function fmt(v: number) { return v.toLocaleString("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }); }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString("es-DO", { year: "numeric", month: "short", day: "numeric" }); }

const AGING_COLORS: Record<string, string> = {
  "0-30": "bg-emerald-500/15 text-emerald-400",
  "31-60": "bg-amber-500/15 text-amber-400",
  "61-90": "bg-orange-500/15 text-orange-400",
  "90+": "bg-red-500/15 text-red-400",
};

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("revenue");
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: revenueRaw, isLoading: revLoading } = useQuery({
    queryKey: ["revenue", selectedDate],
    queryFn: () => reportsApi.dailyRevenue(selectedDate),
    enabled: tab === "revenue",
  });
  const revenue = revenueRaw ? [revenueRaw] : undefined;

  const { data: receivables, isLoading: recLoading } = useQuery({
    queryKey: ["receivables"],
    queryFn: reportsApi.accountsReceivable,
    enabled: tab === "receivables",
  });

  const { data: invReport, isLoading: invLoading } = useQuery({
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
          <h1 className="text-2xl font-bold text-white">Reportes</h1>
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
            className="px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            PDF
          </button>
        )}
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-800">
        {([["revenue", "Ingresos"], ["receivables", "Cuentas por Cobrar"], ["inventory", "Inventario"]] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? "border-brand-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "revenue" && (
        <motion.div key="revenue" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          {/* Date selector */}
          <div className="flex items-center gap-3">
            <input type="date" className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
              <p className="text-xs text-slate-500 mb-1">Ingresos Totales</p>
              <p className="text-2xl font-bold text-emerald-400">{fmt(totalRevenue)}</p>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
              <p className="text-xs text-slate-500 mb-1">Total Facturas</p>
              <p className="text-2xl font-bold text-white">{totalInvoices}</p>
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
                      <td className="px-4 py-3 text-white">{r.patientName}</td>
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
                        <p className="text-white font-medium">{m.genericName}</p>
                        {m.brandName && <p className="text-xs text-slate-500">{m.brandName}</p>}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${m.isOutOfStock ? "text-red-400" : m.isLowStock ? "text-amber-400" : "text-white"}`}>{m.currentStock}</td>
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
    </div>
  );
}
