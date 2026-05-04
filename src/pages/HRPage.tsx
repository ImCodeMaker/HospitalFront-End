import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { hrApi } from "@/api/hr";
import { Modal } from "@/components/ui/Modal";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import type { CreateEmployeeRequest, RecruitmentStage } from "@/types/hr";
import type { UserRole } from "@/store/authStore";

const INPUT = "bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500 w-full";
const SELECT = INPUT + " appearance-none cursor-pointer";
const LABEL = "block text-xs font-medium text-slate-400 mb-1";

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  Doctor: "Doctor", Receptionist: "Recepcionista", Nurse: "Enfermera",
  LabTechnician: "Técnico Lab", Admin: "Administrador",
};

const STAGE_COLORS: Record<RecruitmentStage, string> = {
  Applied: "bg-blue-500/15 text-blue-400", Screening: "bg-amber-500/15 text-amber-400",
  Interview: "bg-brand-500/15 text-brand-400", Offer: "bg-violet-500/15 text-violet-400",
  Hired: "bg-emerald-500/15 text-emerald-400", Rejected: "bg-red-500/15 text-red-400",
};
const STAGE_LABELS: Record<RecruitmentStage, string> = {
  Applied: "Aplicó", Screening: "Selección", Interview: "Entrevista",
  Offer: "Oferta", Hired: "Contratado", Rejected: "Rechazado",
};

function fmt(v: number) { return v.toLocaleString("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }); }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString("es-DO", { year: "numeric", month: "short", day: "numeric" }); }

type Tab = "employees" | "recruitment";

const INITIAL_EMP: CreateEmployeeRequest = {
  firstName: "", lastName: "", role: "Doctor", email: "", phone: "", hireDate: "", salary: 0,
};

export default function HRPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("employees");
  const [page, setPage] = useState(1);
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [empForm, setEmpForm] = useState<CreateEmployeeRequest>(INITIAL_EMP);

  const { data: empData, isLoading: empLoading } = useQuery({
    queryKey: ["employees", page],
    queryFn: () => hrApi.listEmployees({ page, pageSize: 20 }),
    enabled: tab === "employees",
    placeholderData: (prev) => prev,
  });

  const { data: recruitment, isLoading: recLoading } = useQuery({
    queryKey: ["recruitment"],
    queryFn: () => hrApi.listRecruitment(),
    enabled: tab === "recruitment",
  });

  const createEmpMutation = useMutation({
    mutationFn: hrApi.createEmployee,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); setShowEmpModal(false); setEmpForm(INITIAL_EMP); },
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: RecruitmentStage }) => hrApi.advanceStage(id, stage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recruitment"] }),
  });

  const employees = empData?.items ?? [];
  const totalCount = empData?.totalCount ?? 0;
  const totalPages = empData?.totalPages ?? 1;
  const setEmp = <K extends keyof CreateEmployeeRequest>(k: K, v: CreateEmployeeRequest[K]) => setEmpForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Recursos Humanos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Personal y reclutamiento</p>
        </div>
        {tab === "employees" && (
          <button onClick={() => setShowEmpModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Nuevo Empleado
          </button>
        )}
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-800">
        {(["employees", "recruitment"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? "border-brand-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
            {t === "employees" ? "Empleados" : "Reclutamiento"}
          </button>
        ))}
      </div>

      {tab === "employees" && (
        <motion.div key="employees" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800">
                  {["Empleado", "Cargo", "Email", "Teléfono", "Salario", "Desde", "Estado"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {empLoading ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={7} />) :
                  employees.length === 0 ? (
                    <tr><td colSpan={7}><div className="flex items-center justify-center py-12"><p className="text-slate-400">Sin empleados</p></div></td></tr>
                  ) : employees.map((e) => (
                    <tr key={e.id} className="border-b border-surface-800 last:border-0 hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-500/20 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-brand-400">{e.firstName[0]}{e.lastName[0]}</span>
                          </div>
                          <span className="font-medium text-white">{e.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{ROLE_LABELS[e.role] ?? e.role}</td>
                      <td className="px-4 py-3 text-slate-400">{e.email}</td>
                      <td className="px-4 py-3 text-slate-400">{e.phone}</td>
                      <td className="px-4 py-3 text-slate-300">{fmt(e.salary)}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(e.hireDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${e.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"}`}>
                          {e.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!empLoading && totalCount > 0 && <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={20} onPageChange={setPage} />}
        </motion.div>
      )}

      {tab === "recruitment" && (
        <motion.div key="recruitment" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800">
                {["Candidato", "Cargo", "Email", "Etapa", "Aplicó", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recLoading ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />) :
                !recruitment || recruitment.length === 0 ? (
                  <tr><td colSpan={6}><div className="flex items-center justify-center py-12"><p className="text-slate-400">Sin candidatos</p></div></td></tr>
                ) : recruitment.map((r) => (
                  <tr key={r.id} className="border-b border-surface-800 last:border-0 hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{r.applicantName}</td>
                    <td className="px-4 py-3 text-slate-400">{r.appliedRole}</td>
                    <td className="px-4 py-3 text-slate-400">{r.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[r.stage]}`}>{STAGE_LABELS[r.stage]}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(r.appliedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {r.stage !== "Hired" && r.stage !== "Rejected" && (
                          <button onClick={() => {
                            const next: Record<RecruitmentStage, RecruitmentStage> = { Applied: "Screening", Screening: "Interview", Interview: "Offer", Offer: "Hired", Hired: "Hired", Rejected: "Rejected" };
                            stageMutation.mutate({ id: r.id, stage: next[r.stage] });
                          }} className="px-2 py-1 rounded text-xs text-emerald-400 hover:bg-emerald-500/10">Avanzar</button>
                        )}
                        {r.stage !== "Hired" && r.stage !== "Rejected" && (
                          <button onClick={() => stageMutation.mutate({ id: r.id, stage: "Rejected" })} className="px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/10">Rechazar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Create Employee Modal */}
      <Modal open={showEmpModal} onClose={() => setShowEmpModal(false)} title="Nuevo Empleado" maxWidth="max-w-lg">
        <form onSubmit={(e) => { e.preventDefault(); createEmpMutation.mutate(empForm); }} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Nombre *</label><input className={INPUT} value={empForm.firstName} onChange={(e) => setEmp("firstName", e.target.value)} required /></div>
            <div><label className={LABEL}>Apellido *</label><input className={INPUT} value={empForm.lastName} onChange={(e) => setEmp("lastName", e.target.value)} required /></div>
            <div>
              <label className={LABEL}>Cargo *</label>
              <select className={SELECT} value={empForm.role} onChange={(e) => setEmp("role", e.target.value as UserRole)} required>
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div><label className={LABEL}>Email *</label><input type="email" className={INPUT} value={empForm.email} onChange={(e) => setEmp("email", e.target.value)} required /></div>
            <div><label className={LABEL}>Teléfono *</label><input className={INPUT} value={empForm.phone} onChange={(e) => setEmp("phone", e.target.value)} required /></div>
            <div><label className={LABEL}>Fecha de contratación *</label><input type="date" className={INPUT} value={empForm.hireDate} onChange={(e) => setEmp("hireDate", e.target.value)} required /></div>
            <div><label className={LABEL}>Salario (RD$) *</label><input type="number" min={0} className={INPUT} value={empForm.salary || ""} onChange={(e) => setEmp("salary", Number(e.target.value))} required /></div>
            <div><label className={LABEL}>No. Licencia</label><input className={INPUT} value={empForm.licenseNumber ?? ""} onChange={(e) => setEmp("licenseNumber", e.target.value || undefined)} /></div>
          </div>
          {createEmpMutation.isError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al crear empleado.</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowEmpModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-surface-800">Cancelar</button>
            <button type="submit" disabled={createEmpMutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
              {createEmpMutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Crear
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
