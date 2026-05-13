import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { prescriptionsApi } from "@/api/prescriptions";
import { consultsApi } from "@/api/consults";

export default function PrescriptionsPage() {
  const navigate = useNavigate();
  const [selectedConsultId, setSelectedConsultId] = useState<string>("");

  const { data: consultsData } = useQuery({
    queryKey: ["consults-recent"],
    queryFn: () => consultsApi.list({ pageSize: 10 }),
    enabled: true,
  });

  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ["prescriptions", selectedConsultId],
    queryFn: () => prescriptionsApi.listByConsult(selectedConsultId),
    enabled: !!selectedConsultId,
  });

  const recentConsults = consultsData?.items.slice(0, 10) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Prescripciones</h1>
          <p className="text-sm text-ink/60 mt-1">Búsqueda y gestión de recetas médicas</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-surface-700/40 rounded-2xl shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_12px_rgba(15,15,15,0.04)] p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Consultas recientes</h2>
          <div className="flex flex-col gap-1">
            {recentConsults.map((c) => (
              <button key={c.id} onClick={() => setSelectedConsultId(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${selectedConsultId === c.id ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-surface-800"}`}>
                <p className="font-medium truncate">{c.patientName}</p>
                <p className="text-xs opacity-60 truncate">{c.specialtyName} · {c.doctorName}</p>
              </button>
            ))}
            {recentConsults.length === 0 && <p className="text-slate-500 text-xs py-2">Sin consultas</p>}
          </div>
        </div>

        <div className="md:col-span-2 bg-white border border-surface-700/40 rounded-2xl shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_12px_rgba(15,15,15,0.04)] p-4">
          {!selectedConsultId ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <svg className="w-10 h-10 text-surface-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500 text-sm">Selecciona una consulta</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-48"><span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
          ) : !prescriptions || prescriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <p className="text-slate-400 text-sm">Sin prescripciones en esta consulta</p>
              <button onClick={() => navigate(`/consults/${selectedConsultId}`)} className="text-brand-400 hover:underline text-xs">
                Ir a la consulta →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-slate-300">Prescripciones</h2>
                <button onClick={() => navigate(`/consults/${selectedConsultId}`)} className="text-xs text-brand-400 hover:underline">
                  Ver consulta →
                </button>
              </div>
              {prescriptions.map((rx) => (
                <div key={rx.id} className="bg-surface-100 border border-surface-700/60 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-ink font-medium">{rx.drugName}
                        {rx.presentation && <span className="text-slate-500 text-xs ml-2">{rx.presentation}</span>}
                      </p>
                      <p className="text-sm text-slate-400 mt-0.5">{rx.dosage} · {rx.frequency}{rx.durationDays && ` · ${rx.durationDays} días`}</p>
                      {rx.specialInstructions && <p className="text-xs text-slate-500 mt-0.5">{rx.specialInstructions}</p>}
                    </div>
                    {rx.routeOfAdministration && (
                      <span className="text-xs bg-surface-700 text-slate-400 rounded-lg px-2 py-1">{rx.routeOfAdministration}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
