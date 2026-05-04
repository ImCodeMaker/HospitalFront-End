import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { consultsApi } from "@/api/consults";
import { prescriptionsApi } from "@/api/prescriptions";
import { labApi } from "@/api/lab";
import { Modal } from "@/components/ui/Modal";
import type { UpdateConsultRequest, ConsultStatus, ConsultDto } from "@/types/consults";
import type { AddPrescriptionRequest } from "@/types/prescriptions";
import type { CreateLabOrderRequest, LabPriority } from "@/types/lab";

const INPUT = "bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500 w-full";
const SELECT = INPUT + " appearance-none cursor-pointer";
const LABEL = "block text-xs font-medium text-slate-400 mb-1";

type Tab = "vitals" | "prescriptions" | "lab" | "images";

const STATUS_COLORS: Record<ConsultStatus, string> = {
  Open: "bg-blue-500/15 text-blue-400",
  InProgress: "bg-brand-500/15 text-brand-400",
  Finished: "bg-emerald-500/15 text-emerald-400",
  Cancelled: "bg-slate-500/15 text-slate-400",
};
const STATUS_LABELS: Record<ConsultStatus, string> = {
  Open: "Abierta", InProgress: "En Progreso", Finished: "Finalizada", Cancelled: "Cancelada",
};

function VitalsSection({ consult, onSave }: { consult: ConsultDto; onSave: (d: UpdateConsultRequest) => void }) {
  const [form, setForm] = useState<UpdateConsultRequest>({
    weightKg: consult.weightKg ?? undefined, heightCm: consult.heightCm ?? undefined,
    bpSystolic: consult.bpSystolic ?? undefined, bpDiastolic: consult.bpDiastolic ?? undefined,
    heartRate: consult.heartRate ?? undefined, temperatureCelsius: consult.temperatureCelsius ?? undefined,
    o2Saturation: consult.o2Saturation ?? undefined, respiratoryRate: consult.respiratoryRate ?? undefined,
    chiefComplaint: consult.chiefComplaint ?? undefined, clinicalObservations: consult.clinicalObservations ?? undefined,
    diagnosisCodes: consult.diagnosisCodes ?? undefined, diagnosisDescription: consult.diagnosisDescription ?? undefined,
    treatmentPlan: consult.treatmentPlan ?? undefined,
  });

  const set = <K extends keyof UpdateConsultRequest>(k: K, v: UpdateConsultRequest[K]) => setForm((p) => ({ ...p, [k]: v }));
  const numField = (key: keyof UpdateConsultRequest, label: string, unit: string) => (
    <div>
      <label className={LABEL}>{label} <span className="text-slate-600">{unit}</span></label>
      <input type="number" step="0.1" min={0} className={INPUT}
        value={(form[key] as number | undefined) ?? ""}
        onChange={(e) => set(key, (e.target.value ? Number(e.target.value) : undefined) as UpdateConsultRequest[typeof key])} />
    </div>
  );

  const bmi = form.weightKg && form.heightCm ? (form.weightKg / ((form.heightCm / 100) ** 2)).toFixed(1) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Signos Vitales</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {numField("weightKg", "Peso", "kg")}
          {numField("heightCm", "Estatura", "cm")}
          {numField("temperatureCelsius", "Temperatura", "°C")}
          {numField("o2Saturation", "Sat O₂", "%")}
          {numField("bpSystolic", "P. Sistólica", "mmHg")}
          {numField("bpDiastolic", "P. Diastólica", "mmHg")}
          {numField("heartRate", "Frec. Cardíaca", "bpm")}
          {numField("respiratoryRate", "Frec. Resp.", "rpm")}
        </div>
        {bmi && <p className="text-xs text-slate-500 mt-2">IMC: <span className="text-white font-medium">{bmi}</span></p>}
      </div>
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Notas Clínicas</h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className={LABEL}>Motivo de consulta</label>
            <input className={INPUT} value={form.chiefComplaint ?? ""} onChange={(e) => set("chiefComplaint", e.target.value || undefined)} />
          </div>
          <div>
            <label className={LABEL}>Observaciones clínicas</label>
            <textarea rows={3} className={INPUT + " resize-none"} value={form.clinicalObservations ?? ""} onChange={(e) => set("clinicalObservations", e.target.value || undefined)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Códigos CIE-10</label>
              <input className={INPUT} value={form.diagnosisCodes ?? ""} onChange={(e) => set("diagnosisCodes", e.target.value || undefined)} placeholder="J06.9…" />
            </div>
            <div>
              <label className={LABEL}>Descripción del diagnóstico</label>
              <input className={INPUT} value={form.diagnosisDescription ?? ""} onChange={(e) => set("diagnosisDescription", e.target.value || undefined)} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Plan de tratamiento</label>
            <textarea rows={3} className={INPUT + " resize-none"} value={form.treatmentPlan ?? ""} onChange={(e) => set("treatmentPlan", e.target.value || undefined)} />
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={() => onSave(form)} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
          Guardar Cambios
        </button>
      </div>
    </div>
  );
}

function RxForm({ consultId, onSuccess }: { consultId: string; onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AddPrescriptionRequest>({ consultId, drugName: "", dosage: "", frequency: "" });
  const mutation = useMutation({
    mutationFn: prescriptionsApi.add,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["prescriptions", consultId] }); onSuccess(); },
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className={LABEL}>Medicamento *</label><input className={INPUT} value={form.drugName} onChange={(e) => setForm((p) => ({ ...p, drugName: e.target.value }))} required /></div>
        <div><label className={LABEL}>Presentación</label><input className={INPUT} value={form.presentation ?? ""} onChange={(e) => setForm((p) => ({ ...p, presentation: e.target.value || undefined }))} /></div>
        <div><label className={LABEL}>Dosis *</label><input className={INPUT} value={form.dosage} onChange={(e) => setForm((p) => ({ ...p, dosage: e.target.value }))} required /></div>
        <div><label className={LABEL}>Frecuencia *</label><input className={INPUT} value={form.frequency} onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))} required /></div>
        <div><label className={LABEL}>Duración (días)</label><input type="number" min={1} className={INPUT} value={form.durationDays ?? ""} onChange={(e) => setForm((p) => ({ ...p, durationDays: e.target.value ? Number(e.target.value) : undefined }))} /></div>
        <div><label className={LABEL}>Vía</label><input className={INPUT} value={form.routeOfAdministration ?? ""} onChange={(e) => setForm((p) => ({ ...p, routeOfAdministration: e.target.value || undefined }))} placeholder="Oral" /></div>
      </div>
      <div><label className={LABEL}>Instrucciones especiales</label><input className={INPUT} value={form.specialInstructions ?? ""} onChange={(e) => setForm((p) => ({ ...p, specialInstructions: e.target.value || undefined }))} /></div>
      {mutation.isError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al agregar.</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
          {mutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Agregar
        </button>
      </div>
    </form>
  );
}

function LabForm({ consultId, onSuccess }: { consultId: string; onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateLabOrderRequest>({ consultId, testName: "", testCategory: "Laboratorio", priority: "Routine" });
  const mutation = useMutation({
    mutationFn: labApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lab-orders", consultId] }); onSuccess(); },
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className={LABEL}>Examen *</label><input className={INPUT} value={form.testName} onChange={(e) => setForm((p) => ({ ...p, testName: e.target.value }))} required /></div>
        <div>
          <label className={LABEL}>Categoría *</label>
          <select className={SELECT} value={form.testCategory ?? ""} onChange={(e) => setForm((p) => ({ ...p, testCategory: e.target.value }))}>
            {["Laboratorio", "Radiología", "Cardiología", "Microbiología", "Patología"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Prioridad *</label>
          <select className={SELECT} value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as LabPriority }))}>
            <option value="Routine">Rutina</option><option value="Urgent">Urgente</option><option value="Stat">STAT</option>
          </select>
        </div>
      </div>
      <div><label className={LABEL}>Indicación clínica</label><input className={INPUT} value={form.clinicalIndication ?? ""} onChange={(e) => setForm((p) => ({ ...p, clinicalIndication: e.target.value || undefined }))} /></div>
      {mutation.isError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al crear la orden.</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
          {mutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Ordenar
        </button>
      </div>
    </form>
  );
}

export default function ConsultDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("vitals");
  const [showRxModal, setShowRxModal] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);

  const { data: consult, isLoading } = useQuery({ queryKey: ["consult", id], queryFn: () => consultsApi.get(id!), enabled: !!id });
  const { data: prescriptions } = useQuery({ queryKey: ["prescriptions", id], queryFn: () => prescriptionsApi.listByConsult(id!), enabled: !!id && tab === "prescriptions" });
  const { data: labOrders } = useQuery({ queryKey: ["lab-orders", id], queryFn: () => labApi.listByConsult(id!), enabled: !!id && tab === "lab" });
  const { data: images } = useQuery({ queryKey: ["consult-images", id], queryFn: () => consultsApi.getImages(id!), enabled: !!id && tab === "images" });

  const updateMutation = useMutation({ mutationFn: (body: UpdateConsultRequest) => consultsApi.update(id!, body), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["consult", id] }) });
  const statusMutation = useMutation({ mutationFn: (status: ConsultStatus) => consultsApi.patchStatus(id!, { status }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["consult", id] }) });
  const uploadMutation = useMutation({ mutationFn: (file: File) => consultsApi.uploadImage(id!, file), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["consult-images", id] }) });

  if (isLoading) return <div className="flex items-center justify-center h-64"><span className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>;
  if (!consult) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-slate-400">Consulta no encontrada.</p>
      <button onClick={() => navigate("/consults")} className="text-brand-400 hover:underline text-sm">Volver</button>
    </div>
  );

  const canEdit = consult.status === "Open" || consult.status === "InProgress";
  const TABS: { id: Tab; label: string }[] = [
    { id: "vitals", label: "Clínica" },
    { id: "prescriptions", label: "Prescripciones" },
    { id: "lab", label: "Laboratorio" },
    { id: "images", label: "Imágenes" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/consults")} className="text-slate-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{consult.patientName}</h1>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[consult.status]}`}>{STATUS_LABELS[consult.status]}</span>
            </div>
            <p className="text-sm text-slate-500">{consult.specialtyName} · {consult.doctorName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {consult.status === "Open" && <button onClick={() => statusMutation.mutate("InProgress")} disabled={statusMutation.isPending} className="px-3 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50">Iniciar</button>}
          {consult.status === "InProgress" && <button onClick={() => statusMutation.mutate("Finished")} disabled={statusMutation.isPending} className="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">Finalizar</button>}
          {canEdit && <button onClick={() => statusMutation.mutate("Cancelled")} disabled={statusMutation.isPending} className="px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 disabled:opacity-50">Cancelar</button>}
        </div>
      </motion.div>

      <div className="flex gap-1 border-b border-surface-800">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? "border-brand-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
        className="bg-surface-900 border border-surface-800 rounded-2xl p-6">
        {tab === "vitals" && <VitalsSection consult={consult} onSave={(body) => updateMutation.mutate(body)} />}

        {tab === "prescriptions" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300">Prescripciones</h2>
              {canEdit && <button onClick={() => setShowRxModal(true)} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white">+ Agregar</button>}
            </div>
            {!prescriptions ? <div className="flex items-center justify-center py-8"><span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
              : prescriptions.length === 0 ? <p className="text-slate-500 text-sm py-4">Sin prescripciones</p>
              : (
                <div className="flex flex-col gap-2">
                  {prescriptions.map((rx) => (
                    <div key={rx.id} className="flex items-start justify-between bg-surface-800 border border-surface-700 rounded-xl p-4">
                      <div>
                        <p className="text-white font-medium">{rx.drugName}{rx.presentation && <span className="text-slate-500 text-xs ml-2">{rx.presentation}</span>}</p>
                        <p className="text-sm text-slate-400 mt-0.5">{rx.dosage} · {rx.frequency}{rx.durationDays && ` · ${rx.durationDays} días`}</p>
                        {rx.specialInstructions && <p className="text-xs text-slate-500 mt-0.5">{rx.specialInstructions}</p>}
                      </div>
                      {rx.routeOfAdministration && <span className="text-xs text-slate-500 bg-surface-700 rounded-lg px-2 py-1">{rx.routeOfAdministration}</span>}
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {tab === "lab" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300">Órdenes de Laboratorio</h2>
              {canEdit && <button onClick={() => setShowLabModal(true)} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white">+ Ordenar</button>}
            </div>
            {!labOrders ? <div className="flex items-center justify-center py-8"><span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
              : labOrders.length === 0 ? <p className="text-slate-500 text-sm py-4">Sin órdenes</p>
              : (
                <div className="flex flex-col gap-2">
                  {labOrders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between bg-surface-800 border border-surface-700 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-white font-medium">{o.testName}</p>
                        <p className="text-xs text-slate-500">{o.testCategory ?? "—"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${o.priority === "Stat" ? "bg-red-500/15 text-red-400" : o.priority === "Urgent" ? "bg-amber-500/15 text-amber-400" : "bg-slate-500/15 text-slate-400"}`}>
                          {o.priority === "Routine" ? "Rutina" : o.priority === "Urgent" ? "Urgente" : "STAT"}
                        </span>
                        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${o.status === "Completed" ? "bg-emerald-500/15 text-emerald-400" : o.status === "InProgress" ? "bg-brand-500/15 text-brand-400" : o.status === "Cancelled" ? "bg-slate-500/15 text-slate-400" : "bg-blue-500/15 text-blue-400"}`}>
                          {o.status === "Pending" ? "Pendiente" : o.status === "InProgress" ? "En Proceso" : o.status === "Completed" ? "Completado" : "Cancelado"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {tab === "images" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300">Imágenes / PACS</h2>
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white cursor-pointer">
                {uploadMutation.isPending ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "↑ Subir"}
                <input type="file" className="hidden" accept="image/*,.dcm,.dicom" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMutation.mutate(f); }} />
              </label>
            </div>
            {!images ? <div className="flex items-center justify-center py-8"><span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
              : images.length === 0 ? <p className="text-slate-500 text-sm py-4">Sin imágenes</p>
              : (
                <div className="grid grid-cols-3 gap-3">
                  {images.map((img) => (
                    <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer"
                      className="aspect-square rounded-xl overflow-hidden bg-surface-800 border border-surface-700 hover:border-brand-500/50 transition-colors">
                      {img.contentType.startsWith("image/") ? (
                        <img src={img.url} alt={img.fileName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-xs text-slate-500 px-2 text-center truncate">{img.fileName}</span>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              )}
          </div>
        )}
      </motion.div>

      <Modal open={showRxModal} onClose={() => setShowRxModal(false)} title="Agregar Prescripción" maxWidth="max-w-lg">
        <RxForm consultId={id!} onSuccess={() => setShowRxModal(false)} />
      </Modal>
      <Modal open={showLabModal} onClose={() => setShowLabModal(false)} title="Ordenar Examen" maxWidth="max-w-lg">
        <LabForm consultId={id!} onSuccess={() => setShowLabModal(false)} />
      </Modal>
    </div>
  );
}
