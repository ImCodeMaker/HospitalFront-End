import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/axios";

interface SignupRequest {
  firstName: string;
  lastName: string;
  documentType: "Cedula" | "Passport" | "Other";
  documentNumber: string;
  birthDate: string;
  gender: "Male" | "Female" | "Other";
  phone?: string;
  email?: string;
  nationality?: string;
  address?: string;
}

const INPUT = "bg-surface-100 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500 w-full";
const LABEL = "block text-xs font-medium text-ink/60 mb-1";

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SignupRequest>({
    firstName: "", lastName: "", documentType: "Cedula", documentNumber: "",
    birthDate: "", gender: "Other",
  });
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: (body: SignupRequest) => api.post("/patientsignup", body),
    onSuccess: () => setSubmitted(true),
  });

  const errorMsg = (mutation.error as { response?: { data?: { error?: string } } } | null)?.response?.data?.error;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-200 p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface-100 border border-surface-700/40 rounded-3xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-mint-200 mx-auto flex items-center justify-center text-mint-700 text-3xl">✓</div>
          <h1 className="text-2xl font-bold text-ink mt-4">Solicitud recibida</h1>
          <p className="text-sm text-ink/60 mt-2">
            Tu registro fue creado y está en revisión. Un administrador verificará tus datos y activará tu cuenta. Te contactaremos pronto.
          </p>
          <button onClick={() => navigate("/login")} className="mt-6 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white">
            Volver al inicio
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-200 p-6">
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }}
        className="bg-surface-100 border border-surface-700/40 rounded-3xl p-8 max-w-lg w-full shadow-sm flex flex-col gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-ink">Registro de paciente</h1>
          <p className="text-sm text-ink/60 mt-1">Completa tus datos. Un administrador verificará y activará tu cuenta.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className={LABEL}>Nombre *</label><input className={INPUT} value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} required /></div>
          <div><label className={LABEL}>Apellido *</label><input className={INPUT} value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} required /></div>
          <div>
            <label className={LABEL}>Tipo doc *</label>
            <select className={INPUT + " appearance-none cursor-pointer"} value={form.documentType} onChange={(e) => setForm((p) => ({ ...p, documentType: e.target.value as "Cedula" }))}>
              <option value="Cedula">Cédula</option>
              <option value="Passport">Pasaporte</option>
              <option value="Other">Otro</option>
            </select>
          </div>
          <div><label className={LABEL}>Número doc *</label><input className={INPUT} value={form.documentNumber} onChange={(e) => setForm((p) => ({ ...p, documentNumber: e.target.value }))} required /></div>
          <div><label className={LABEL}>Fecha nacimiento *</label><input type="date" className={INPUT} value={form.birthDate} onChange={(e) => setForm((p) => ({ ...p, birthDate: e.target.value }))} required /></div>
          <div>
            <label className={LABEL}>Género</label>
            <select className={INPUT + " appearance-none cursor-pointer"} value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value as "Other" }))}>
              <option value="Male">Masculino</option>
              <option value="Female">Femenino</option>
              <option value="Other">Otro</option>
            </select>
          </div>
          <div><label className={LABEL}>Teléfono</label><input className={INPUT} value={form.phone ?? ""} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value || undefined }))} /></div>
          <div><label className={LABEL}>Email</label><input type="email" className={INPUT} value={form.email ?? ""} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value || undefined }))} /></div>
        </div>

        {errorMsg && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{errorMsg}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate("/login")} className="px-4 py-2 rounded-lg text-sm font-medium text-ink/60 hover:bg-surface-200">Cancelar</button>
          <button type="submit" disabled={mutation.isPending}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2">
            {mutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Enviar solicitud
          </button>
        </div>
      </motion.form>
    </div>
  );
}
