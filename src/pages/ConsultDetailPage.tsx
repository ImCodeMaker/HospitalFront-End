import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { consultsApi } from "@/api/consults";
import { prescriptionsApi } from "@/api/prescriptions";
import { labApi } from "@/api/lab";
import { dicomApi } from "@/api/dicom";
import { pdfApi, downloadBlob } from "@/api/pdf";
import { consultFieldTemplatesApi, type ConsultFieldTemplateDto } from "@/api/consultFieldTemplates";
import { DentalChart, type DentalChartState } from "@/components/clinical/DentalChart";
import { DrugAutocomplete } from "@/components/clinical/DrugAutocomplete";
import { Modal } from "@/components/ui/Modal";
import type { UpdateConsultRequest, ConsultStatus, ConsultDto } from "@/types/consults";
import type { AddPrescriptionRequest } from "@/types/prescriptions";
import type { CreateLabOrderRequest, LabPriority } from "@/types/lab";

const INPUT = "bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500 w-full";
const SELECT = INPUT + " appearance-none cursor-pointer";
const LABEL = "block text-xs font-medium text-slate-400 mb-1";

type Tab = "vitals" | "prescriptions" | "lab" | "images" | "dicom" | "dental";

const STATUS_COLORS: Record<ConsultStatus, string> = {
  Open: "bg-blue-500/15 text-blue-400",
  InProgress: "bg-brand-500/15 text-brand-400",
  Finished: "bg-emerald-500/15 text-emerald-400",
  Cancelled: "bg-slate-500/15 text-slate-400",
};
const STATUS_LABELS: Record<ConsultStatus, string> = {
  Open: "Abierta", InProgress: "En Progreso", Finished: "Finalizada", Cancelled: "Cancelada",
};

function parseSpecialtyData(raw?: string | null): Record<string, unknown> {
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

function DynamicField({ template, value, onChange }: { template: ConsultFieldTemplateDto; value: unknown; onChange: (v: unknown) => void }) {
  const label = (
    <label className={LABEL}>
      {template.label}{template.isRequired && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
  switch (template.fieldType) {
    case "textarea":
      return <div className="col-span-2">{label}<textarea rows={3} className={INPUT + " resize-none"} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || undefined)} /></div>;
    case "number":
      return <div>{label}<input type="number" className={INPUT} value={(value as number) ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)} /></div>;
    case "date":
      return <div>{label}<input type="date" className={INPUT} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || undefined)} /></div>;
    case "checkbox":
      return <div><label className="flex items-center gap-3 cursor-pointer mt-5"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 rounded" /><span className="text-sm text-slate-300">{template.label}</span></label></div>;
    case "select": {
      let options: string[] = [];
      try { options = JSON.parse(template.fieldOptions ?? "[]") as string[]; } catch { options = []; }
      return <div>{label}<select className={SELECT} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select></div>;
    }
    default:
      return <div>{label}<input className={INPUT} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || undefined)} /></div>;
  }
}

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

  const [specialtyValues, setSpecialtyValues] = useState<Record<string, unknown>>(() => parseSpecialtyData(consult.specialtyData));

  const { data: templates } = useQuery({
    queryKey: ["consult-field-templates", consult.specialtyId],
    queryFn: () => consultFieldTemplatesApi.listBySpecialty(consult.specialtyId),
    enabled: !!consult.specialtyId,
  });

  const setSpecialtyValue = (key: string, value: unknown) => {
    setSpecialtyValues((p) => {
      const next = { ...p };
      if (value === undefined || value === "" || value === null) delete next[key];
      else next[key] = value;
      return next;
    });
  };

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
        {bmi && <p className="text-xs text-slate-500 mt-2">IMC: <span className="text-ink font-medium">{bmi}</span></p>}
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
      {templates && templates.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Campos de la especialidad</h3>
          <div className="grid grid-cols-2 gap-3">
            {templates.slice().sort((a, b) => a.displayOrder - b.displayOrder).map((t) => (
              <DynamicField key={t.id} template={t} value={specialtyValues[t.fieldKey]} onChange={(v) => setSpecialtyValue(t.fieldKey, v)} />
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <button type="button" onClick={() => onSave({ ...form, specialtyData: Object.keys(specialtyValues).length > 0 ? JSON.stringify(specialtyValues) : null })} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
          Guardar Cambios
        </button>
      </div>
    </div>
  );
}

function RxForm({ consultId, onSuccess }: { consultId: string; onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AddPrescriptionRequest>({ consultId, drugName: "", dosage: "", frequency: "" });
  const [interactionWarning, setInteractionWarning] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: AddPrescriptionRequest) => prescriptionsApi.add(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions", consultId] });
      setInteractionWarning(null);
      onSuccess();
    },
    onError: (err: { response?: { status?: number; data?: { error?: string; message?: string } } }) => {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? "";
      if (status === 409 && /drug interaction/i.test(msg)) {
        setInteractionWarning(msg);
      } else {
        setInteractionWarning(null);
      }
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); setInteractionWarning(null); mutation.mutate(form); }} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={LABEL}>Medicamento *</label>
          <DrugAutocomplete className={INPUT} value={form.drugName} rxCui={form.rxCui}
            onChange={(name, rxCui) => setForm((p) => ({ ...p, drugName: name, rxCui }))} />
        </div>
        <div><label className={LABEL}>Presentación</label><input className={INPUT} value={form.presentation ?? ""} onChange={(e) => setForm((p) => ({ ...p, presentation: e.target.value || undefined }))} /></div>
        <div><label className={LABEL}>Dosis *</label><input className={INPUT} value={form.dosage} onChange={(e) => setForm((p) => ({ ...p, dosage: e.target.value }))} required /></div>
        <div><label className={LABEL}>Frecuencia *</label><input className={INPUT} value={form.frequency} onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))} required /></div>
        <div><label className={LABEL}>Duración (días)</label><input type="number" min={1} className={INPUT} value={form.durationDays ?? ""} onChange={(e) => setForm((p) => ({ ...p, durationDays: e.target.value ? Number(e.target.value) : undefined }))} /></div>
        <div><label className={LABEL}>Vía</label><input className={INPUT} value={form.routeOfAdministration ?? ""} onChange={(e) => setForm((p) => ({ ...p, routeOfAdministration: e.target.value || undefined }))} placeholder="Oral" /></div>
      </div>
      <div><label className={LABEL}>Instrucciones especiales</label><input className={INPUT} value={form.specialInstructions ?? ""} onChange={(e) => setForm((p) => ({ ...p, specialInstructions: e.target.value || undefined }))} /></div>

      {interactionWarning && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-3 flex flex-col gap-2">
          <p className="text-sm font-semibold text-rose-400">⚠ Interacción farmacológica detectada</p>
          <p className="text-xs text-rose-300 whitespace-pre-wrap">{interactionWarning}</p>
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={() => { mutation.mutate({ ...form, acknowledgeInteractions: true }); }}
              className="px-3 py-1.5 text-xs rounded-lg bg-rose-600 hover:bg-rose-700 text-white">
              Confirmar y guardar
            </button>
            <button type="button" onClick={() => setInteractionWarning(null)}
              className="px-3 py-1.5 text-xs rounded-lg bg-surface-800 text-slate-300 hover:bg-surface-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {mutation.isError && !interactionWarning && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al agregar.</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={mutation.isPending || !!interactionWarning} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
          {mutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Agregar
        </button>
      </div>
    </form>
  );
}

function DentalTab({ consult, disabled, onSave }: { consult: ConsultDto; disabled: boolean; onSave: (state: DentalChartState) => void }) {
  const initial: DentalChartState = (() => {
    if (!consult.dentalChart) return {};
    try { return JSON.parse(consult.dentalChart) as DentalChartState; } catch { return {}; }
  })();
  const [state, setState] = useState<DentalChartState>(initial);
  const [dirty, setDirty] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300">Odontograma — FDI</h2>
        {!disabled && dirty && (
          <button type="button" onClick={() => { onSave(state); setDirty(false); }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white">
            Guardar odontograma
          </button>
        )}
      </div>
      <DentalChart value={state} readOnly={disabled} onChange={(next) => { setState(next); setDirty(true); }} />
    </div>
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
  const { data: dicomStudies } = useQuery({ queryKey: ["consult-dicom", id], queryFn: () => dicomApi.listByConsult(id!), enabled: !!id && tab === "dicom" });

  const updateMutation = useMutation({ mutationFn: (body: UpdateConsultRequest) => consultsApi.update(id!, body), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["consult", id] }) });
  const finalizeMutation = useMutation({ mutationFn: () => consultsApi.finalize(id!), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["consult", id] }) });
  const uploadMutation = useMutation({ mutationFn: (file: File) => consultsApi.uploadImage(id!, file), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["consult-images", id] }) });
  const dicomUploadMutation = useMutation({ mutationFn: (file: File) => dicomApi.upload(id!, file), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["consult-dicom", id] }) });
  const sickNoteMutation = useMutation({ mutationFn: () => pdfApi.sickNote(id!), onSuccess: (b) => downloadBlob(b, `sick-note-${id}.pdf`) });
  const rxPdfMutation = useMutation({ mutationFn: () => pdfApi.prescription(id!), onSuccess: (b) => downloadBlob(b, `prescription-${id}.pdf`) });

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
    { id: "dicom", label: "DICOM" },
    { id: "dental", label: "Odontograma" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/consults")} className="text-slate-500 hover:text-ink transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-ink">{consult.patientName}</h1>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[consult.status]}`}>{STATUS_LABELS[consult.status]}</span>
            </div>
            <p className="text-sm text-slate-500">{consult.specialtyName} · {consult.doctorName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {consult.status === "Finished" && (
            <>
              <button onClick={() => sickNoteMutation.mutate()} disabled={sickNoteMutation.isPending}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-ink hover:bg-surface-800 border border-surface-700 disabled:opacity-50">
                {sickNoteMutation.isPending ? "…" : "↓ Certificado médico"}
              </button>
              <button onClick={() => rxPdfMutation.mutate()} disabled={rxPdfMutation.isPending}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-ink hover:bg-surface-800 border border-surface-700 disabled:opacity-50">
                {rxPdfMutation.isPending ? "…" : "↓ Receta"}
              </button>
            </>
          )}
          {canEdit && <button onClick={() => finalizeMutation.mutate()} disabled={finalizeMutation.isPending} className="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">Finalizar</button>}
        </div>
      </motion.div>

      <div className="flex gap-1 border-b border-surface-800">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? "border-brand-500 text-ink" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
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
                        <p className="text-ink font-medium">{rx.drugName}{rx.presentation && <span className="text-slate-500 text-xs ml-2">{rx.presentation}</span>}</p>
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
                        <p className="text-ink font-medium">{o.testName}</p>
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
                <input type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMutation.mutate(f); }} />
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
        {tab === "dental" && (
          <DentalTab consult={consult} disabled={!canEdit} onSave={(state) => updateMutation.mutate({ dentalChart: JSON.stringify(state) })} />
        )}

        {tab === "dicom" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300">Estudios DICOM</h2>
              {canEdit && (
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white cursor-pointer">
                  {dicomUploadMutation.isPending ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "↑ Subir .dcm"}
                  <input type="file" className="hidden" accept=".dcm,.dicom" onChange={(e) => { const f = e.target.files?.[0]; if (f) dicomUploadMutation.mutate(f); }} />
                </label>
              )}
            </div>
            {!dicomStudies ? <div className="flex items-center justify-center py-8"><span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
              : dicomStudies.length === 0 ? <p className="text-slate-500 text-sm py-4">Sin estudios DICOM</p>
              : (
                <div className="flex flex-col gap-2">
                  {dicomStudies.map((s) => (
                    <div key={s.id} className="flex items-center justify-between bg-surface-800 border border-surface-700 rounded-xl px-4 py-3">
                      <div className="flex flex-col">
                        <p className="text-ink text-sm font-medium">{s.originalFileName}</p>
                        <p className="text-xs text-slate-500">
                          {s.modality ?? "—"}{s.studyDate ? ` · ${new Date(s.studyDate).toLocaleDateString("es-DO")}` : ""}{s.description ? ` · ${s.description}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">{(s.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                        <button onClick={async () => {
                          const { url } = await dicomApi.getById(s.id);
                          window.open(url, "_blank", "noopener");
                        }} className="text-brand-400 hover:underline">Abrir</button>
                      </div>
                    </div>
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
