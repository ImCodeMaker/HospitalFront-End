import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { inventoryApi } from "@/api/inventory";
import { Modal } from "@/components/ui/Modal";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import type { CreateMedicationRequest, Presentation, StockTransactionType } from "@/types/inventory";

const INPUT = "bg-surface-100 border border-surface-700/60 rounded-lg px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500 w-full";
const SELECT = INPUT + " appearance-none cursor-pointer";
const LABEL = "block text-xs font-medium text-slate-400 mb-1";

const PRESENTATION_LABELS: Record<Presentation, string> = {
  Tablet: "Tableta", Capsule: "Cápsula", Syrup: "Jarabe", Injection: "Inyección",
  Cream: "Crema", Drops: "Gotas", Inhaler: "Inhalador", Patch: "Parche",
  Suppository: "Supositorio", Other: "Otro",
};

function fmt(v: number) {
  return v.toLocaleString("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 });
}

const INITIAL_FORM: CreateMedicationRequest = {
  genericName: "", presentation: "Tablet", minimumStockThreshold: 10, currentStock: 0, salePrice: 0,
};

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState<string | null>(null);
  const [form, setForm] = useState<CreateMedicationRequest>(INITIAL_FORM);
  const [stockTxForm, setStockTxForm] = useState<{ type: StockTransactionType; quantity: number; notes: string }>({
    type: "Purchase", quantity: 0, notes: "",
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["medications", debouncedSearch, lowStockOnly, page],
    queryFn: () => inventoryApi.list({ search: debouncedSearch, lowStockOnly, page, pageSize: 20 }),
    placeholderData: (prev) => prev,
  });

  const createMutation = useMutation({
    mutationFn: inventoryApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["medications"] }); setShowCreateModal(false); setForm(INITIAL_FORM); },
  });

  const stockMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { type: StockTransactionType; quantity: number; notes?: string } }) =>
      inventoryApi.stockTransaction(id, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["medications"] }); setShowStockModal(null); },
  });

  const medications = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const set = <K extends keyof CreateMedicationRequest>(k: K, v: CreateMedicationRequest[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Inventario</h1>
          <p className="text-sm text-ink/60 mt-1">{totalCount > 0 ? `${totalCount} medicamentos` : "Control de medicamentos"}</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Nuevo Medicamento
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }} className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input className="bg-surface-100 border border-surface-700/60 rounded-lg pl-9 pr-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500 w-full"
            placeholder="Buscar medicamento…" value={search} onChange={(e) => { setSearch(e.target.value); setTimeout(() => setDebouncedSearch(e.target.value), 400); }} />
        </div>
        <button onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${lowStockOnly ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "border-surface-700 text-slate-400 hover:text-ink"}`}>
          Stock bajo
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="bg-white border border-surface-700/40 rounded-2xl shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_12px_rgba(15,15,15,0.04)] overflow-hidden">
        {isError ? (
          <div className="flex items-center justify-center py-16"><p className="text-slate-400">Error al cargar.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800">
                  {["Medicamento", "Presentación", "Stock", "Mín.", "Precio", "Estado", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-ink/50 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={7} />) :
                  medications.length === 0 ? (
                    <tr><td colSpan={7}><div className="flex items-center justify-center py-16"><p className="text-slate-400">Sin medicamentos</p></div></td></tr>
                  ) : medications.map((m) => (
                    <tr key={m.id} className="border-b border-surface-800 last:border-0 hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{m.genericName}</p>
                        {m.brandName && <p className="text-xs text-slate-500">{m.brandName}</p>}
                        {m.concentration && <p className="text-xs text-slate-600">{m.concentration}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{PRESENTATION_LABELS[m.presentation]}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${m.currentStock === 0 ? "text-red-400" : m.isLowStock ? "text-amber-400" : "text-ink"}`}>
                          {m.currentStock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{m.minimumStockThreshold}</td>
                      <td className="px-4 py-3 text-slate-300">{fmt(m.salePrice)}</td>
                      <td className="px-4 py-3">
                        {m.currentStock === 0 ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-500/15 text-red-400">Sin Stock</span>
                        ) : m.isLowStock ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/15 text-amber-400">Stock Bajo</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-500/15 text-emerald-400">Normal</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setShowStockModal(m.id); setStockTxForm({ type: "Purchase", quantity: 0, notes: "" }); }}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-brand-400 hover:bg-brand-500/10 transition-colors">
                          Ajustar Stock
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {!isLoading && totalCount > 0 && <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={20} onPageChange={setPage} />}

      {/* Create Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuevo Medicamento" maxWidth="max-w-lg">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className={LABEL}>Nombre genérico *</label><input className={INPUT} value={form.genericName} onChange={(e) => set("genericName", e.target.value)} required /></div>
            <div><label className={LABEL}>Nombre comercial</label><input className={INPUT} value={form.brandName ?? ""} onChange={(e) => set("brandName", e.target.value || undefined)} /></div>
            <div>
              <label className={LABEL}>Presentación *</label>
              <select className={SELECT} value={form.presentation} onChange={(e) => set("presentation", e.target.value as Presentation)} required>
                {(Object.keys(PRESENTATION_LABELS) as Presentation[]).map((p) => <option key={p} value={p}>{PRESENTATION_LABELS[p]}</option>)}
              </select>
            </div>
            <div><label className={LABEL}>Concentración</label><input className={INPUT} value={form.concentration ?? ""} onChange={(e) => set("concentration", e.target.value || undefined)} placeholder="500mg" /></div>
            <div><label className={LABEL}>Ubicación</label><input className={INPUT} value={form.storageLocation ?? ""} onChange={(e) => set("storageLocation", e.target.value || undefined)} /></div>
            <div><label className={LABEL}>Stock inicial *</label><input type="number" min={0} className={INPUT} value={form.currentStock} onChange={(e) => set("currentStock", Number(e.target.value))} required /></div>
            <div><label className={LABEL}>Stock mínimo *</label><input type="number" min={0} className={INPUT} value={form.minimumStockThreshold} onChange={(e) => set("minimumStockThreshold", Number(e.target.value))} required /></div>
            <div><label className={LABEL}>Precio de venta (RD$) *</label><input type="number" min={0} step={0.01} className={INPUT} value={form.salePrice} onChange={(e) => set("salePrice", Number(e.target.value))} required /></div>
            <div><label className={LABEL}>Precio de costo (RD$)</label><input type="number" min={0} step={0.01} className={INPUT} value={form.costPrice ?? ""} onChange={(e) => set("costPrice", e.target.value ? Number(e.target.value) : undefined)} /></div>
          </div>
          {createMutation.isError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al crear.</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-ink hover:bg-surface-800">Cancelar</button>
            <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
              {createMutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Crear
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Transaction Modal */}
      <Modal open={!!showStockModal} onClose={() => setShowStockModal(null)} title="Ajustar Stock" maxWidth="max-w-sm">
        <form onSubmit={(e) => { e.preventDefault(); if (showStockModal) stockMutation.mutate({ id: showStockModal, body: stockTxForm }); }} className="flex flex-col gap-4">
          <div>
            <label className={LABEL}>Tipo de movimiento *</label>
            <select className={SELECT} value={stockTxForm.type} onChange={(e) => setStockTxForm((p) => ({ ...p, type: e.target.value as StockTransactionType }))} required>
              <option value="Purchase">Compra / Entrada</option>
              <option value="Adjustment">Ajuste</option>
              <option value="Expiry">Vencimiento</option>
              <option value="Return">Devolución</option>
            </select>
          </div>
          <div><label className={LABEL}>Cantidad *</label><input type="number" min={1} className={INPUT} value={stockTxForm.quantity || ""} onChange={(e) => setStockTxForm((p) => ({ ...p, quantity: Number(e.target.value) }))} required /></div>
          <div><label className={LABEL}>Notas</label><input className={INPUT} value={stockTxForm.notes} onChange={(e) => setStockTxForm((p) => ({ ...p, notes: e.target.value }))} /></div>
          {stockMutation.isError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al ajustar.</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setShowStockModal(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-ink hover:bg-surface-800">Cancelar</button>
            <button type="submit" disabled={stockMutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
              {stockMutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
