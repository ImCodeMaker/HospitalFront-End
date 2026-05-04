import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { settingsApi } from "@/api/settings";
import { Modal } from "@/components/ui/Modal";
import { SkeletonRow } from "@/components/ui/Skeleton";
import type { UpdateClinicSettingsRequest, CreateUserRequest, CreateSpecialtyRequest } from "@/types/settings";
import type { UserRole } from "@/store/authStore";

const INPUT = "bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500 w-full";
const SELECT = INPUT + " appearance-none cursor-pointer";
const LABEL = "block text-xs font-medium text-slate-400 mb-1";

type Tab = "clinic" | "users" | "specialties" | "insurance";

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  Admin: "Administrador", Doctor: "Doctor", Receptionist: "Recepcionista",
  Nurse: "Enfermera", LabTechnician: "Técnico Lab",
};

function formatDate(iso: string) { return new Date(iso).toLocaleDateString("es-DO", { year: "numeric", month: "short", day: "numeric" }); }

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("clinic");
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [userForm, setUserForm] = useState<CreateUserRequest>({ email: "", password: "", firstName: "", lastName: "", role: "Doctor" });
  const [specialtyForm, setSpecialtyForm] = useState<CreateSpecialtyRequest>({ name: "" });
  const [insuranceForm, setInsuranceForm] = useState({ name: "", rnc: "", contactEmail: "", contactPhone: "" });

  const { data: clinicSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["clinic-settings"],
    queryFn: settingsApi.getClinicSettings,
    enabled: tab === "clinic",
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["settings-users"],
    queryFn: () => settingsApi.listUsers(),
    enabled: tab === "users",
  });

  const { data: specialties, isLoading: spLoading } = useQuery({
    queryKey: ["specialties"],
    queryFn: settingsApi.listSpecialties,
    enabled: tab === "specialties",
  });

  const { data: insuranceCompanies, isLoading: insLoading } = useQuery({
    queryKey: ["insurance-companies"],
    queryFn: settingsApi.listInsuranceCompanies,
    enabled: tab === "insurance",
  });

  const [settingsForm, setSettingsForm] = useState<UpdateClinicSettingsRequest | null>(null);

  const updateSettingsMutation = useMutation({
    mutationFn: settingsApi.updateClinicSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clinic-settings"] }),
  });

  const createUserMutation = useMutation({
    mutationFn: settingsApi.createUser,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings-users"] }); setShowUserModal(false); },
  });

  const createSpecialtyMutation = useMutation({
    mutationFn: settingsApi.createSpecialty,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["specialties"] }); setShowSpecialtyModal(false); },
  });

  const createInsuranceMutation = useMutation({
    mutationFn: settingsApi.createInsuranceCompany,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["insurance-companies"] }); setShowInsuranceModal(false); },
  });

  const TABS: { id: Tab; label: string }[] = [
    { id: "clinic", label: "Clínica" },
    { id: "users", label: "Usuarios" },
    { id: "specialties", label: "Especialidades" },
    { id: "insurance", label: "Aseguradoras" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configuración del sistema y clínica</p>
      </motion.div>

      <div className="flex gap-1 border-b border-surface-800">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? "border-brand-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "clinic" && (
        <motion.div key="clinic" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          {settingsLoading ? (
            <div className="flex items-center justify-center py-20"><span className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
          ) : clinicSettings ? (
            <form onSubmit={(e) => {
              e.preventDefault();
              const data = settingsForm ?? {
                clinicName: clinicSettings.clinicName, rnc: clinicSettings.rnc, address: clinicSettings.address,
                phone: clinicSettings.phone, email: clinicSettings.email, timeZone: clinicSettings.timeZone,
                currency: clinicSettings.currency, itbisRate: clinicSettings.itbisRate,
                emailNotificationsEnabled: clinicSettings.emailNotificationsEnabled,
                smsNotificationsEnabled: clinicSettings.smsNotificationsEnabled,
                sessionTimeoutMinutes: clinicSettings.sessionTimeoutMinutes,
              };
              updateSettingsMutation.mutate(data);
            }}>
              <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-slate-300 mb-4">Información de la Clínica</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "clinicName", label: "Nombre de la clínica", type: "text" },
                    { key: "rnc", label: "RNC", type: "text" },
                    { key: "phone", label: "Teléfono", type: "text" },
                    { key: "email", label: "Email", type: "email" },
                    { key: "address", label: "Dirección", type: "text" },
                    { key: "itbisRate", label: "Tasa ITBIS (%)", type: "number" },
                    { key: "sessionTimeoutMinutes", label: "Timeout de sesión (min)", type: "number" },
                  ].map(({ key, label, type }) => (
                    <div key={key} className={key === "address" ? "col-span-2" : ""}>
                      <label className={LABEL}>{label}</label>
                      <input type={type} className={INPUT}
                        defaultValue={(clinicSettings as unknown as Record<string, unknown>)[key] as string ?? ""}
                        onChange={(e) => setSettingsForm((p) => ({ ...(p ?? clinicSettings as unknown as UpdateClinicSettingsRequest), [key]: type === "number" ? Number(e.target.value) : e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-6 mt-4">
                  {[
                    { key: "emailNotificationsEnabled", label: "Notificaciones por Email" },
                    { key: "smsNotificationsEnabled", label: "Notificaciones por SMS" },
                  ].map(({ key, label }) => {
                    const val = settingsForm ? (settingsForm as unknown as Record<string, unknown>)[key] as boolean : (clinicSettings as unknown as Record<string, unknown>)[key] as boolean;
                    return (
                      <label key={key} className="flex items-center gap-3 cursor-pointer">
                        <div onClick={() => setSettingsForm((p) => ({ ...(p ?? (clinicSettings as unknown as UpdateClinicSettingsRequest)), [key]: !val }))}
                          className={`relative w-10 h-5 rounded-full transition-colors ${val ? "bg-brand-600" : "bg-surface-700"}`}>
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${val ? "translate-x-5" : "translate-x-0"}`} />
                        </div>
                        <span className="text-sm text-slate-300">{label}</span>
                      </label>
                    );
                  })}
                </div>
                {updateSettingsMutation.isError && <p className="text-sm text-red-400 mt-3">Error al guardar.</p>}
                <div className="flex justify-end mt-5">
                  <button type="submit" disabled={updateSettingsMutation.isPending}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
                    {updateSettingsMutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {updateSettingsMutation.isSuccess ? "✓ Guardado" : "Guardar Cambios"}
                  </button>
                </div>
              </div>
            </form>
          ) : null}
        </motion.div>
      )}

      {tab === "users" && (
        <motion.div key="users" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          <div className="flex justify-end">
            <button onClick={() => setShowUserModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
              + Nuevo Usuario
            </button>
          </div>
          <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800">
                  {["Nombre", "Email", "Roles", "Estado", "Creado"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usersLoading ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />) :
                  !usersData || usersData.items.length === 0 ? (
                    <tr><td colSpan={5}><div className="flex items-center justify-center py-12"><p className="text-slate-400">Sin usuarios</p></div></td></tr>
                  ) : usersData.items.map((u) => (
                    <tr key={u.id} className="border-b border-surface-800 last:border-0 hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{u.fullName}</td>
                      <td className="px-4 py-3 text-slate-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <span key={r} className="text-xs bg-brand-500/10 text-brand-400 rounded-full px-2 py-0.5">{ROLE_LABELS[r] ?? r}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"}`}>
                          {u.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {tab === "specialties" && (
        <motion.div key="specialties" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          <div className="flex justify-end">
            <button onClick={() => { setSpecialtyForm({ name: "" }); setShowSpecialtyModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
              + Nueva Especialidad
            </button>
          </div>
          <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
            {spLoading ? <div className="flex items-center justify-center py-12"><span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
              : !specialties || specialties.length === 0 ? <div className="flex items-center justify-center py-12"><p className="text-slate-400 text-sm">Sin especialidades</p></div>
              : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-surface-800">
                    {["Nombre", "Descripción", "Estado"].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {specialties.map((s) => (
                      <tr key={s.id} className="border-b border-surface-800 last:border-0 hover:bg-surface-800/30">
                        <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                        <td className="px-4 py-3 text-slate-400">{s.description || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"}`}>
                            {s.isActive ? "Activa" : "Inactiva"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </motion.div>
      )}

      {tab === "insurance" && (
        <motion.div key="insurance" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          <div className="flex justify-end">
            <button onClick={() => { setInsuranceForm({ name: "", rnc: "", contactEmail: "", contactPhone: "" }); setShowInsuranceModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
              + Nueva Aseguradora
            </button>
          </div>
          <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
            {insLoading ? <div className="flex items-center justify-center py-12"><span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
              : !insuranceCompanies || insuranceCompanies.length === 0 ? <div className="flex items-center justify-center py-12"><p className="text-slate-400 text-sm">Sin aseguradoras</p></div>
              : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-surface-800">
                    {["Nombre", "RNC", "Email", "Teléfono", "Estado"].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {insuranceCompanies.map((ic) => (
                      <tr key={ic.id} className="border-b border-surface-800 last:border-0 hover:bg-surface-800/30">
                        <td className="px-4 py-3 font-medium text-white">{ic.name}</td>
                        <td className="px-4 py-3 text-slate-400">{ic.rnc || "—"}</td>
                        <td className="px-4 py-3 text-slate-400">{ic.contactEmail || "—"}</td>
                        <td className="px-4 py-3 text-slate-400">{ic.contactPhone || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ic.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"}`}>
                            {ic.isActive ? "Activa" : "Inactiva"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </motion.div>
      )}

      {/* User Modal */}
      <Modal open={showUserModal} onClose={() => setShowUserModal(false)} title="Nuevo Usuario" maxWidth="max-w-md">
        <form onSubmit={(e) => { e.preventDefault(); createUserMutation.mutate(userForm); }} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Nombre *</label><input className={INPUT} value={userForm.firstName} onChange={(e) => setUserForm((p) => ({ ...p, firstName: e.target.value }))} required /></div>
            <div><label className={LABEL}>Apellido *</label><input className={INPUT} value={userForm.lastName} onChange={(e) => setUserForm((p) => ({ ...p, lastName: e.target.value }))} required /></div>
          </div>
          <div><label className={LABEL}>Email *</label><input type="email" className={INPUT} value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} required /></div>
          <div><label className={LABEL}>Contraseña *</label><input type="password" className={INPUT} value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} required /></div>
          <div>
            <label className={LABEL}>Rol *</label>
            <select className={SELECT} value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value as UserRole }))} required>
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          {createUserMutation.isError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al crear usuario.</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-surface-800">Cancelar</button>
            <button type="submit" disabled={createUserMutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
              {createUserMutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Crear
            </button>
          </div>
        </form>
      </Modal>

      {/* Specialty Modal */}
      <Modal open={showSpecialtyModal} onClose={() => setShowSpecialtyModal(false)} title="Nueva Especialidad" maxWidth="max-w-sm">
        <form onSubmit={(e) => { e.preventDefault(); createSpecialtyMutation.mutate(specialtyForm); }} className="flex flex-col gap-3">
          <div><label className={LABEL}>Nombre *</label><input className={INPUT} value={specialtyForm.name} onChange={(e) => setSpecialtyForm((p) => ({ ...p, name: e.target.value }))} required /></div>
          <div><label className={LABEL}>Descripción</label><input className={INPUT} value={specialtyForm.description ?? ""} onChange={(e) => setSpecialtyForm((p) => ({ ...p, description: e.target.value || undefined }))} /></div>
          {createSpecialtyMutation.isError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al crear.</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setShowSpecialtyModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-surface-800">Cancelar</button>
            <button type="submit" disabled={createSpecialtyMutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
              {createSpecialtyMutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Crear
            </button>
          </div>
        </form>
      </Modal>

      {/* Insurance Modal */}
      <Modal open={showInsuranceModal} onClose={() => setShowInsuranceModal(false)} title="Nueva Aseguradora" maxWidth="max-w-sm">
        <form onSubmit={(e) => { e.preventDefault(); createInsuranceMutation.mutate(insuranceForm); }} className="flex flex-col gap-3">
          <div><label className={LABEL}>Nombre *</label><input className={INPUT} value={insuranceForm.name} onChange={(e) => setInsuranceForm((p) => ({ ...p, name: e.target.value }))} required /></div>
          <div><label className={LABEL}>RNC</label><input className={INPUT} value={insuranceForm.rnc} onChange={(e) => setInsuranceForm((p) => ({ ...p, rnc: e.target.value }))} /></div>
          <div><label className={LABEL}>Email de contacto</label><input type="email" className={INPUT} value={insuranceForm.contactEmail} onChange={(e) => setInsuranceForm((p) => ({ ...p, contactEmail: e.target.value }))} /></div>
          <div><label className={LABEL}>Teléfono</label><input className={INPUT} value={insuranceForm.contactPhone} onChange={(e) => setInsuranceForm((p) => ({ ...p, contactPhone: e.target.value }))} /></div>
          {createInsuranceMutation.isError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al crear.</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setShowInsuranceModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-surface-800">Cancelar</button>
            <button type="submit" disabled={createInsuranceMutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
              {createInsuranceMutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Crear
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
