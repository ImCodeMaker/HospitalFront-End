import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { noShowApi } from "@/api/noshow";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-DO", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function NoShowPage() {
  const [days, setDays] = useState(90);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["no-show-outreach", days],
    queryFn: () => noShowApi.list(days),
  });

  const groups = data?.items ?? [];
  const repeatCount = groups.filter((g) => g.isRepeatOffender).length;

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-ink tracking-tight">No-show outreach</h1>
          <p className="text-sm text-ink/60 mt-1">Pacientes contactados tras cita perdida</p>
        </div>
        <div className="flex items-center gap-2">
          {([30, 60, 90, 180] as const).map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${days === d ? "bg-ink text-surface-100" : "bg-surface-100 text-ink/70 hover:bg-surface-200 border border-surface-700/40"}`}>
              {d}d
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-lavender-200 p-4">
          <p className="text-xs text-lavender-700">Pacientes contactados</p>
          <p className="text-3xl font-bold text-ink leading-none mt-1">{groups.length}</p>
        </div>
        <div className="rounded-2xl bg-rose-200 p-4">
          <p className="text-xs text-rose-700">Reincidentes (3+)</p>
          <p className="text-3xl font-bold text-ink leading-none mt-1">{repeatCount}</p>
        </div>
        <div className="rounded-2xl bg-mint-200 p-4">
          <p className="text-xs text-mint-700">Total contactos</p>
          <p className="text-3xl font-bold text-ink leading-none mt-1">{groups.reduce((s, g) => s + g.outreachCount, 0)}</p>
        </div>
      </div>

      <div className="bg-surface-100 border border-surface-700/40 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><span className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
        ) : groups.length === 0 ? (
          <p className="text-center text-ink/50 py-20 text-sm">Sin no-shows registrados en este período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700/40">
                {["Paciente", "Contactos", "Último contacto", "Estado", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const open = expanded === g.patientId;
                return (
                  <Fragment key={g.patientId}>
                    <tr className="border-b border-surface-700/40 hover:bg-surface-200/40 cursor-pointer"
                      onClick={() => setExpanded(open ? null : g.patientId)}>
                      <td className="px-4 py-3 font-medium text-ink">{g.patientName}</td>
                      <td className="px-4 py-3 text-ink/70">{g.outreachCount}</td>
                      <td className="px-4 py-3 text-ink/60">{formatDateTime(g.lastContactedAt)}</td>
                      <td className="px-4 py-3">
                        {g.isRepeatOffender ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-rose-200 text-rose-700">⚠ Reincidente</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-200 text-amber-700">Ocasional</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-brand-500 text-xs">{open ? "▼" : "▶"}</td>
                    </tr>
                    {open && (
                      <tr className="border-b border-surface-700/40 bg-surface-200/30">
                        <td colSpan={5} className="px-4 py-4">
                          <ul className="flex flex-col gap-2">
                            {g.entries.map((e) => (
                              <li key={e.id} className="flex items-center justify-between text-xs bg-surface-100 rounded-lg px-3 py-2 border border-surface-700/30">
                                <div className="flex flex-col">
                                  <span className="text-ink/80">{formatDateTime(e.contactedAt)}</span>
                                  <span className="text-ink/50">Cita: {e.appointmentDate ? formatDateTime(e.appointmentDate) : "—"}</span>
                                </div>
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 font-medium bg-surface-200 text-ink/70">{e.channel}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
