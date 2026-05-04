import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { patientsApi } from "@/api/patients";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import type {
  PatientStatus,
  DocumentType,
  Gender,
  BloodType,
  CreatePatientRequest,
} from "@/types/patients";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-DO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function genderLabel(g: Gender) {
  return g === "Male" ? "Masculino" : g === "Female" ? "Femenino" : "Otro";
}

function validateCedula(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 11) return "La cédula debe tener 11 dígitos (XXX-XXXXXXX-X)";
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let n = parseInt(digits[i]) * (i % 2 === 0 ? 1 : 2);
    if (n >= 10) n = Math.floor(n / 10) + (n % 10);
    sum += n;
  }
  const check = (10 - (sum % 10)) % 10;
  if (check !== parseInt(digits[10])) return "Número de cédula dominicana inválido";
  return null;
}

function validatePassport(raw: string): string | null {
  if (!/^[A-Z]{2}\d{7}$/i.test(raw.trim())) return "Formato de pasaporte inválido (ej: AB1234567)";
  return null;
}

function validateDocument(type: DocumentType, number: string): string | null {
  if (!number) return null;
  if (type === "Cedula") return validateCedula(number);
  if (type === "Passport") return validatePassport(number);
  return null;
}

const STATUS_OPTIONS: { value: PatientStatus | ""; label: string }[] = [
  { value: "", label: "Todos los estados" },
  { value: "Active", label: "Activo" },
  { value: "Inactive", label: "Inactivo" },
  { value: "PendingVerification", label: "Pendiente" },
  { value: "Suspended", label: "Suspendido" },
  { value: "Archived", label: "Archivado" },
  { value: "Deceased", label: "Fallecido" },
];

// ── Input style ──────────────────────────────────────────────────────────────

const INPUT =
  "bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500 w-full";
const SELECT = INPUT + " appearance-none cursor-pointer";
const LABEL = "block text-xs font-medium text-slate-400 mb-1";

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <tr>
      <td colSpan={8}>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <svg
            className="w-14 h-14 text-surface-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-slate-400 font-medium">
            {hasSearch
              ? "No se encontraron pacientes con ese criterio"
              : "No hay pacientes registrados"}
          </p>
          {!hasSearch && (
            <p className="text-slate-600 text-sm">
              Crea el primer paciente con el botón de arriba
            </p>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Create Patient Form ───────────────────────────────────────────────────────

const INITIAL_FORM: CreatePatientRequest = {
  firstName: "",
  lastName: "",
  documentType: "Cedula",
  documentNumber: "",
  nationality: "Dominicana",
  homeAddress: "",
  birthDate: "",
  gender: "Male",
  email: "",
  phone: "",
  bloodType: undefined,
  knownAllergies: "",
  chronicConditions: "",
  hasInsurance: false,
  insuranceCompanyId: "",
  insurancePolicyNumber: "",
  insurancePolicyHolderName: "",
  insuranceCoveragePercentage: undefined,
};

interface CreatePatientFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function CreatePatientForm({ onSuccess, onCancel }: CreatePatientFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreatePatientRequest>(INITIAL_FORM);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: CreatePatientRequest) => patientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      onSuccess();
    },
  });

  const apiError = useMemo<string | null>(() => {
    if (!mutation.error) return null;
    const data = (mutation.error as { response?: { data?: { error?: string; errors?: Record<string, string[]> } } })?.response?.data;
    if (data?.errors) return Object.values(data.errors).flat().join(" · ");
    if (data?.error) return data.error;
    return "Error al crear el paciente. Verifica los datos e intenta de nuevo.";
  }, [mutation.error]);

  const set =<K extends keyof CreatePatientRequest>(
    key: K,
    value: CreatePatientRequest[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleDuplicateCheck = useCallback(async () => {
    if (!form.documentType || !form.documentNumber) return;
    setCheckingDuplicate(true);
    try {
      const result = await patientsApi.checkDuplicate(
        form.documentType,
        form.documentNumber
      );
      if (result.isDuplicate) {
        setDuplicateWarning(
          `Ya existe un paciente con este documento: ${result.existingPatientName ?? "Desconocido"}`
        );
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      setDuplicateWarning(null);
    } finally {
      setCheckingDuplicate(false);
    }
  }, [form.documentType, form.documentNumber]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (duplicateWarning) return;

    const payload: CreatePatientRequest = {
      ...form,
      email: form.email || undefined,
      phone: form.phone || undefined,
      bloodType: form.bloodType || undefined,
      knownAllergies: form.knownAllergies || undefined,
      chronicConditions: form.chronicConditions || undefined,
      insuranceCompanyId: form.hasInsurance ? form.insuranceCompanyId || undefined : undefined,
      insurancePolicyNumber: form.hasInsurance ? form.insurancePolicyNumber || undefined : undefined,
      insurancePolicyHolderName: form.hasInsurance ? form.insurancePolicyHolderName || undefined : undefined,
      insuranceCoveragePercentage: form.hasInsurance ? form.insuranceCoveragePercentage : undefined,
    };

    mutation.mutate(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Personal data */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Nombre *</label>
          <input
            className={INPUT}
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            required
            placeholder="Juan"
          />
        </div>
        <div>
          <label className={LABEL}>Apellido *</label>
          <input
            className={INPUT}
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            required
            placeholder="Pérez"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Tipo de Documento *</label>
          <select
            className={SELECT}
            value={form.documentType}
            onChange={(e) => {
              const t = e.target.value as DocumentType;
              set("documentType", t);
              setDocError(validateDocument(t, form.documentNumber));
            }}
            required
          >
            <option value="Cedula">Cédula</option>
            <option value="Passport">Pasaporte</option>
            <option value="Other">Otro</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Número de Documento *</label>
          <input
            className={`${INPUT} ${docError ? "border-red-500 focus:ring-red-500" : ""}`}
            value={form.documentNumber}
            onChange={(e) => {
              set("documentNumber", e.target.value);
              if (docError) setDocError(validateDocument(form.documentType, e.target.value));
            }}
            onBlur={(e) => {
              handleDuplicateCheck();
              setDocError(validateDocument(form.documentType, e.target.value));
            }}
            required
            placeholder={form.documentType === "Cedula" ? "001-0000000-0" : form.documentType === "Passport" ? "AB1234567" : ""}
          />
        </div>
      </div>

      {docError && (
        <p className="text-xs text-red-400 -mt-2">{docError}</p>
      )}
      {checkingDuplicate && (
        <p className="text-xs text-slate-400">Verificando duplicado…</p>
      )}
      {duplicateWarning && (
        <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          ⚠ {duplicateWarning}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Fecha de Nacimiento *</label>
          <input
            type="date"
            className={INPUT}
            value={form.birthDate}
            onChange={(e) => set("birthDate", e.target.value)}
            required
          />
        </div>
        <div>
          <label className={LABEL}>Género *</label>
          <select
            className={SELECT}
            value={form.gender}
            onChange={(e) => set("gender", e.target.value as Gender)}
            required
          >
            <option value="Male">Masculino</option>
            <option value="Female">Femenino</option>
            <option value="Other">Otro</option>
          </select>
        </div>
      </div>

      <div>
        <label className={LABEL}>Nacionalidad *</label>
        <input
          className={INPUT}
          value={form.nationality}
          onChange={(e) => set("nationality", e.target.value)}
          required
          placeholder="Dominicana"
        />
      </div>

      <div>
        <label className={LABEL}>Dirección *</label>
        <input
          className={INPUT}
          value={form.homeAddress}
          onChange={(e) => set("homeAddress", e.target.value)}
          required
          placeholder="Calle Principal #1, Santo Domingo"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Teléfono</label>
          <input
            className={INPUT}
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="809-000-0000"
          />
        </div>
        <div>
          <label className={LABEL}>Correo electrónico</label>
          <input
            type="email"
            className={INPUT}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="paciente@email.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Tipo de Sangre</label>
          <select
            className={SELECT}
            value={form.bloodType ?? ""}
            onChange={(e) =>
              set("bloodType", (e.target.value as BloodType) || undefined)
            }
          >
            <option value="">— Seleccionar —</option>
            {(["A+","A-","B+","B-","AB+","AB-","O+","O-"] as BloodType[]).map(
              (bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              )
            )}
          </select>
        </div>
        <div className="flex flex-col justify-end">
          {/* spacer */}
        </div>
      </div>

      <div>
        <label className={LABEL}>Alergias conocidas</label>
        <input
          className={INPUT}
          value={form.knownAllergies}
          onChange={(e) => set("knownAllergies", e.target.value)}
          placeholder="Penicilina, Ibuprofeno…"
        />
      </div>

      <div>
        <label className={LABEL}>Condiciones crónicas</label>
        <input
          className={INPUT}
          value={form.chronicConditions}
          onChange={(e) => set("chronicConditions", e.target.value)}
          placeholder="Diabetes tipo 2, Hipertensión…"
        />
      </div>

      {/* Insurance toggle */}
      <div className="border border-surface-700 rounded-xl p-4 flex flex-col gap-3">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => set("hasInsurance", !form.hasInsurance)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              form.hasInsurance ? "bg-brand-600" : "bg-surface-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                form.hasInsurance ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </div>
          <span className="text-sm font-medium text-slate-300">
            Tiene seguro médico
          </span>
        </label>

        {form.hasInsurance && (
          <div className="flex flex-col gap-3">
            <div>
              <label className={LABEL}>Número de Póliza</label>
              <input
                className={INPUT}
                value={form.insurancePolicyNumber}
                onChange={(e) =>
                  set("insurancePolicyNumber", e.target.value)
                }
                placeholder="POL-000000"
              />
            </div>
            <div>
              <label className={LABEL}>Titular de la Póliza</label>
              <input
                className={INPUT}
                value={form.insurancePolicyHolderName}
                onChange={(e) =>
                  set("insurancePolicyHolderName", e.target.value)
                }
                placeholder="Nombre del titular"
              />
            </div>
            <div>
              <label className={LABEL}>Cobertura (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                className={INPUT}
                value={form.insuranceCoveragePercentage ?? ""}
                onChange={(e) =>
                  set(
                    "insuranceCoveragePercentage",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                placeholder="80"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {mutation.isError && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {apiError}
        </p>
      )}

      {/* Actions */}
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
          disabled={mutation.isPending || !!duplicateWarning || !!docError}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {mutation.isPending && (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          Crear Paciente
        </button>
      </div>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PatientsPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PatientStatus | "">("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  // Debounce search 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["patients", debouncedSearch, statusFilter, page],
    queryFn: () =>
      patientsApi.list({ search: debouncedSearch, status: statusFilter, page, pageSize: 20 }),
    placeholderData: (prev) => prev,
  });

  const patients = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Pacientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalCount > 0 ? `${totalCount} pacientes registrados` : "Gestión de pacientes"}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Paciente
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08, duration: 0.25 }}
        className="flex gap-3 flex-wrap"
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            className="bg-surface-800 border border-surface-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500 w-full"
            placeholder="Buscar por nombre, cédula…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <select
          className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none appearance-none cursor-pointer min-w-[180px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PatientStatus | "")}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
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
            <svg className="w-12 h-12 text-red-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-slate-400">Error al cargar los pacientes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Paciente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Documento
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Edad
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Género
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Teléfono
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Registrado
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <SkeletonRow key={i} cols={8} />
                    ))
                  : patients.length === 0
                  ? <EmptyState hasSearch={!!debouncedSearch || !!statusFilter} />
                  : patients.map((patient) => (
                      <tr
                        key={patient.id}
                        onClick={() => navigate(`/patients/${patient.id}`)}
                        className="border-b border-surface-800 last:border-0 hover:bg-surface-800/50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-500/20 flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-brand-400">
                                {patient.firstName[0]}{patient.lastName[0]}
                              </span>
                            </div>
                            <span className="font-medium text-white">
                              {patient.fullName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          <span className="text-xs text-slate-500">
                            {patient.documentType === "Cedula"
                              ? "CED"
                              : patient.documentType === "Passport"
                              ? "PAS"
                              : "OTR"}
                          </span>{" "}
                          {patient.documentNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {patient.age} años
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {genderLabel(patient.gender)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={patient.status} variant="patient" />
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {patient.phone ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {formatDate(patient.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => navigate(`/patients/${patient.id}`)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-brand-400 hover:bg-brand-500/10 transition-colors"
                            >
                              Ver
                            </button>
                            <button
                              onClick={() => navigate(`/patients/${patient.id}?edit=1`)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-surface-700 hover:text-white transition-colors"
                            >
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {!isLoading && totalCount > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={20}
          onPageChange={setPage}
        />
      )}

      {/* Create Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nuevo Paciente"
        maxWidth="max-w-2xl"
      >
        <CreatePatientForm
          onSuccess={() => setShowModal(false)}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
}
