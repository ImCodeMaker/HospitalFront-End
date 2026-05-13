import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { auditApi, type AuditLogQuery } from "@/api/audit";

const INPUT = "bg-surface-100 border border-surface-700/60 rounded-lg px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500 w-full";
const LABEL = "block text-xs font-medium text-slate-400 mb-1";

const ACTION_COLORS: Record<string, string> = {
  INSERT: "bg-emerald-500/15 text-emerald-400",
  UPDATE: "bg-blue-500/15 text-blue-400",
  DELETE: "bg-red-500/15 text-red-400",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-DO", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function tryParseJson(value?: string): unknown {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return value; }
}

export default function AuditPage() {
  const [filters, setFilters] = useState<AuditLogQuery>({ page: 1, pageSize: 50 });
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["audit", filters],
    queryFn: () => auditApi.list(filters),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (filters.pageSize ?? 50)));

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-ink tracking-tight">Auditoría</h1>
        <p className="text-sm text-ink/60 mt-1">Registro completo de cambios en el sistema</p>
      </motion.div>

      <div className="bg-white border border-surface-700/40 rounded-2xl shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_12px_rgba(15,15,15,0.04)] p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className={LABEL}>Tabla</label>
          <input className={INPUT} placeholder="e.g. patients"
            value={filters.tableName ?? ""}
            onChange={(e) => setFilters((p) => ({ ...p, tableName: e.target.value || undefined, page: 1 }))} />
        </div>
        <div>
          <label className={LABEL}>ID del registro</label>
          <input className={INPUT} placeholder="UUID"
            value={filters.recordId ?? ""}
            onChange={(e) => setFilters((p) => ({ ...p, recordId: e.target.value || undefined, page: 1 }))} />
        </div>
        <div>
          <label className={LABEL}>Desde</label>
          <input type="date" className={INPUT}
            value={filters.from?.slice(0, 10) ?? ""}
            onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value ? `${e.target.value}T00:00:00Z` : undefined, page: 1 }))} />
        </div>
        <div>
          <label className={LABEL}>Hasta</label>
          <input type="date" className={INPUT}
            value={filters.to?.slice(0, 10) ?? ""}
            onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value ? `${e.target.value}T23:59:59Z` : undefined, page: 1 }))} />
        </div>
      </div>

      <div className="bg-white border border-surface-700/40 rounded-2xl shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_12px_rgba(15,15,15,0.04)] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><span className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center py-20"><p className="text-slate-400 text-sm">Sin registros</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800">
                {["Acción", "Tabla", "Registro", "Usuario", "IP", "Fecha", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-ink/50 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((log) => {
                const isOpen = expanded === log.id;
                return (
                  <Fragment key={log.id}>
                    <tr className="border-b border-surface-800 hover:bg-surface-800/30 transition-colors cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : log.id)}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-slate-500/15 text-slate-400"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink font-medium">{log.tableName}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{log.recordId.slice(0, 8)}…</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{log.changedBy ? log.changedBy.slice(0, 8) + "…" : "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{log.ipAddress ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDateTime(log.changedAt)}</td>
                      <td className="px-4 py-3 text-brand-400 text-xs">{isOpen ? "▼" : "▶"}</td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-surface-800 bg-surface-950">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 mb-2">ANTES</p>
                              <pre className="bg-surface-900 border border-surface-800 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(tryParseJson(log.oldValues), null, 2) || "—"}
                              </pre>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 mb-2">DESPUÉS</p>
                              <pre className="bg-surface-900 border border-surface-800 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(tryParseJson(log.newValues), null, 2) || "—"}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Página {filters.page ?? 1} de {totalPages} · {total} registros</span>
          <div className="flex gap-2">
            <button disabled={(filters.page ?? 1) <= 1}
              onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
              className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 disabled:opacity-30">Anterior</button>
            <button disabled={(filters.page ?? 1) >= totalPages}
              onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
              className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 disabled:opacity-30">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}
