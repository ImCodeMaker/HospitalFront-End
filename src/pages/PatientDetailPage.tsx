import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { patientsApi } from "@/api/patients";
import { consultsApi } from "@/api/consults";
import { appointmentsApi } from "@/api/appointments";
import { downloadBlob } from "@/api/pdf";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { useAuthStore } from "@/store/authStore";
import type { PatchPatientStatusRequest, PatientStatus, PatientTimelineParams } from "@/types/patients";
import { GUARDIAN_RELATIONSHIP_LABEL } from "@/types/patients";

const INPUT =
  "bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500 w-full";
const LABEL = "block text-xs font-medium text-slate-400 mb-1";

type Tab = "overview" | "timeline" | "consults" | "appointments";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-ink">{value || "—"}</dd>
    </div>
  );
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-DO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-DO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.hasRole("Admin"));
  const [tab, setTab] = useState<Tab>("overview");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAnonymizeModal, setShowAnonymizeModal] = useState(false);
  const [timelineFilters, setTimelineFilters] = useState<PatientTimelineParams>({});
  const [statusForm, setStatusForm] = useState<PatchPatientStatusRequest>({
    status: "Active",
    reason: "",
  });

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => patientsApi.getById(id!),
    enabled: !!id,
  });

  const { data: timeline } = useQuery({
    queryKey: ["patient-timeline", id, timelineFilters],
    queryFn: () => patientsApi.getTimeline(id!, timelineFilters),
    enabled: !!id && tab === "timeline",
  });

  const { data: consults } = useQuery({
    queryKey: ["patient-consults", id],
    queryFn: () =>
      consultsApi.list({ patientId: id!, pageSize: 20 }),
    enabled: !!id && tab === "consults",
  });

  const { data: appointments } = useQuery({
    queryKey: ["patient-appointments", id],
    queryFn: () =>
      appointmentsApi.list({ patientId: id!, pageSize: 20 }),
    enabled: !!id && tab === "appointments",
  });

  const statusMutation = useMutation({
    mutationFn: (body: PatchPatientStatusRequest) =>
      patientsApi.patchStatus(id!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      setShowStatusModal(false);
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => patientsApi.exportData(id!),
    onSuccess: (blob) => {
      downloadBlob(blob, `patient-${id}-export.json`);
    },
  });

  const anonymizeMutation = useMutation({
    mutationFn: () => patientsApi.anonymize(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      setShowAnonymizeModal(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-slate-400">Paciente no encontrado.</p>
        <button
          onClick={() => navigate("/patients")}
          className="text-brand-400 hover:underline text-sm"
        >
          Volver a Pacientes
        </button>
      </div>
    );
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Información" },
    { id: "timeline", label: "Historial" },
    { id: "consults", label: "Consultas" },
    { id: "appointments", label: "Citas" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/patients")}
            className="text-slate-500 hover:text-ink transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-12 h-12 rounded-full bg-brand-600/20 border border-brand-500/20 flex items-center justify-center">
            <span className="text-lg font-bold text-brand-400">
              {patient.firstName[0]}{patient.lastName[0]}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">{patient.fullName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={patient.status} variant="patient" />
              <span className="text-sm text-slate-500">
                {patient.documentType === "Cedula" ? "Cédula" : patient.documentType}: {patient.documentNumber}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
                title="Exportar todos los datos del paciente (GDPR)"
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-ink hover:bg-surface-800 border border-surface-700 transition-colors disabled:opacity-50"
              >
                {exportMutation.isPending ? "Exportando…" : "Exportar"}
              </button>
              <button
                onClick={() => setShowAnonymizeModal(true)}
                title="Anonimizar paciente (GDPR — irreversible)"
                className="px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
              >
                Anonimizar
              </button>
            </>
          )}
          <button
            onClick={() => {
              setStatusForm({ status: patient.status, reason: "" });
              setShowStatusModal(true);
            }}
            className="px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-ink hover:bg-surface-800 border border-surface-700 transition-colors"
          >
            Cambiar Estado
          </button>
          <button
            onClick={() => navigate(`/consults/new?patientId=${id}`)}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors"
          >
            Nueva Consulta
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-brand-500 text-ink"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal */}
            <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">Información Personal</h2>
              <dl className="grid grid-cols-2 gap-4">
                <InfoRow label="Nombre completo" value={patient.fullName} />
                <InfoRow label="Fecha de nacimiento" value={formatDate(patient.birthDate)} />
                <InfoRow label="Edad" value={`${patient.age} años${patient.isMinor ? " (menor)" : ""}`} />
                <InfoRow label="Género" value={patient.gender === "Male" ? "Masculino" : patient.gender === "Female" ? "Femenino" : "Otro"} />
                <InfoRow label="Nacionalidad" value={patient.nationality} />
                <InfoRow label="Dirección" value={patient.homeAddress} />
              </dl>
            </div>

            {/* Contact & Medical */}
            <div className="flex flex-col gap-4">
              <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-slate-300 mb-4">Contacto</h2>
                <dl className="grid grid-cols-2 gap-4">
                  <InfoRow label="Teléfono" value={patient.phone} />
                  <InfoRow label="Correo" value={patient.email} />
                </dl>
              </div>

              <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-slate-300 mb-4">Datos Clínicos</h2>
                <dl className="grid grid-cols-2 gap-4">
                  <InfoRow label="Tipo de sangre" value={patient.bloodType} />
                  <InfoRow label="Alergias" value={patient.knownAllergies} />
                  <div className="col-span-2">
                    <InfoRow label="Condiciones crónicas" value={patient.chronicConditions} />
                  </div>
                </dl>
              </div>

              {(patient.isMinor || patient.guardianFirstName) && (
                <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
                  <h2 className="text-sm font-semibold text-slate-300 mb-4">
                    Tutor / Guardián
                    {patient.isMinor && <span className="ml-2 text-xs bg-amber-500/15 text-amber-400 rounded-full px-2 py-0.5">Menor de edad</span>}
                  </h2>
                  <dl className="grid grid-cols-2 gap-4">
                    <InfoRow label="Nombre" value={patient.guardianFirstName ? `${patient.guardianFirstName} ${patient.guardianLastName ?? ""}`.trim() : null} />
                    <InfoRow label="Relación" value={patient.guardianRelationship ? GUARDIAN_RELATIONSHIP_LABEL[patient.guardianRelationship] : null} />
                    <InfoRow label="Documento" value={patient.guardianDocumentNumber ? `${patient.guardianDocumentType ?? ""} ${patient.guardianDocumentNumber}` : null} />
                    <InfoRow label="Teléfono" value={patient.guardianPhone} />
                    <div className="col-span-2">
                      <InfoRow label="Email" value={patient.guardianEmail} />
                    </div>
                  </dl>
                </div>
              )}

              {patient.hasInsurance && (
                <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
                  <h2 className="text-sm font-semibold text-slate-300 mb-4">Seguro Médico</h2>
                  <dl className="grid grid-cols-2 gap-4">
                    <InfoRow label="Aseguradora" value={patient.insuranceCompanyName} />
                    <InfoRow label="Póliza" value={patient.insurancePolicyNumber} />
                    <InfoRow
                      label="Cobertura"
                      value={
                        patient.insuranceCoveragePercentage != null
                          ? `${patient.insuranceCoveragePercentage}%`
                          : undefined
                      }
                    />
                  </dl>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "timeline" && (
          <div className="flex flex-col gap-4">
            <div className="bg-surface-900 border border-surface-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={LABEL}>Categoría</label>
                <select className={INPUT + " appearance-none cursor-pointer"}
                  value={timelineFilters.category ?? ""}
                  onChange={(e) => setTimelineFilters((p) => ({ ...p, category: e.target.value || undefined }))}>
                  <option value="">Todas</option>
                  <option value="Consult">Consulta</option>
                  <option value="Appointment">Cita</option>
                  <option value="LabOrder">Laboratorio</option>
                  <option value="Prescription">Receta</option>
                  <option value="Billing">Facturación</option>
                  <option value="Status">Estado</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Desde</label>
                <input type="date" className={INPUT}
                  value={timelineFilters.from?.slice(0, 10) ?? ""}
                  onChange={(e) => setTimelineFilters((p) => ({ ...p, from: e.target.value ? `${e.target.value}T00:00:00Z` : undefined }))} />
              </div>
              <div>
                <label className={LABEL}>Hasta</label>
                <input type="date" className={INPUT}
                  value={timelineFilters.to?.slice(0, 10) ?? ""}
                  onChange={(e) => setTimelineFilters((p) => ({ ...p, to: e.target.value ? `${e.target.value}T23:59:59Z` : undefined }))} />
              </div>
            </div>
          <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
            {!timeline ? (
              <div className="flex items-center justify-center py-12">
                <span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              </div>
            ) : timeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <p className="text-slate-400">Sin historial para los filtros aplicados</p>
              </div>
            ) : (
              <div className="p-6 flex flex-col gap-0">
                {timeline.map((entry, i) => (
                  <div key={entry.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-500 mt-1 shrink-0" />
                      {i < timeline.length - 1 && (
                        <div className="w-px flex-1 bg-surface-700 mt-1" />
                      )}
                    </div>
                    <div className="pb-5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-brand-400 bg-brand-500/10 rounded-full px-2 py-0.5">
                          {entry.category}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDateTime(entry.date)}
                        </span>
                      </div>
                      <p className="text-sm text-ink">{entry.description}</p>
                      {entry.performedBy && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Por: {entry.performedBy}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        )}

        {tab === "consults" && (
          <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
            {!consults ? (
              <div className="flex items-center justify-center py-12">
                <span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              </div>
            ) : consults.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <p className="text-slate-400">Sin consultas registradas</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    {["Especialidad", "Doctor", "Estado", "Diagnóstico", "Fecha", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {consults.items.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-surface-800 last:border-0 hover:bg-surface-800/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/consults/${c.id}`)}
                    >
                      <td className="px-4 py-3 text-ink">{c.specialtyName}</td>
                      <td className="px-4 py-3 text-slate-400">{c.doctorName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.status === "Finished" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : c.status === "InProgress" ? "bg-brand-500/15 text-brand-400 border border-brand-500/30"
                          : c.status === "Cancelled" ? "bg-slate-500/15 text-slate-400 border border-slate-500/30"
                          : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                        }`}>
                          {c.status === "Open" ? "Abierta" : c.status === "InProgress" ? "En Progreso" : c.status === "Finished" ? "Finalizada" : "Cancelada"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">
                        {c.diagnosisDescription || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-brand-400 text-xs">Ver →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "appointments" && (
          <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
            {!appointments ? (
              <div className="flex items-center justify-center py-12">
                <span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              </div>
            ) : appointments.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <p className="text-slate-400">Sin citas registradas</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    {["Tipo", "Fecha / Hora", "Duración", "Estado", "Motivo"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appointments.items.map((a) => (
                    <tr key={a.id} className="border-b border-surface-800 last:border-0">
                      <td className="px-4 py-3">
                        <StatusBadge status={a.type} variant="appointmentType" />
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatDateTime(a.scheduledDate)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{a.durationMinutes} min</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.status} variant="appointment" />
                      </td>
                      <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">
                        {a.reason || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </motion.div>

      {/* Change Status Modal */}
      <Modal
        open={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Cambiar Estado del Paciente"
        maxWidth="max-w-sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            statusMutation.mutate(statusForm);
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <label className={LABEL}>Nuevo Estado *</label>
            <select
              className={INPUT + " appearance-none"}
              value={statusForm.status}
              onChange={(e) =>
                setStatusForm((p) => ({
                  ...p,
                  status: e.target.value as PatientStatus,
                }))
              }
              required
            >
              {(["Active", "Inactive", "Suspended", "Archived", "Deceased"] as PatientStatus[]).map((s) => (
                <option key={s} value={s}>
                  {s === "Active" ? "Activo" : s === "Inactive" ? "Inactivo" : s === "Suspended" ? "Suspendido" : s === "Archived" ? "Archivado" : "Fallecido"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Razón (opcional)</label>
            <input
              className={INPUT}
              value={statusForm.reason ?? ""}
              onChange={(e) => setStatusForm((p) => ({ ...p, reason: e.target.value }))}
              placeholder="Motivo del cambio…"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowStatusModal(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-ink hover:bg-surface-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={statusMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {statusMutation.isPending && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showAnonymizeModal}
        onClose={() => setShowAnonymizeModal(false)}
        title="Anonimizar Paciente"
        maxWidth="max-w-sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-300">
            Esto reemplaza todos los datos personales del paciente con valores anonimizados y archiva el registro. <strong className="text-red-400">No se puede deshacer.</strong>
          </p>
          {anonymizeMutation.isError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al anonimizar.</p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowAnonymizeModal(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-ink hover:bg-surface-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => anonymizeMutation.mutate()}
              disabled={anonymizeMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 flex items-center gap-2"
            >
              {anonymizeMutation.isPending && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Confirmar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
