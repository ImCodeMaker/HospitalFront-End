import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { labApi } from "@/api/lab";
import { Modal } from "@/components/ui/Modal";
import { SkeletonRow } from "@/components/ui/Skeleton";
import type { LabOrderStatus, LabPriority, AddLabResultRequest, LabResultFlag } from "@/types/lab";

const INPUT = "bg-surface-100 border border-surface-700/60 rounded-lg px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500 w-full";
const LABEL = "block text-xs font-medium text-slate-400 mb-1";

const PRIORITY_COLORS: Record<LabPriority, string> = {
  Routine: "bg-slate-500/15 text-slate-400",
  Urgent: "bg-amber-500/15 text-amber-400",
  Stat: "bg-red-500/15 text-red-400",
};
const STATUS_COLORS: Record<LabOrderStatus, string> = {
  Pending: "bg-blue-500/15 text-blue-400",
  InProgress: "bg-brand-500/15 text-brand-400",
  Completed: "bg-emerald-500/15 text-emerald-400",
  Cancelled: "bg-slate-500/15 text-slate-400",
};
const STATUS_LABELS: Record<LabOrderStatus, string> = {
  Pending: "Pendiente", InProgress: "En Proceso", Completed: "Completado", Cancelled: "Cancelado",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-DO", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function AddResultForm({ orderId, onSuccess }: { orderId: string; onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AddLabResultRequest>({ testName: "", flag: "Normal" });
  const mutation = useMutation({
    mutationFn: (body: AddLabResultRequest) => labApi.addResult(orderId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-orders"] });
      queryClient.invalidateQueries({ queryKey: ["lab-results", orderId] });
      onSuccess();
    },
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="flex flex-col gap-3">
      <div>
        <label className={LABEL}>Nombre del examen *</label>
        <input className={INPUT} value={form.testName} onChange={(e) => setForm((p) => ({ ...p, testName: e.target.value }))} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={LABEL}>Resultado</label><input className={INPUT} value={form.value ?? ""} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value || undefined }))} /></div>
        <div><label className={LABEL}>Unidad</label><input className={INPUT} value={form.unit ?? ""} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value || undefined }))} placeholder="mg/dL…" /></div>
        <div className="col-span-2"><label className={LABEL}>Rango de referencia</label><input className={INPUT} value={form.referenceRange ?? ""} onChange={(e) => setForm((p) => ({ ...p, referenceRange: e.target.value || undefined }))} placeholder="70-100…" /></div>
      </div>
      <div>
        <label className={LABEL}>Indicador</label>
        <select className={INPUT + " appearance-none cursor-pointer"} value={form.flag} onChange={(e) => setForm((p) => ({ ...p, flag: e.target.value as LabResultFlag }))}>
          <option value="Normal">Normal</option>
          <option value="Low">Bajo</option>
          <option value="High">Alto</option>
          <option value="Critical">Crítico</option>
        </select>
      </div>
      <div><label className={LABEL}>Notas</label><input className={INPUT} value={form.notes ?? ""} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value || undefined }))} /></div>
      {mutation.isError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al guardar.</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
          {mutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Guardar Resultado
        </button>
      </div>
    </form>
  );
}

export default function LabPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<LabOrderStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<LabPriority | "">("");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ["lab-orders", statusFilter, priorityFilter],
    queryFn: () => labApi.list({ status: statusFilter || undefined, priority: priorityFilter || undefined }),
    refetchInterval: 30_000,
  });

  const { data: results } = useQuery({
    queryKey: ["lab-results", selectedOrder],
    queryFn: () => labApi.getResults(selectedOrder!),
    enabled: !!selectedOrder,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LabOrderStatus }) => labApi.patchStatus(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lab-orders"] }),
  });

  const labOrders = orders ?? [];

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Laboratorio</h1>
          <p className="text-sm text-ink/60 mt-1">{labOrders.length > 0 ? `${labOrders.length} órdenes` : "Gestión de exámenes"}</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }} className="flex gap-3 flex-wrap">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LabOrderStatus | "")}
          className="bg-surface-100 border border-surface-700/60 rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none appearance-none cursor-pointer">
          <option value="">Todos los estados</option>
          <option value="Pending">Pendiente</option>
          <option value="InProgress">En Proceso</option>
          <option value="Completed">Completado</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as LabPriority | "")}
          className="bg-surface-100 border border-surface-700/60 rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none appearance-none cursor-pointer">
          <option value="">Todas las prioridades</option>
          <option value="Routine">Rutina</option>
          <option value="Urgent">Urgente</option>
          <option value="Stat">STAT</option>
        </select>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Orders list */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="lg:col-span-3 bg-white border border-surface-700/40 rounded-2xl shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_12px_rgba(15,15,15,0.04)] overflow-hidden">
          {isError ? (
            <div className="flex items-center justify-center py-16"><p className="text-slate-400">Error al cargar.</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800">
                  {["Examen", "Categoría", "Prioridad", "Estado", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-ink/50 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />) :
                  labOrders.length === 0 ? (
                    <tr><td colSpan={5}><div className="flex items-center justify-center py-16"><p className="text-slate-400">Sin órdenes</p></div></td></tr>
                  ) : labOrders.map((o) => (
                    <tr key={o.id} onClick={() => setSelectedOrder(o.id)}
                      className={`border-b border-surface-800 last:border-0 transition-colors cursor-pointer ${selectedOrder === o.id ? "bg-brand-600/10" : "hover:bg-surface-800/50"}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{o.testName}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(o.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{o.testCategory ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[o.priority]}`}>
                          {o.priority === "Routine" ? "Rutina" : o.priority === "Urgent" ? "Urgente" : "STAT"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                      </td>
                      <td className="px-4 py-3">
                        {o.status === "Pending" && (
                          <button onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ id: o.id, status: "InProgress" }); }}
                            className="px-2 py-1 rounded text-xs text-brand-400 hover:bg-brand-500/10">Iniciar</button>
                        )}
                        {o.status === "InProgress" && (
                          <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(o.id); setShowResultModal(true); }}
                            className="px-2 py-1 rounded text-xs text-emerald-400 hover:bg-emerald-500/10">Resultado</button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </motion.div>

        {/* Results panel */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          className="lg:col-span-2 bg-white border border-surface-700/40 rounded-2xl shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_12px_rgba(15,15,15,0.04)] p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Resultados</h2>
          {!selectedOrder ? (
            <p className="text-slate-500 text-sm">Selecciona una orden</p>
          ) : !results ? (
            <div className="flex items-center justify-center py-8"><span className="w-5 h-5 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
          ) : results.length === 0 ? (
            <p className="text-slate-500 text-sm">Sin resultados aún</p>
          ) : (
            <div className="flex flex-col gap-3">
              {results.map((r) => (
                <div key={r.id} className={`rounded-xl p-3 border ${r.flag === "Critical" ? "border-red-500/30 bg-red-500/5" : "border-surface-700 bg-surface-800"}`}>
                  {r.flag === "Critical" && <p className="text-xs font-semibold text-red-400 mb-1">⚠ CRÍTICO</p>}
                  <p className="text-xs text-slate-500 mb-1">{r.testName}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-ink">{r.value ?? "—"}</span>
                    {r.unit && <span className="text-sm text-slate-500">{r.unit}</span>}
                  </div>
                  {r.referenceRange && <p className="text-xs text-slate-500 mt-0.5">Ref: {r.referenceRange}</p>}
                  {r.notes && <p className="text-xs text-slate-400 mt-1">{r.notes}</p>}
                  {r.flag !== "Normal" && (
                    <span className={`inline-block mt-1 text-xs rounded-full px-2 py-0.5 ${r.flag === "High" ? "bg-amber-500/15 text-amber-400" : r.flag === "Low" ? "bg-blue-500/15 text-blue-400" : "bg-red-500/15 text-red-400"}`}>
                      {r.flag === "High" ? "Alto" : r.flag === "Low" ? "Bajo" : "Crítico"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <Modal open={showResultModal} onClose={() => setShowResultModal(false)} title="Registrar Resultado" maxWidth="max-w-md">
        {selectedOrder && (
          <AddResultForm orderId={selectedOrder} onSuccess={() => setShowResultModal(false)} />
        )}
      </Modal>
    </div>
  );
}
