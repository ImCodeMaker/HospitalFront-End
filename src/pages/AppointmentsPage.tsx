import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { appointmentsApi } from "@/api/appointments";
import { patientsApi } from "@/api/patients";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import type {
  AppointmentStatus,
  AppointmentType,
  CreateAppointmentRequest,
  PatchAppointmentStatusRequest,
} from "@/types/appointments";

const INPUT =
  "bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500 w-full";
const SELECT = INPUT + " appearance-none cursor-pointer";
const LABEL = "block text-xs font-medium text-slate-400 mb-1";

const STATUS_OPTIONS: { value: AppointmentStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "Scheduled", label: "Programada" },
  { value: "Confirmed", label: "Confirmada" },
  { value: "InProgress", label: "En Progreso" },
  { value: "Attended", label: "Atendida" },
  { value: "NoShow", label: "No Asistió" },
  { value: "Cancelled", label: "Cancelada" },
];

const TYPE_LABELS: Record<AppointmentType, string> = {
  Consultation: "Consulta",
  FollowUp: "Seguimiento",
  Emergency: "Emergencia",
  Procedure: "Procedimiento",
  LabWork: "Laboratorio",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-DO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const INITIAL_FORM: CreateAppointmentRequest = {
  patientId: "",
  assignedDoctorId: "",
  scheduledDate: "",
  durationMinutes: 30,
  type: "Consultation",
  reason: "",
};

function CreateAppointmentForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateAppointmentRequest>(INITIAL_FORM);
  const [patientSearch, setPatientSearch] = useState("");
  const [debouncedPatientSearch, setDebouncedPatientSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPatientSearch(patientSearch), 400);
    return () => clearTimeout(t);
  }, [patientSearch]);

  const { data: patientsData } = useQuery({
    queryKey: ["patients-search", debouncedPatientSearch],
    queryFn: () =>
      patientsApi.list({ search: debouncedPatientSearch, pageSize: 8 }),
    enabled: debouncedPatientSearch.length > 1,
  });

  const mutation = useMutation({
    mutationFn: appointmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      onSuccess();
    },
  });

  const set = <K extends keyof CreateAppointmentRequest>(
    k: K,
    v: CreateAppointmentRequest[K]
  ) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(form);
      }}
      className="flex flex-col gap-4"
    >
      {/* Patient search */}
      <div>
        <label className={LABEL}>Paciente *</label>
        <input
          className={INPUT}
          placeholder="Buscar paciente por nombre…"
          value={patientSearch}
          onChange={(e) => setPatientSearch(e.target.value)}
        />
        {patientsData && patientsData.items.length > 0 && !form.patientId && (
          <div className="mt-1 bg-surface-800 border border-surface-700 rounded-lg overflow-hidden">
            {patientsData.items.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  set("patientId", p.id);
                  setPatientSearch(p.fullName);
                }}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-surface-700 transition-colors border-b border-surface-700 last:border-0"
              >
                {p.fullName}{" "}
                <span className="text-slate-500 text-xs">— {p.documentNumber}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className={LABEL}>Tipo *</label>
        <select
          className={SELECT}
          value={form.type}
          onChange={(e) => set("type", e.target.value as AppointmentType)}
          required
        >
          {(
            [
              "Consultation",
              "FollowUp",
              "Emergency",
              "Procedure",
              "LabWork",
            ] as AppointmentType[]
          ).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Fecha y Hora *</label>
          <input
            type="datetime-local"
            className={INPUT}
            value={form.scheduledDate}
            onChange={(e) => set("scheduledDate", e.target.value)}
            required
          />
        </div>
        <div>
          <label className={LABEL}>Duración (min) *</label>
          <input
            type="number"
            min={10}
            max={240}
            step={5}
            className={INPUT}
            value={form.durationMinutes}
            onChange={(e) => set("durationMinutes", Number(e.target.value))}
            required
          />
        </div>
      </div>

      <div>
        <label className={LABEL}>Motivo</label>
        <input
          className={INPUT}
          placeholder="Motivo de la consulta…"
          value={form.reason ?? ""}
          onChange={(e) => set("reason", e.target.value)}
        />
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          Error al crear la cita. Verifica los datos e intenta de nuevo.
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={mutation.isPending || !form.patientId}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {mutation.isPending && (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          Crear Cita
        </button>
      </div>
    </form>
  );
}

export default function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "">("");
  const [dateFrom, setDateFrom] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(
    new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10)
  );
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["appointments", statusFilter, dateFrom, dateTo, page],
    queryFn: () =>
      appointmentsApi.list({
        status: statusFilter,
        from: dateFrom,
        to: dateTo,
        pageNumber: page,
        pageSize: 20,
      }),
    placeholderData: (prev) => prev,
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: PatchAppointmentStatusRequest;
    }) => appointmentsApi.patchStatus(id, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const appts = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Citas</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalCount > 0 ? `${totalCount} citas encontradas` : "Agenda de citas"}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva Cita
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08, duration: 0.25 }}
        className="flex gap-3 flex-wrap"
      >
        <select
          className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none appearance-none cursor-pointer min-w-[160px]"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as AppointmentStatus | "");
            setPage(1);
          }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
        />
        <span className="text-slate-500 self-center text-sm">—</span>
        <input
          type="date"
          className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
        />
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.25 }}
        className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden"
      >
        {isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-slate-400">Error al cargar las citas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800">
                  {["Paciente", "Tipo", "Fecha / Hora", "Duración", "Estado", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <SkeletonRow key={i} cols={6} />
                    ))
                  : appts.length === 0
                  ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                          <svg className="w-12 h-12 text-surface-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-slate-400">No hay citas en este período</p>
                        </div>
                      </td>
                    </tr>
                  )
                  : appts.map((appt) => (
                      <tr
                        key={appt.id}
                        className="border-b border-surface-800 last:border-0 hover:bg-surface-800/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-white">
                          {appt.patientName}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={appt.type} variant="appointmentType" />
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {formatDateTime(appt.scheduledDate)}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {appt.durationMinutes} min
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={appt.status} variant="appointment" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {appt.status === "Scheduled" && (
                              <button
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: appt.id,
                                    body: { status: "Confirmed" },
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                              >
                                Confirmar
                              </button>
                            )}
                            {(appt.status === "Scheduled" ||
                              appt.status === "Confirmed") && (
                              <button
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: appt.id,
                                    body: { status: "Cancelled" },
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                Cancelar
                              </button>
                            )}
                            {appt.status === "Confirmed" && (
                              <button
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: appt.id,
                                    body: { status: "InProgress" },
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg text-xs font-medium text-brand-400 hover:bg-brand-500/10 transition-colors"
                              >
                                Iniciar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {!isLoading && totalCount > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={20}
          onPageChange={setPage}
        />
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nueva Cita"
        maxWidth="max-w-xl"
      >
        <CreateAppointmentForm
          onSuccess={() => setShowModal(false)}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
}
