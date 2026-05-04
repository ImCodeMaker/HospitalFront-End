import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { consultsApi } from "@/api/consults";
import { patientsApi } from "@/api/patients";
import { settingsApi } from "@/api/settings";
import { Modal } from "@/components/ui/Modal";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import type { ConsultStatus, CreateConsultRequest } from "@/types/consults";

const INPUT =
  "bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500 w-full";
const SELECT = INPUT + " appearance-none cursor-pointer";
const LABEL = "block text-xs font-medium text-slate-400 mb-1";

const STATUS_COLORS: Record<ConsultStatus, string> = {
  Open: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  InProgress: "bg-brand-500/15 text-brand-400 border border-brand-500/30",
  Finished: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  Cancelled: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
};
const STATUS_LABELS: Record<ConsultStatus, string> = {
  Open: "Abierta",
  InProgress: "En Progreso",
  Finished: "Finalizada",
  Cancelled: "Cancelada",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-DO", { year: "numeric", month: "short", day: "numeric" });
}

function CreateConsultForm({ onSuccess, onCancel }: { onSuccess: (id: string) => void; onCancel: () => void }) {
  const [form, setForm] = useState<CreateConsultRequest>({ patientId: "", specialtyId: "", chiefComplaint: "" });
  const [patientSearch, setPatientSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(patientSearch), 400);
    return () => clearTimeout(t);
  }, [patientSearch]);

  const { data: patientsData } = useQuery({
    queryKey: ["patients-search", debouncedSearch],
    queryFn: () => patientsApi.list({ search: debouncedSearch, pageSize: 8 }),
    enabled: debouncedSearch.length > 1,
  });
  const { data: specialties } = useQuery({ queryKey: ["specialties"], queryFn: settingsApi.listSpecialties });

  const mutation = useMutation({
    mutationFn: consultsApi.create,
    onSuccess: (c) => { queryClient.invalidateQueries({ queryKey: ["consults"] }); onSuccess(c.id); },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="flex flex-col gap-4">
      <div>
        <label className={LABEL}>Paciente *</label>
        <input className={INPUT} placeholder="Buscar paciente…" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
        {patientsData && patientsData.items.length > 0 && !form.patientId && (
          <div className="mt-1 bg-surface-800 border border-surface-700 rounded-lg overflow-hidden">
            {patientsData.items.map((p) => (
              <button key={p.id} type="button" onClick={() => { setForm((prev) => ({ ...prev, patientId: p.id })); setPatientSearch(p.fullName); }}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-surface-700 transition-colors border-b border-surface-700 last:border-0">
                {p.fullName} <span className="text-slate-500 text-xs">— {p.documentNumber}</span>
              </button>
            ))}
          </div>
        )}
        {form.patientId && <p className="text-xs text-emerald-400 mt-1">✓ Paciente seleccionado</p>}
      </div>
      <div>
        <label className={LABEL}>Especialidad *</label>
        <select className={SELECT} value={form.specialtyId} onChange={(e) => setForm((p) => ({ ...p, specialtyId: e.target.value }))} required>
          <option value="">— Seleccionar —</option>
          {specialties?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className={LABEL}>Motivo de consulta</label>
        <input className={INPUT} value={form.chiefComplaint ?? ""} onChange={(e) => setForm((p) => ({ ...p, chiefComplaint: e.target.value }))} placeholder="Motivo principal…" />
      </div>
      {mutation.isError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al crear la consulta.</p>}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-surface-800 transition-colors">Cancelar</button>
        <button type="submit" disabled={mutation.isPending || !form.patientId || !form.specialtyId}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2">
          {mutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Abrir Consulta
        </button>
      </div>
    </form>
  );
}

export default function ConsultsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<ConsultStatus | "">("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["consults", statusFilter, page],
    queryFn: () => consultsApi.list({ status: statusFilter, page, pageSize: 20 }),
    placeholderData: (prev) => prev,
  });

  const consults = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Consultas</h1>
          <p className="text-sm text-slate-500 mt-0.5">{totalCount > 0 ? `${totalCount} consultas` : "Registro de consultas"}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Nueva Consulta
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}>
        <div className="flex gap-1 p-1 bg-surface-900 border border-surface-800 rounded-xl w-fit">
          {([["", "Todas"], ["Open", "Abiertas"], ["InProgress", "En Progreso"], ["Finished", "Finalizadas"]] as [ConsultStatus | "", string][]).map(([val, label]) => (
            <button key={val} onClick={() => { setStatusFilter(val); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === val ? "bg-brand-600 text-white" : "text-slate-500 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
        {isError ? (
          <div className="flex items-center justify-center py-16"><p className="text-slate-400">Error al cargar las consultas.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800">
                  {["Paciente", "Especialidad", "Doctor", "Estado", "Motivo", "Diagnóstico", "Fecha", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={8} />) :
                  consults.length === 0 ? (
                    <tr><td colSpan={8}><div className="flex items-center justify-center py-16"><p className="text-slate-400">No hay consultas</p></div></td></tr>
                  ) : consults.map((c) => (
                    <tr key={c.id} onClick={() => navigate(`/consults/${c.id}`)}
                      className="border-b border-surface-800 last:border-0 hover:bg-surface-800/50 transition-colors cursor-pointer">
                      <td className="px-4 py-3 font-medium text-white">{c.patientName}</td>
                      <td className="px-4 py-3 text-slate-400">{c.specialtyName}</td>
                      <td className="px-4 py-3 text-slate-400">{c.doctorName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 max-w-[160px] truncate">{c.chiefComplaint || "—"}</td>
                      <td className="px-4 py-3 text-slate-400 max-w-[160px] truncate">{c.diagnosisDescription || "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3"><span className="text-brand-400 text-xs">Ver →</span></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {!isLoading && totalCount > 0 && <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={20} onPageChange={setPage} />}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nueva Consulta" maxWidth="max-w-lg">
        <CreateConsultForm onSuccess={(id) => { setShowModal(false); navigate(`/consults/${id}`); }} onCancel={() => setShowModal(false)} />
      </Modal>
    </div>
  );
}
