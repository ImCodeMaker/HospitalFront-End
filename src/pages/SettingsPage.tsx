import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { settingsApi, type UpdateUserRequest } from "@/api/settings";
import { consultFieldTemplatesApi, type ConsultFieldType, type CreateConsultFieldTemplateRequest } from "@/api/consultFieldTemplates";
import { ncfApi, type CreateNcfRangeRequest } from "@/api/ncf";
import { NCF_TYPE_LABEL, type NcfType } from "@/types/billing";
import { Modal } from "@/components/ui/Modal";
import { SkeletonRow } from "@/components/ui/Skeleton";
import type { UpdateClinicSettingsRequest, CreateUserRequest, CreateSpecialtyRequest, UserDto } from "@/types/settings";
import type { UserRole } from "@/store/authStore";

const INPUT = "bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500 w-full";
const SELECT = INPUT + " appearance-none cursor-pointer";
const LABEL = "block text-xs font-medium text-slate-400 mb-1";

type Tab = "clinic" | "users" | "specialties" | "insurance" | "templates" | "ncf";

const FIELD_TYPES: { value: ConsultFieldType; label: string }[] = [
  { value: "text", label: "Texto corto" },
  { value: "textarea", label: "Texto largo" },
  { value: "number", label: "Número" },
  { value: "select", label: "Selección" },
  { value: "checkbox", label: "Casilla" },
  { value: "date", label: "Fecha" },
];

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  Admin: "Administrador", Doctor: "Doctor", Receptionist: "Recepcionista",
  Nurse: "Enfermera", LabTechnician: "Técnico Lab",
};

function formatDate(iso: string) { return new Date(iso).toLocaleDateString("es-DO", { year: "numeric", month: "short", day: "numeric" }); }

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("clinic");
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showResetPwdModal, setShowResetPwdModal] = useState(false);
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [editUserForm, setEditUserForm] = useState<UpdateUserRequest>({});
  const [pwdResetTarget, setPwdResetTarget] = useState<UserDto | null>(null);
  const [pwdResetValue, setPwdResetValue] = useState("");
  const [userForm, setUserForm] = useState<CreateUserRequest>({ email: "", password: "", firstName: "", lastName: "", role: "Doctor" });
  const [specialtyForm, setSpecialtyForm] = useState<CreateSpecialtyRequest>({ name: "" });
  const [insuranceForm, setInsuranceForm] = useState({ name: "", rnc: "", contactEmail: "", contactPhone: "" });
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>("");
  const [templateForm, setTemplateForm] = useState<CreateConsultFieldTemplateRequest>({
    specialtyId: "", fieldKey: "", label: "", fieldType: "text", isRequired: false, displayOrder: 0,
  });

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

  const { data: templateSpecialties } = useQuery({
    queryKey: ["specialties"],
    queryFn: settingsApi.listSpecialties,
    enabled: tab === "templates",
  });

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["consult-field-templates", selectedSpecialtyId],
    queryFn: () => consultFieldTemplatesApi.listBySpecialty(selectedSpecialtyId),
    enabled: tab === "templates" && !!selectedSpecialtyId,
  });

  const { data: ncfRanges, isLoading: ncfLoading } = useQuery({
    queryKey: ["ncf-ranges"],
    queryFn: ncfApi.list,
    enabled: tab === "ncf",
  });

  const [showNcfModal, setShowNcfModal] = useState(false);
  const [ncfForm, setNcfForm] = useState<CreateNcfRangeRequest>({
    type: "Consumo",
    startSequence: 1,
    maxSequence: 10000,
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });
  const createNcfMutation = useMutation({
    mutationFn: (body: CreateNcfRangeRequest) => ncfApi.create({ ...body, expirationDate: new Date(body.expirationDate).toISOString() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ncf-ranges"] }); setShowNcfModal(false); },
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

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => settingsApi.toggleUserActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings-users"] }),
  });

  const editUserMutation = useMutation({
    mutationFn: (body: UpdateUserRequest) => settingsApi.updateUser(editingUser!.id, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings-users"] }); setShowEditUserModal(false); setEditingUser(null); },
  });

  const resetPwdMutation = useMutation({
    mutationFn: ({ id, pwd }: { id: string; pwd: string }) => settingsApi.resetUserPassword(id, pwd),
    onSuccess: () => { setShowResetPwdModal(false); setPwdResetTarget(null); setPwdResetValue(""); },
  });

  const createTemplateMutation = useMutation({
    mutationFn: consultFieldTemplatesApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["consult-field-templates", selectedSpecialtyId] }); setShowTemplateModal(false); },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: consultFieldTemplatesApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["consult-field-templates", selectedSpecialtyId] }),
  });

  const TABS: { id: Tab; label: string }[] = [
    { id: "clinic", label: "Clínica" },
    { id: "users", label: "Usuarios" },
    { id: "specialties", label: "Especialidades" },
    { id: "insurance", label: "Aseguradoras" },
    { id: "templates", label: "Plantillas de consulta" },
    { id: "ncf", label: "Comprobantes (NCF)" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-ink">Configuración</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configuración del sistema y clínica</p>
      </motion.div>

      <div className="flex gap-1 border-b border-surface-800">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? "border-brand-500 text-ink" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
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
                  {["Nombre", "Email", "Roles", "Estado", "Creado", "Acciones"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usersLoading ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={6} />) :
                  !usersData || usersData.items.length === 0 ? (
                    <tr><td colSpan={6}><div className="flex items-center justify-center py-12"><p className="text-slate-400">Sin usuarios</p></div></td></tr>
                  ) : usersData.items.map((u) => (
                    <tr key={u.id} className="border-b border-surface-800 last:border-0 hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-ink">{u.fullName}</td>
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-xs">
                          <button onClick={() => {
                            setEditingUser(u);
                            setEditUserForm({
                              firstName: u.fullName.split(" ")[0],
                              lastName: u.fullName.split(" ").slice(1).join(" "),
                              email: u.email,
                              role: u.roles[0],
                            });
                            setShowEditUserModal(true);
                          }} className="text-brand-400 hover:underline">Editar</button>
                          <button onClick={() => toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive })}
                            disabled={toggleActiveMutation.isPending}
                            className={u.isActive ? "text-amber-400 hover:underline" : "text-emerald-400 hover:underline"}>
                            {u.isActive ? "Desactivar" : "Activar"}
                          </button>
                          <button onClick={() => { setPwdResetTarget(u); setPwdResetValue(""); setShowResetPwdModal(true); }}
                            className="text-slate-400 hover:underline">Contraseña</button>
                        </div>
                      </td>
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
                        <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
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
                        <td className="px-4 py-3 font-medium text-ink">{ic.name}</td>
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

      {tab === "templates" && (
        <motion.div key="templates" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400">Especialidad:</label>
              <select className={SELECT + " w-64"} value={selectedSpecialtyId}
                onChange={(e) => setSelectedSpecialtyId(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {templateSpecialties?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button disabled={!selectedSpecialtyId}
              onClick={() => {
                setTemplateForm({ specialtyId: selectedSpecialtyId, fieldKey: "", label: "", fieldType: "text", isRequired: false, displayOrder: (templates?.length ?? 0) + 1 });
                setShowTemplateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              + Nueva Plantilla
            </button>
          </div>
          <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
            {!selectedSpecialtyId ? (
              <div className="flex items-center justify-center py-12"><p className="text-slate-400 text-sm">Selecciona una especialidad para ver sus plantillas</p></div>
            ) : templatesLoading ? (
              <div className="flex items-center justify-center py-12"><span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
            ) : !templates || templates.length === 0 ? (
              <div className="flex items-center justify-center py-12"><p className="text-slate-400 text-sm">Sin plantillas para esta especialidad</p></div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-surface-800">
                  {["Orden", "Clave", "Etiqueta", "Tipo", "Requerido", ""].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}
                </tr></thead>
                <tbody>
                  {templates.slice().sort((a, b) => a.displayOrder - b.displayOrder).map((t) => (
                    <tr key={t.id} className="border-b border-surface-800 last:border-0 hover:bg-surface-800/30">
                      <td className="px-4 py-3 text-slate-400">{t.displayOrder}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">{t.fieldKey}</td>
                      <td className="px-4 py-3 text-ink">{t.label}</td>
                      <td className="px-4 py-3 text-slate-400">{FIELD_TYPES.find((ft) => ft.value === t.fieldType)?.label ?? t.fieldType}</td>
                      <td className="px-4 py-3">
                        {t.isRequired && <span className="text-xs text-amber-400">✓</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteTemplateMutation.mutate(t.id)}
                          disabled={deleteTemplateMutation.isPending}
                          className="text-xs text-red-400 hover:underline">Eliminar</button>
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
            <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-ink hover:bg-surface-800">Cancelar</button>
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
            <button type="button" onClick={() => setShowSpecialtyModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-ink hover:bg-surface-800">Cancelar</button>
            <button type="submit" disabled={createSpecialtyMutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
              {createSpecialtyMutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Crear
            </button>
          </div>
        </form>
      </Modal>

      {tab === "ncf" && (
        <motion.div key="ncf" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-ink">Rangos NCF autorizados (DGII)</h2>
              <p className="text-xs text-ink/50 mt-1">Cada factura consume un número del rango activo del tipo seleccionado.</p>
            </div>
            <button onClick={() => setShowNcfModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
              + Nuevo rango
            </button>
          </div>
          <div className="bg-surface-100 border border-surface-700/40 rounded-2xl overflow-hidden">
            {ncfLoading ? <div className="flex items-center justify-center py-12"><span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
              : !ncfRanges || ncfRanges.length === 0 ? <p className="text-center text-ink/50 py-12 text-sm">Sin rangos configurados</p>
              : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-surface-700/40">
                    {["Tipo", "Actual", "Máximo", "Restante", "Expira", "Estado"].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {ncfRanges.map((r) => {
                      const expSoon = !r.isExpired && new Date(r.expirationDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
                      const lowRemaining = r.remaining < 100 && !r.isExhausted;
                      const status =
                        r.isExpired ? { label: "Expirado", cls: "bg-rose-200 text-rose-700" }
                        : r.isExhausted ? { label: "Agotado", cls: "bg-rose-200 text-rose-700" }
                        : !r.isActive ? { label: "Inactivo", cls: "bg-slate-200 text-slate-700" }
                        : lowRemaining ? { label: "Bajo stock", cls: "bg-amber-200 text-amber-700" }
                        : expSoon ? { label: "Expira pronto", cls: "bg-amber-200 text-amber-700" }
                        : { label: "Activo", cls: "bg-mint-200 text-mint-700" };
                      return (
                        <tr key={r.id} className="border-b border-surface-700/40 last:border-0 hover:bg-surface-200/40">
                          <td className="px-4 py-3 font-medium text-ink">{r.prefix} — {NCF_TYPE_LABEL[r.type]}</td>
                          <td className="px-4 py-3 font-mono text-ink/80">{r.currentSequence.toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono text-ink/80">{r.maxSequence.toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono text-ink/80">{r.remaining.toLocaleString()}</td>
                          <td className="px-4 py-3 text-ink/60">{new Date(r.expirationDate).toLocaleDateString("es-DO")}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}>{status.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
          </div>
        </motion.div>
      )}

      <Modal open={showNcfModal} onClose={() => setShowNcfModal(false)} title="Nuevo rango NCF" maxWidth="max-w-md">
        <form onSubmit={(e) => { e.preventDefault(); createNcfMutation.mutate(ncfForm); }} className="flex flex-col gap-3">
          <div>
            <label className={LABEL}>Tipo *</label>
            <select className={SELECT} value={ncfForm.type} onChange={(e) => setNcfForm((p) => ({ ...p, type: e.target.value as NcfType }))}>
              {(Object.keys(NCF_TYPE_LABEL) as NcfType[]).map((t) => <option key={t} value={t}>{NCF_TYPE_LABEL[t]}</option>)}
            </select>
            <p className="text-xs text-ink/50 mt-1">Si ya hay un rango activo del mismo tipo, se desactivará automáticamente.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Inicio *</label><input type="number" min={1} className={INPUT} value={ncfForm.startSequence} onChange={(e) => setNcfForm((p) => ({ ...p, startSequence: Number(e.target.value) }))} required /></div>
            <div><label className={LABEL}>Máximo *</label><input type="number" min={1} className={INPUT} value={ncfForm.maxSequence} onChange={(e) => setNcfForm((p) => ({ ...p, maxSequence: Number(e.target.value) }))} required /></div>
          </div>
          <div><label className={LABEL}>Fecha de expiración *</label><input type="date" className={INPUT} value={ncfForm.expirationDate.slice(0, 10)} onChange={(e) => setNcfForm((p) => ({ ...p, expirationDate: e.target.value }))} required /></div>
          {createNcfMutation.isError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al crear rango.</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowNcfModal(false)} className="px-4 py-2 rounded-lg text-sm text-ink/60 hover:text-ink hover:bg-surface-200">Cancelar</button>
            <button type="submit" disabled={createNcfMutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
              {createNcfMutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Registrar rango
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={showEditUserModal} onClose={() => setShowEditUserModal(false)} title={editingUser ? `Editar ${editingUser.fullName}` : "Editar Usuario"} maxWidth="max-w-md">
        <form onSubmit={(e) => { e.preventDefault(); editUserMutation.mutate(editUserForm); }} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Nombre</label><input className={INPUT} value={editUserForm.firstName ?? ""} onChange={(e) => setEditUserForm((p) => ({ ...p, firstName: e.target.value }))} /></div>
            <div><label className={LABEL}>Apellido</label><input className={INPUT} value={editUserForm.lastName ?? ""} onChange={(e) => setEditUserForm((p) => ({ ...p, lastName: e.target.value }))} /></div>
          </div>
          <div><label className={LABEL}>Email</label><input type="email" className={INPUT} value={editUserForm.email ?? ""} onChange={(e) => setEditUserForm((p) => ({ ...p, email: e.target.value }))} /></div>
          <div>
            <label className={LABEL}>Rol</label>
            <select className={SELECT} value={editUserForm.role ?? ""} onChange={(e) => setEditUserForm((p) => ({ ...p, role: e.target.value as UserRole }))}>
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          {editUserMutation.isError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al actualizar.</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowEditUserModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-ink hover:bg-surface-800">Cancelar</button>
            <button type="submit" disabled={editUserMutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
              {editUserMutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={showResetPwdModal} onClose={() => setShowResetPwdModal(false)} title={pwdResetTarget ? `Restablecer contraseña de ${pwdResetTarget.fullName}` : "Restablecer contraseña"} maxWidth="max-w-sm">
        <form onSubmit={(e) => { e.preventDefault(); if (pwdResetTarget) resetPwdMutation.mutate({ id: pwdResetTarget.id, pwd: pwdResetValue }); }} className="flex flex-col gap-3">
          <div>
            <label className={LABEL}>Nueva contraseña *</label>
            <input type="password" className={INPUT} value={pwdResetValue} onChange={(e) => setPwdResetValue(e.target.value)} required minLength={8} />
            <p className="text-xs text-slate-500 mt-1">Mínimo 8 caracteres. El usuario deberá usar esta contraseña en su próximo inicio de sesión.</p>
          </div>
          {resetPwdMutation.isError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al restablecer.</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowResetPwdModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-ink hover:bg-surface-800">Cancelar</button>
            <button type="submit" disabled={resetPwdMutation.isPending || !pwdResetValue} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
              {resetPwdMutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Restablecer
            </button>
          </div>
        </form>
      </Modal>

      {/* Template Modal */}
      <Modal open={showTemplateModal} onClose={() => setShowTemplateModal(false)} title="Nueva Plantilla" maxWidth="max-w-md">
        <form onSubmit={(e) => { e.preventDefault(); createTemplateMutation.mutate(templateForm); }} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Clave *</label><input className={INPUT + " font-mono"} placeholder="ej: chief_complaint" value={templateForm.fieldKey} onChange={(e) => setTemplateForm((p) => ({ ...p, fieldKey: e.target.value }))} required /></div>
            <div><label className={LABEL}>Orden *</label><input type="number" className={INPUT} value={templateForm.displayOrder} onChange={(e) => setTemplateForm((p) => ({ ...p, displayOrder: Number(e.target.value) }))} required /></div>
          </div>
          <div><label className={LABEL}>Etiqueta *</label><input className={INPUT} value={templateForm.label} onChange={(e) => setTemplateForm((p) => ({ ...p, label: e.target.value }))} required /></div>
          <div>
            <label className={LABEL}>Tipo *</label>
            <select className={SELECT} value={templateForm.fieldType} onChange={(e) => setTemplateForm((p) => ({ ...p, fieldType: e.target.value as ConsultFieldType }))}>
              {FIELD_TYPES.map((ft) => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
            </select>
          </div>
          {templateForm.fieldType === "select" && (
            <div>
              <label className={LABEL}>Opciones (JSON array)</label>
              <input className={INPUT + " font-mono"} placeholder='["A","B","C"]' value={templateForm.fieldOptions ?? ""} onChange={(e) => setTemplateForm((p) => ({ ...p, fieldOptions: e.target.value }))} />
            </div>
          )}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={templateForm.isRequired} onChange={(e) => setTemplateForm((p) => ({ ...p, isRequired: e.target.checked }))} className="w-4 h-4 rounded" />
            <span className="text-sm text-slate-300">Campo requerido</span>
          </label>
          {createTemplateMutation.isError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">Error al crear.</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowTemplateModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-ink hover:bg-surface-800">Cancelar</button>
            <button type="submit" disabled={createTemplateMutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
              {createTemplateMutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
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
            <button type="button" onClick={() => setShowInsuranceModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-ink hover:bg-surface-800">Cancelar</button>
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
