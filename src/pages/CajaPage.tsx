import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { cajaApi } from "@/api/caja";
import { downloadBlob } from "@/api/pdf";
import { Modal } from "@/components/ui/Modal";
import type { OpenShiftRequest, CloseShiftRequest, CashTransactionRequest, TransactionType } from "@/types/caja";

const INPUT = "bg-surface-100 border border-surface-700/60 rounded-lg px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500 w-full";
const SELECT = INPUT + " appearance-none cursor-pointer";
const LABEL = "block text-xs font-medium text-slate-400 mb-1";

const INCOME_TYPES: TransactionType[] = ["PaymentCash", "PaymentCard", "BankTransfer"];

const TYPE_LABELS: Record<TransactionType, string> = {
  PaymentCash: "Pago Efectivo",
  PaymentCard: "Pago Tarjeta",
  BankTransfer: "Transferencia",
  CashRefund: "Devolución",
  CashAdvance: "Adelanto",
  PettyCashExpense: "Caja Chica",
};

function fmt(v: number) {
  return v.toLocaleString("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 });
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-DO", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CajaPage() {
  const queryClient = useQueryClient();
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [openForm, setOpenForm] = useState<OpenShiftRequest>({ openingBalance: 0 });
  const [closeForm, setCloseForm] = useState<CloseShiftRequest>({ closingBalance: 0 });
  const [txForm, setTxForm] = useState<CashTransactionRequest>({ type: "PaymentCash", amount: 0, description: "" });

  const { data: activeShift, isLoading: shiftLoading } = useQuery({
    queryKey: ["active-shift"],
    queryFn: cajaApi.getActiveShift,
    refetchInterval: 30_000,
  });

  const { data: transactions } = useQuery({
    queryKey: ["shift-transactions", activeShift?.id],
    queryFn: () => cajaApi.listTransactions(activeShift!.id),
    enabled: !!activeShift?.id,
  });

  const openMutation = useMutation({
    mutationFn: cajaApi.openShift,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["active-shift"] }); setShowOpenModal(false); },
  });
  const [lastClosedShiftId, setLastClosedShiftId] = useState<string | null>(null);
  const closeMutation = useMutation({
    mutationFn: (body: CloseShiftRequest) => cajaApi.closeShift(activeShift!.id, body),
    onSuccess: () => {
      setLastClosedShiftId(activeShift!.id);
      queryClient.invalidateQueries({ queryKey: ["active-shift"] });
      setShowCloseModal(false);
    },
  });
  const reportMutation = useMutation({
    mutationFn: (shiftId: string) => cajaApi.downloadReport(shiftId),
    onSuccess: (blob, shiftId) => downloadBlob(blob, `caja-shift-${shiftId}.pdf`),
  });
  const txMutation = useMutation({
    mutationFn: (body: CashTransactionRequest) => cajaApi.createTransaction(activeShift!.id, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shift-transactions", activeShift?.id] }); queryClient.invalidateQueries({ queryKey: ["active-shift"] }); setShowTxModal(false); },
  });

  const txList = transactions ?? [];
  const income = txList.filter((t) => INCOME_TYPES.includes(t.type)).reduce((s, t) => s + t.amount, 0);
  const refunds = txList.filter((t) => t.type === "CashRefund").reduce((s, t) => s + t.amount, 0);
  const expectedBalance = activeShift?.expectedBalance ?? activeShift?.openingBalance ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Caja</h1>
          <p className="text-sm text-ink/60 mt-1">{activeShift ? "Turno activo" : "Sin turno abierto"}</p>
        </div>
        {!activeShift && !shiftLoading && (
          <button onClick={() => setShowOpenModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            Abrir Turno
          </button>
        )}
        {activeShift && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTxModal(true)} className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
              + Transacción
            </button>
            <button onClick={() => { setCloseForm({ closingBalance: expectedBalance }); setShowCloseModal(true); }}
              className="px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-ink text-sm font-medium transition-colors">
              Cerrar Turno
            </button>
          </div>
        )}
      </motion.div>

      {shiftLoading ? (
        <div className="flex items-center justify-center py-20"><span className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
      ) : !activeShift ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center bg-white border border-surface-700/40 rounded-2xl shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_12px_rgba(15,15,15,0.04)] py-20 gap-4">
          <div className="w-16 h-16 rounded-full bg-surface-100 border border-surface-700/60 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-slate-400 font-medium">No hay turno activo</p>
          {lastClosedShiftId && (
            <button onClick={() => reportMutation.mutate(lastClosedShiftId)}
              disabled={reportMutation.isPending}
              className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-ink text-sm font-medium transition-colors disabled:opacity-50">
              {reportMutation.isPending ? "Descargando…" : "↓ Descargar reporte del último turno"}
            </button>
          )}
          <button onClick={() => setShowOpenModal(true)} className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            Abrir Turno Ahora
          </button>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Balance Apertura", value: fmt(activeShift.openingBalance), color: "text-ink" },
              { label: "Ingresos", value: fmt(income), color: "text-emerald-400" },
              { label: "Devoluciones", value: fmt(refunds), color: "text-red-400" },
              { label: "Balance Esperado", value: fmt(expectedBalance), color: "text-brand-400" },
            ].map((k) => (
              <div key={k.label} className="bg-white border border-surface-700/40 rounded-2xl shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_12px_rgba(15,15,15,0.04)] p-4">
                <p className="text-xs text-slate-500 mb-1">{k.label}</p>
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Transaction list */}
          <div className="bg-white border border-surface-700/40 rounded-2xl shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_12px_rgba(15,15,15,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-800">
              <h2 className="text-sm font-semibold text-slate-300">Transacciones del turno</h2>
            </div>
            {txList.length === 0 ? (
              <div className="flex items-center justify-center py-12"><p className="text-slate-400 text-sm">Sin transacciones</p></div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    {["Tipo", "Descripción", "Monto", "Fecha"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-ink/50 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {txList.map((tx) => (
                    <tr key={tx.id} className="border-b border-surface-800 last:border-0">
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${INCOME_TYPES.includes(tx.type) ? "bg-emerald-500/15 text-emerald-400" : tx.type === "CashRefund" ? "bg-red-500/15 text-red-400" : "bg-slate-500/15 text-slate-400"}`}>
                          {TYPE_LABELS[tx.type] ?? tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{tx.description}</td>
                      <td className={`px-4 py-3 font-semibold ${tx.type === "CashRefund" ? "text-red-400" : "text-emerald-400"}`}>
                        {tx.type === "CashRefund" ? "−" : "+"}{fmt(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDateTime(tx.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      )}

      {/* Open Shift Modal */}
      <Modal open={showOpenModal} onClose={() => setShowOpenModal(false)} title="Abrir Turno" maxWidth="max-w-sm">
        <form onSubmit={(e) => { e.preventDefault(); openMutation.mutate(openForm); }} className="flex flex-col gap-4">
          <div><label className={LABEL}>Balance de Apertura (RD$) *</label>
            <input type="number" min={0} step={0.01} className={INPUT} value={openForm.openingBalance} onChange={(e) => setOpenForm((p) => ({ ...p, openingBalance: Number(e.target.value) }))} required /></div>
          {openMutation.isError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al abrir turno.</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setShowOpenModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-ink hover:bg-surface-800">Cancelar</button>
            <button type="submit" disabled={openMutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
              {openMutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Abrir
            </button>
          </div>
        </form>
      </Modal>

      {/* Close Shift Modal */}
      <Modal open={showCloseModal} onClose={() => setShowCloseModal(false)} title="Cerrar Turno" maxWidth="max-w-sm">
        <form onSubmit={(e) => { e.preventDefault(); closeMutation.mutate(closeForm); }} className="flex flex-col gap-4">
          <div><label className={LABEL}>Balance Real al Cierre (RD$) *</label>
            <input type="number" min={0} step={0.01} className={INPUT} value={closeForm.closingBalance} onChange={(e) => setCloseForm((p) => ({ ...p, closingBalance: Number(e.target.value) }))} required /></div>
          {activeShift && (
            <p className="text-xs text-slate-500">
              Balance esperado: <span className="text-ink">{fmt(expectedBalance)}</span>
              {closeForm.closingBalance !== expectedBalance && (
                <span className={closeForm.closingBalance > expectedBalance ? " · text-emerald-400" : " · text-red-400"}>
                  {" "}· Discrepancia: {fmt(closeForm.closingBalance - expectedBalance)}
                </span>
              )}
            </p>
          )}
          <div><label className={LABEL}>Notas</label><input className={INPUT} value={closeForm.notes ?? ""} onChange={(e) => setCloseForm((p) => ({ ...p, notes: e.target.value || undefined }))} /></div>
          {closeMutation.isError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al cerrar turno.</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setShowCloseModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-ink hover:bg-surface-800">Cancelar</button>
            <button type="submit" disabled={closeMutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 flex items-center gap-2">
              {closeMutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Cerrar Turno
            </button>
          </div>
        </form>
      </Modal>

      {/* Transaction Modal */}
      <Modal open={showTxModal} onClose={() => setShowTxModal(false)} title="Nueva Transacción" maxWidth="max-w-sm">
        <form onSubmit={(e) => { e.preventDefault(); txMutation.mutate(txForm); }} className="flex flex-col gap-4">
          <div>
            <label className={LABEL}>Tipo *</label>
            <select className={SELECT} value={txForm.type} onChange={(e) => setTxForm((p) => ({ ...p, type: e.target.value as TransactionType }))} required>
              {(Object.keys(TYPE_LABELS) as TransactionType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div><label className={LABEL}>Monto (RD$) *</label><input type="number" min={0.01} step={0.01} className={INPUT} value={txForm.amount || ""} onChange={(e) => setTxForm((p) => ({ ...p, amount: Number(e.target.value) }))} required /></div>
          <div><label className={LABEL}>Descripción *</label><input className={INPUT} value={txForm.description} onChange={(e) => setTxForm((p) => ({ ...p, description: e.target.value }))} required /></div>
          {txMutation.isError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al registrar.</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setShowTxModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-ink hover:bg-surface-800">Cancelar</button>
            <button type="submit" disabled={txMutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
              {txMutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Registrar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
