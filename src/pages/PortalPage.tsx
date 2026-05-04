import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/axios";
import type {
  PortalProfileDto,
  PortalAppointmentDto,
  PortalConsultSummaryDto,
  PortalInvoiceDto,
} from "@/types/portal";

type Tab = "profile" | "appointments" | "consults" | "invoices";

function fmt(v: number) { return v.toLocaleString("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }); }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" }); }
function formatDateTime(iso: string) { return new Date(iso).toLocaleString("es-DO", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }

const portalApi = {
  getProfile: async (): Promise<PortalProfileDto> => {
    const { data } = await api.get<PortalProfileDto>("/portal/profile");
    return data;
  },
  getAppointments: async (upcomingOnly = false): Promise<PortalAppointmentDto[]> => {
    const { data } = await api.get<PortalAppointmentDto[]>("/portal/appointments", { params: { upcomingOnly } });
    return data;
  },
  getConsults: async (): Promise<PortalConsultSummaryDto[]> => {
    const { data } = await api.get<PortalConsultSummaryDto[]>("/portal/consults");
    return data;
  },
  getInvoices: async (): Promise<PortalInvoiceDto[]> => {
    const { data } = await api.get<PortalInvoiceDto[]>("/portal/invoices");
    return data;
  },
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-white">{value || "—"}</dd>
    </div>
  );
}

export default function PortalPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const [upcomingOnly, setUpcomingOnly] = useState(true);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["portal-profile"],
    queryFn: portalApi.getProfile,
    enabled: tab === "profile",
  });

  const { data: appointments, isLoading: apptLoading } = useQuery({
    queryKey: ["portal-appointments", upcomingOnly],
    queryFn: () => portalApi.getAppointments(upcomingOnly),
    enabled: tab === "appointments",
  });

  const { data: consults, isLoading: consultsLoading } = useQuery({
    queryKey: ["portal-consults"],
    queryFn: portalApi.getConsults,
    enabled: tab === "consults",
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["portal-invoices"],
    queryFn: portalApi.getInvoices,
    enabled: tab === "invoices",
  });

  const TABS: { id: Tab; label: string }[] = [
    { id: "profile", label: "Mi Perfil" },
    { id: "appointments", label: "Citas" },
    { id: "consults", label: "Historial Clínico" },
    { id: "invoices", label: "Facturas" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Mi Portal</h1>
        <p className="text-sm text-slate-500 mt-0.5">Acceso a tu historial médico</p>
      </motion.div>

      <div className="flex gap-1 border-b border-surface-800">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? "border-brand-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {tab === "profile" && (
          profileLoading ? <div className="flex items-center justify-center py-20"><span className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
          : !profile ? <p className="text-slate-400 text-sm">Sin datos de perfil</p>
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-slate-300 mb-4">Información Personal</h2>
                <dl className="grid grid-cols-2 gap-4">
                  <InfoRow label="Nombre completo" value={profile.fullName} />
                  <InfoRow label="Fecha de nacimiento" value={formatDate(profile.birthDate)} />
                  <InfoRow label="Edad" value={`${profile.age} años`} />
                  <InfoRow label="Género" value={profile.gender === "Male" ? "Masculino" : profile.gender === "Female" ? "Femenino" : "Otro"} />
                  <InfoRow label="Documento" value={`${profile.documentType}: ${profile.documentNumber}`} />
                  <InfoRow label="Teléfono" value={profile.phone} />
                  <InfoRow label="Correo" value={profile.email} />
                  <div className="col-span-2"><InfoRow label="Dirección" value={profile.homeAddress} /></div>
                </dl>
              </div>
              <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-slate-300 mb-4">Datos Clínicos</h2>
                <dl className="grid grid-cols-2 gap-4">
                  <InfoRow label="Tipo de sangre" value={profile.bloodType} />
                  <InfoRow label="Alergias" value={profile.knownAllergies} />
                  <div className="col-span-2"><InfoRow label="Condiciones crónicas" value={profile.chronicConditions} /></div>
                </dl>
                {profile.hasInsurance && (
                  <div className="mt-4 border-t border-surface-700 pt-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Seguro Médico</h3>
                    <dl className="grid grid-cols-2 gap-4">
                      <InfoRow label="Aseguradora" value={profile.insuranceCompanyName} />
                      <InfoRow label="Póliza" value={profile.insurancePolicyNumber} />
                      <InfoRow label="Cobertura" value={profile.insuranceCoveragePercentage != null ? `${profile.insuranceCoveragePercentage}%` : undefined} />
                    </dl>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {tab === "appointments" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setUpcomingOnly(true)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${upcomingOnly ? "bg-brand-600 text-white" : "text-slate-500 hover:text-white bg-surface-800"}`}>Próximas</button>
              <button onClick={() => setUpcomingOnly(false)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!upcomingOnly ? "bg-brand-600 text-white" : "text-slate-500 hover:text-white bg-surface-800"}`}>Todas</button>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
              {apptLoading ? <div className="flex items-center justify-center py-12"><span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
                : !appointments || appointments.length === 0 ? <div className="flex items-center justify-center py-12"><p className="text-slate-400 text-sm">Sin citas</p></div>
                : (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-surface-800">
                      {["Fecha / Hora", "Tipo", "Estado", "Motivo"].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {appointments.map((a) => (
                        <tr key={a.id} className="border-b border-surface-800 last:border-0">
                          <td className="px-4 py-3 text-slate-300">{formatDateTime(a.scheduledDate)}</td>
                          <td className="px-4 py-3 text-slate-400">{a.type}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${a.status === "Confirmed" ? "bg-emerald-500/15 text-emerald-400" : a.status === "Cancelled" ? "bg-slate-500/15 text-slate-400" : "bg-blue-500/15 text-blue-400"}`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{a.reason || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          </div>
        )}

        {tab === "consults" && (
          <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
            {consultsLoading ? <div className="flex items-center justify-center py-12"><span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
              : !consults || consults.length === 0 ? <div className="flex items-center justify-center py-12"><p className="text-slate-400 text-sm">Sin historial</p></div>
              : (
                <div className="flex flex-col gap-0 divide-y divide-surface-800">
                  {consults.map((c) => (
                    <div key={c.id} className="p-5 hover:bg-surface-800/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-white">{c.specialtyName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{c.doctorName} · {formatDate(c.date)}</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.status === "Finished" ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400"}`}>
                          {c.status === "Finished" ? "Finalizada" : "Abierta"}
                        </span>
                      </div>
                      {c.diagnosisDescription && (
                        <p className="text-sm text-slate-400 mt-2">{c.diagnosisDescription}</p>
                      )}
                      {c.treatmentPlan && (
                        <p className="text-xs text-slate-500 mt-1">Plan: {c.treatmentPlan}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {tab === "invoices" && (
          <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
            {invoicesLoading ? <div className="flex items-center justify-center py-12"><span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
              : !invoices || invoices.length === 0 ? <div className="flex items-center justify-center py-12"><p className="text-slate-400 text-sm">Sin facturas</p></div>
              : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-surface-800">
                    {["Factura", "Fecha", "Total", "Pagado", "Saldo", "Estado"].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-surface-800 last:border-0">
                        <td className="px-4 py-3 font-mono text-xs text-slate-300">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(inv.createdAt)}</td>
                        <td className="px-4 py-3 text-white">{fmt(inv.totalAmount)}</td>
                        <td className="px-4 py-3 text-emerald-400">{fmt(inv.paidAmount)}</td>
                        <td className={`px-4 py-3 font-semibold ${inv.balanceDue > 0 ? "text-red-400" : "text-emerald-400"}`}>{fmt(inv.balanceDue)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${inv.status === "Paid" ? "bg-emerald-500/15 text-emerald-400" : inv.status === "AwaitingPayment" ? "bg-amber-500/15 text-amber-400" : "bg-slate-500/15 text-slate-400"}`}>
                            {inv.status === "Paid" ? "Pagada" : inv.status === "AwaitingPayment" ? "Pendiente" : inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
