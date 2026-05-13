import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { billingApi } from "@/api/billing";
import { MoneyDisplay, formatRD } from "@/components/ui/MoneyDisplay";
import type {
  InvoiceDto,
  InvoiceStatus,
  PaymentMethod,
  LineItemType,
  CreateLineItemRequest,
  InvoiceListParams,
  NcfType,
} from "@/types/billing";
import { NCF_TYPE_LABEL } from "@/types/billing";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_TABS: { value: InvoiceStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "AwaitingPayment", label: "Pendiente" },
  { value: "PartiallyPaid", label: "Parcial" },
  { value: "PendingInsurance", label: "Seguro" },
  { value: "Paid", label: "Pagado" },
  { value: "RequiresCollection", label: "Cobro" },
  { value: "Cancelled", label: "Cancelado" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "Cash", label: "Efectivo" },
  { value: "CreditCard", label: "Tarjeta de Crédito" },
  { value: "DebitCard", label: "Tarjeta de Débito" },
  { value: "BankTransfer", label: "Transferencia" },
  { value: "Insurance", label: "Seguro" },
  { value: "Mixed", label: "Mixto" },
];

const LINE_ITEM_TYPES: { value: LineItemType; label: string }[] = [
  { value: "Consultation", label: "Consulta" },
  { value: "Procedure", label: "Procedimiento" },
  { value: "Lab", label: "Laboratorio" },
  { value: "Medication", label: "Medicamento" },
  { value: "Other", label: "Otro" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status: InvoiceStatus) {
  const map: Record<InvoiceStatus, { cls: string; label: string }> = {
    AwaitingPayment: {
      cls: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
      label: "Pendiente",
    },
    PartiallyPaid: {
      cls: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
      label: "Parcial",
    },
    Paid: {
      cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
      label: "Pagado",
    },
    Cancelled: {
      cls: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
      label: "Cancelado",
    },
    PendingInsurance: {
      cls: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
      label: "En Seguro",
    },
    RequiresCollection: {
      cls: "bg-red-500/15 text-red-400 border border-red-500/30",
      label: "Por Cobrar",
    },
  };
  const { cls, label } = map[status] ?? {
    cls: "bg-slate-500/15 text-slate-400",
    label: status,
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner({ small = false }: { small?: boolean }) {
  const sz = small ? "w-3.5 h-3.5 border" : "w-5 h-5 border-2";
  return (
    <span
      className={`${sz} border-brand-500/30 border-t-brand-500 rounded-full animate-spin inline-block`}
    />
  );
}

// ---------------------------------------------------------------------------
// Input helpers
// ---------------------------------------------------------------------------

const inputCls =
  "bg-surface-100 border border-surface-700/60 rounded-lg px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none w-full placeholder:text-slate-500";

const labelCls = "block text-xs text-slate-400 mb-1";

// ---------------------------------------------------------------------------
// Stats bar
// ---------------------------------------------------------------------------

function StatsBar({ invoices }: { invoices: InvoiceDto[] }) {
  const today = new Date().toDateString();

  const todayInvoices = invoices.filter(
    (inv) => new Date(inv.createdAt).toDateString() === today
  );

  const totalCollectedToday = todayInvoices.reduce(
    (sum, inv) => sum + inv.paidAmount,
    0
  );

  const totalPendingBalance = invoices
    .filter((inv) => inv.status !== "Paid" && inv.status !== "Cancelled")
    .reduce((sum, inv) => sum + inv.balanceDue, 0);

  const stats = [
    {
      label: "Facturas Hoy",
      value: todayInvoices.length.toString(),
      sub: "facturas emitidas",
    },
    {
      label: "Cobrado Hoy",
      value: formatRD(totalCollectedToday),
      sub: "ingresos del día",
    },
    {
      label: "Balance Pendiente",
      value: formatRD(totalPendingBalance),
      sub: "por cobrar en total",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white border border-surface-700/40 rounded-2xl shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_12px_rgba(15,15,15,0.04)] p-4"
        >
          <p className="text-xs text-slate-400 mb-1">{s.label}</p>
          <p className="text-xl font-bold text-ink truncate">{s.value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invoice Detail Panel
// ---------------------------------------------------------------------------

interface InvoiceDetailProps {
  invoice: InvoiceDto;
  onClose: () => void;
  onRefresh: () => void;
}

function InvoiceDetailPanel({ invoice, onClose, onRefresh }: InvoiceDetailProps) {
  const qc = useQueryClient();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);

  const submitClaim = useMutation({
    mutationFn: () => billingApi.submitInsuranceClaim(invoice.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      onRefresh();
    },
  });

  const downloadPdf = useCallback(async () => {
    const blob = await billingApi.downloadPdf(invoice.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `factura-${invoice.invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [invoice.id, invoice.invoiceNumber]);

  const canSendInsurance =
    (invoice.status === "AwaitingPayment" || invoice.status === "PartiallyPaid") &&
    invoice.insuranceCoverageAmount > 0;

  const canResolve = invoice.status === "PendingInsurance";

  return (
    <motion.div
      className="bg-white border border-surface-700/40 rounded-2xl shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_12px_rgba(15,15,15,0.04)] overflow-hidden"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-ink">
              {invoice.invoiceNumber}
            </span>
            {statusBadge(invoice.status)}
          </div>
          {invoice.ncf && (
            <span className="text-xs text-slate-500">
              NCF <span className="font-mono text-slate-300">{invoice.ncf}</span> ({invoice.ncfType ? NCF_TYPE_LABEL[invoice.ncfType] : "—"})
            </span>
          )}
          {invoice.insuranceDenialReason && (
            <span className="text-xs text-rose-500">
              Aseguradora denegó: {invoice.insuranceDenialReason}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadPdf}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-300 bg-surface-100 border border-surface-700/60 hover:bg-surface-700 transition flex items-center gap-1.5"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-3.5 h-3.5"
            >
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            PDF
          </button>
          {canSendInsurance && (
            <button
              onClick={() => submitClaim.mutate()}
              disabled={submitClaim.isPending}
              className="px-3 py-1.5 rounded-lg text-xs text-purple-300 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitClaim.isPending && <Spinner small />}
              Enviar a Seguro
            </button>
          )}
          {canResolve && (
            <button
              onClick={() => setShowResolveModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs text-white bg-brand-600 hover:bg-brand-500 transition"
            >
              Resolver Reclamo
            </button>
          )}
          {invoice.status !== "Paid" && invoice.status !== "Cancelled" && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs text-white bg-brand-600 hover:bg-brand-500 transition"
            >
              Registrar Pago
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-ink hover:bg-surface-800 transition"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-5 grid grid-cols-2 gap-6">
        {/* Left: amounts summary */}
        <div className="space-y-4">
          <div>
            <p className={labelCls}>Paciente</p>
            <p className="text-sm text-ink font-medium">{invoice.patientName}</p>
          </div>
          <div className="bg-surface-800/60 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Subtotal</span>
              <MoneyDisplay amount={invoice.subtotal} className="text-ink" />
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Descuento</span>
                <MoneyDisplay
                  amount={-invoice.discountAmount}
                  className="text-red-400"
                />
              </div>
            )}
            {invoice.taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">ITBIS</span>
                <MoneyDisplay amount={invoice.taxAmount} className="text-ink" />
              </div>
            )}
            {invoice.insuranceCoverageAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Cobertura Seguro</span>
                <MoneyDisplay
                  amount={-invoice.insuranceCoverageAmount}
                  className="text-purple-400"
                />
              </div>
            )}
            <div className="border-t border-surface-700 pt-2 flex justify-between font-semibold">
              <span className="text-slate-300">Total</span>
              <MoneyDisplay amount={invoice.totalAmount} className="text-ink" />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Responsabilidad paciente</span>
              <MoneyDisplay
                amount={invoice.patientResponsibilityAmount}
                className="text-ink"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Pagado</span>
              <MoneyDisplay
                amount={invoice.paidAmount}
                className="text-emerald-400"
              />
            </div>
            <div className="border-t border-surface-700 pt-2 flex justify-between font-bold">
              <span className="text-ink">Balance</span>
              <MoneyDisplay
                amount={invoice.balanceDue}
                className={invoice.balanceDue > 0 ? "text-amber-400" : "text-emerald-400"}
              />
            </div>
          </div>
          {invoice.notes && (
            <div>
              <p className={labelCls}>Notas</p>
              <p className="text-sm text-slate-300 bg-surface-800/60 rounded-lg p-3">
                {invoice.notes}
              </p>
            </div>
          )}
        </div>

        {/* Right: line items + payments */}
        <div className="space-y-4">
          {/* Line items */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Líneas de factura
            </p>
            <div className="rounded-xl border border-surface-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-800/80 text-slate-400 text-xs">
                    <th className="px-3 py-2 text-left font-medium">Descripción</th>
                    <th className="px-3 py-2 text-right font-medium">Cant.</th>
                    <th className="px-3 py-2 text-right font-medium">Precio</th>
                    <th className="px-3 py-2 text-right font-medium">Paciente</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-surface-800 hover:bg-surface-800/40"
                    >
                      <td className="px-3 py-2.5 text-ink">
                        <div>{item.description}</div>
                        <div className="text-xs text-slate-500">{item.type}</div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-300 text-right">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <MoneyDisplay
                          amount={item.unitPrice}
                          className="text-slate-300"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <MoneyDisplay
                          amount={item.patientAmount}
                          className="text-ink font-medium"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments */}
          {invoice.payments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Historial de pagos
              </p>
              <div className="rounded-xl border border-surface-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-800/80 text-slate-400 text-xs">
                      <th className="px-3 py-2 text-left font-medium">Fecha</th>
                      <th className="px-3 py-2 text-left font-medium">Método</th>
                      <th className="px-3 py-2 text-right font-medium">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((p) => (
                      <tr
                        key={p.id}
                        className="border-t border-surface-800 hover:bg-surface-800/40"
                      >
                        <td className="px-3 py-2.5 text-slate-300">
                          {fmtDate(p.paymentDate)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-300">
                          <div>{p.method}</div>
                          {p.referenceNumber && (
                            <div className="text-xs text-slate-500">
                              Ref: {p.referenceNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <MoneyDisplay
                            amount={p.amount}
                            className="text-emerald-400 font-medium"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            qc.invalidateQueries({ queryKey: ["invoices"] });
            onRefresh();
          }}
        />
      )}

      {showResolveModal && (
        <ResolveClaimModal
          invoice={invoice}
          onClose={() => setShowResolveModal(false)}
          onSuccess={() => {
            setShowResolveModal(false);
            qc.invalidateQueries({ queryKey: ["invoices"] });
            onRefresh();
          }}
        />
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Payment Modal
// ---------------------------------------------------------------------------

interface PaymentModalProps {
  invoice: InvoiceDto;
  onClose: () => void;
  onSuccess: () => void;
}

function PaymentModal({ invoice, onClose, onSuccess }: PaymentModalProps) {
  const [amount, setAmount] = useState(invoice.balanceDue.toFixed(2));
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      billingApi.processPayment(invoice.id, {
        amount: parseFloat(amount),
        method,
        referenceNumber: reference || undefined,
        notes: notes || undefined,
      }),
    onSuccess,
    onError: () => setError("Error al registrar el pago. Intente de nuevo."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError("El monto debe ser mayor a 0.");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <motion.div
        className="bg-white border border-surface-700/40 rounded-2xl shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_12px_rgba(15,15,15,0.04)] p-6 w-full max-w-md mx-4 shadow-2xl"
        initial={{ scale: 0.95, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-ink">Registrar Pago</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-ink hover:bg-surface-800 transition"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="bg-surface-800/60 rounded-xl p-3 mb-5 flex justify-between text-sm">
          <span className="text-slate-400">Balance pendiente</span>
          <MoneyDisplay
            amount={invoice.balanceDue}
            className="text-amber-400 font-semibold"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Monto</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Método de pago</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className={inputCls}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Número de referencia (opcional)</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej. TXN-12345"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="Observaciones..."
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm text-slate-300 bg-surface-100 border border-surface-700/60 hover:bg-surface-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutation.isPending && <Spinner small />}
              Registrar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resolve Claim Modal
// ---------------------------------------------------------------------------

interface ResolveClaimModalProps {
  invoice: InvoiceDto;
  onClose: () => void;
  onSuccess: () => void;
}

function ResolveClaimModal({ invoice, onClose, onSuccess }: ResolveClaimModalProps) {
  const [approved, setApproved] = useState(true);
  const [paidAmount, setPaidAmount] = useState(
    invoice.insuranceCoverageAmount.toFixed(2)
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      billingApi.resolveInsuranceClaim(invoice.id, {
        approved,
        paidAmount: approved ? parseFloat(paidAmount) : undefined,
        notes: notes || undefined,
      }),
    onSuccess,
    onError: () => setError("Error al resolver el reclamo. Intente de nuevo."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (approved) {
      const parsed = parseFloat(paidAmount);
      if (isNaN(parsed) || parsed < 0) {
        setError("El monto pagado debe ser un número válido.");
        return;
      }
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <motion.div
        className="bg-white border border-surface-700/40 rounded-2xl shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_12px_rgba(15,15,15,0.04)] p-6 w-full max-w-md mx-4 shadow-2xl"
        initial={{ scale: 0.95, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-ink">
            Resolver Reclamo de Seguro
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-ink hover:bg-surface-800 transition"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="bg-surface-800/60 rounded-xl p-3 mb-5 flex justify-between text-sm">
          <span className="text-slate-400">Cobertura esperada</span>
          <MoneyDisplay
            amount={invoice.insuranceCoverageAmount}
            className="text-purple-400 font-semibold"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Approved toggle */}
          <div>
            <label className={labelCls}>Resultado</label>
            <div className="flex gap-3">
              {[
                { value: true, label: "Aprobado" },
                { value: false, label: "Rechazado" },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setApproved(opt.value)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition border ${
                    approved === opt.value
                      ? opt.value
                        ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-300"
                        : "bg-red-600/20 border-red-500/50 text-red-300"
                      : "bg-surface-800 border-surface-700 text-slate-400 hover:text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {approved && (
            <div>
              <label className={labelCls}>Monto pagado por seguro</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className={inputCls}
                required
              />
            </div>
          )}

          <div>
            <label className={labelCls}>Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={inputCls}
              placeholder="Motivo del rechazo, observaciones..."
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm text-slate-300 bg-surface-100 border border-surface-700/60 hover:bg-surface-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutation.isPending && <Spinner small />}
              Guardar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Invoice Modal
// ---------------------------------------------------------------------------

interface CreateInvoiceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateInvoiceModal({ onClose, onSuccess }: CreateInvoiceModalProps) {
  const qc = useQueryClient();
  const [patientId, setPatientId] = useState("");
  const [consultId, setConsultId] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [ncfType, setNcfType] = useState<NcfType>("Consumo");
  const [error, setError] = useState("");
  const [lineItems, setLineItems] = useState<CreateLineItemRequest[]>([
    { type: "Consultation", description: "", unitPrice: 0, quantity: 1 },
  ]);

  const addLine = () =>
    setLineItems((prev) => [
      ...prev,
      { type: "Consultation", description: "", unitPrice: 0, quantity: 1 },
    ]);

  const removeLine = (idx: number) =>
    setLineItems((prev) => prev.filter((_, i) => i !== idx));

  const updateLine = <K extends keyof CreateLineItemRequest>(
    idx: number,
    key: K,
    value: CreateLineItemRequest[K]
  ) =>
    setLineItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item))
    );

  const mutation = useMutation({
    mutationFn: () =>
      billingApi.createInvoice({
        patientId,
        consultId: consultId || undefined,
        ncfType,
        lineItems,
        discountAmount: parseFloat(discountAmount) || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      onSuccess();
    },
    onError: () => setError("Error al crear la factura. Verifique los datos."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!patientId.trim()) {
      setError("El ID del paciente es requerido.");
      return;
    }
    if (lineItems.some((l) => !l.description.trim() || l.unitPrice <= 0)) {
      setError("Todas las líneas deben tener descripción y precio válido.");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <motion.div
        className="bg-white border border-surface-700/40 rounded-2xl shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_12px_rgba(15,15,15,0.04)] p-6 w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.95, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-ink">Nueva Factura</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-ink hover:bg-surface-800 transition"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>ID del Paciente *</label>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="UUID del paciente"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>ID de Consulta (opcional)</label>
              <input
                type="text"
                value={consultId}
                onChange={(e) => setConsultId(e.target.value)}
                placeholder="UUID de la consulta"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Tipo de NCF (DGII)</label>
            <select
              value={ncfType}
              onChange={(e) => setNcfType(e.target.value as NcfType)}
              className={inputCls + " appearance-none cursor-pointer"}
            >
              {(Object.keys(NCF_TYPE_LABEL) as NcfType[]).map((t) => (
                <option key={t} value={t}>{NCF_TYPE_LABEL[t]}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">El sistema asigna el siguiente número del rango autorizado.</p>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Líneas de factura
              </p>
              <button
                type="button"
                onClick={addLine}
                className="text-xs text-brand-400 hover:text-brand-300 transition flex items-center gap-1"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-3.5 h-3.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Agregar línea
              </button>
            </div>
            <div className="space-y-2">
              {lineItems.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-start bg-surface-800/60 rounded-xl p-3"
                >
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">Tipo</label>
                    <select
                      value={item.type}
                      onChange={(e) =>
                        updateLine(idx, "type", e.target.value as LineItemType)
                      }
                      className={inputCls}
                    >
                      {LINE_ITEM_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-5">
                    <label className="block text-xs text-slate-500 mb-1">
                      Descripción
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        updateLine(idx, "description", e.target.value)
                      }
                      placeholder="Descripción del servicio"
                      className={inputCls}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">Precio</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateLine(idx, "unitPrice", parseFloat(e.target.value) || 0)
                      }
                      className={inputCls}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">Cant.</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLine(
                          idx,
                          "quantity",
                          parseInt(e.target.value) || 1
                        )
                      }
                      className={inputCls}
                      required
                    />
                  </div>
                  <div className="col-span-1 flex items-end justify-center pb-1">
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition mt-5"
                      >
                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-3.5 h-3.5"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Descuento global (RD$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Notas (opcional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones..."
                className={inputCls}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm text-slate-300 bg-surface-100 border border-surface-700/60 hover:bg-surface-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutation.isPending && <Spinner small />}
              Crear Factura
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main BillingPage
// ---------------------------------------------------------------------------

export default function BillingPage() {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "">("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedInvoice, setExpandedInvoice] = useState<InvoiceDto | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);

  const params: InvoiceListParams = {
    status: statusFilter || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    page,
    pageSize: 20,
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["invoices", params],
    queryFn: () => billingApi.listInvoices(params),
  });

  const invoices = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  // Client-side search by patient name or invoice number
  const filtered = search.trim()
    ? invoices.filter(
        (inv) =>
          inv.patientName.toLowerCase().includes(search.toLowerCase()) ||
          inv.invoiceNumber.toLowerCase().includes(search.toLowerCase())
      )
    : invoices;

  const handleRowClick = (inv: InvoiceDto) => {
    if (expandedId === inv.id) {
      setExpandedId(null);
      setExpandedInvoice(null);
    } else {
      setExpandedId(inv.id);
      setExpandedInvoice(inv);
    }
  };

  const handleRefreshExpanded = () => {
    // Refetch list and re-find the expanded invoice with updated data
    refetch().then((res) => {
      if (expandedId && res.data) {
        const updated = res.data.items.find((inv) => inv.id === expandedId);
        if (updated) setExpandedInvoice(updated);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Facturación</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Gestión de facturas e historial de pagos
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-brand-600 hover:bg-brand-500 transition shadow-lg shadow-brand-600/20"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Nueva Factura
        </button>
      </div>

      {/* Stats */}
      {!isLoading && !isError && <StatsBar invoices={invoices} />}

      {/* Filters */}
      <div className="bg-white border border-surface-700/40 rounded-2xl shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_12px_rgba(15,15,15,0.04)] p-4 space-y-4">
        {/* Status tabs */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value as InvoiceStatus | "");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === tab.value
                  ? "bg-brand-600/20 text-brand-400 border border-brand-500/30"
                  : "text-slate-400 hover:text-ink hover:bg-surface-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + dates */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por paciente o # factura..."
              className="bg-surface-100 border border-surface-700/60 rounded-lg pl-9 pr-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none w-full placeholder:text-slate-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Desde</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="bg-surface-100 border border-surface-700/60 rounded-lg px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Hasta</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="bg-surface-100 border border-surface-700/60 rounded-lg px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          {(fromDate || toDate || search) && (
            <button
              onClick={() => { setSearch(""); setFromDate(""); setToDate(""); setPage(1); }}
              className="px-3 py-2.5 rounded-lg text-xs text-slate-400 hover:text-ink bg-surface-100 border border-surface-700/60 hover:bg-surface-700 transition"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-surface-700/40 rounded-2xl shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_12px_rgba(15,15,15,0.04)] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Spinner />
            <span className="text-sm text-slate-400">Cargando facturas...</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-red-400">Error al cargar las facturas.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-lg text-sm text-white bg-brand-600 hover:bg-brand-500 transition"
            >
              Reintentar
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="w-10 h-10 text-slate-700"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm text-slate-500">No se encontraron facturas</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800 text-slate-400 text-xs">
                  <th className="px-4 py-3 text-left font-medium"># Factura</th>
                  <th className="px-4 py-3 text-left font-medium">Paciente</th>
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Resp. Paciente</th>
                  <th className="px-4 py-3 text-right font-medium">Pagado</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-center font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <>
                    <tr
                      key={inv.id}
                      onClick={() => handleRowClick(inv)}
                      className={`border-b border-surface-800/60 cursor-pointer transition-colors ${
                        expandedId === inv.id
                          ? "bg-brand-600/5"
                          : "hover:bg-surface-800/40"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-mono text-brand-400 text-xs">
                            {inv.invoiceNumber}
                          </span>
                          {inv.ncf && (
                            <span className="font-mono text-[10px] text-slate-500 mt-0.5">{inv.ncf}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink font-medium">
                        {inv.patientName}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {fmtDate(inv.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MoneyDisplay
                          amount={inv.totalAmount}
                          className="text-ink"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MoneyDisplay
                          amount={inv.patientResponsibilityAmount}
                          className="text-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MoneyDisplay
                          amount={inv.paidAmount}
                          className="text-emerald-400"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MoneyDisplay
                          amount={inv.balanceDue}
                          className={
                            inv.balanceDue > 0 ? "text-amber-400 font-semibold" : "text-slate-500"
                          }
                        />
                      </td>
                      <td className="px-4 py-3">{statusBadge(inv.status)}</td>
                      <td className="px-4 py-3 text-center">
                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className={`w-4 h-4 text-slate-500 mx-auto transition-transform ${
                            expandedId === inv.id ? "rotate-180" : ""
                          }`}
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </td>
                    </tr>
                    {expandedId === inv.id && expandedInvoice && (
                      <tr key={`${inv.id}-detail`}>
                        <td colSpan={9} className="px-4 py-3 bg-surface-950/50">
                          <AnimatePresence>
                            <InvoiceDetailPanel
                              invoice={expandedInvoice}
                              onClose={() => {
                                setExpandedId(null);
                                setExpandedInvoice(null);
                              }}
                              onRefresh={handleRefreshExpanded}
                            />
                          </AnimatePresence>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-800">
                <p className="text-xs text-slate-500">
                  Página {page} de {totalPages} — {data?.totalCount ?? 0} facturas
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-300 bg-surface-100 border border-surface-700/60 hover:bg-surface-700 transition disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-300 bg-surface-100 border border-surface-700/60 hover:bg-surface-700 transition disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateInvoiceModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
