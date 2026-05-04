import type { PatientStatus } from "@/types/patients";
import type { AppointmentStatus, AppointmentType } from "@/types/appointments";

type BadgeVariant = "patient" | "appointment" | "appointmentType";

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
}

const patientColors: Record<PatientStatus, string> = {
  Active: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  Inactive: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
  Archived: "bg-slate-600/15 text-slate-500 border border-slate-600/30",
  Suspended: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  PendingVerification:
    "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  Deceased: "bg-zinc-700/30 text-zinc-500 border border-zinc-600/30",
};

const patientLabels: Record<PatientStatus, string> = {
  Active: "Activo",
  Inactive: "Inactivo",
  Archived: "Archivado",
  Suspended: "Suspendido",
  PendingVerification: "Pendiente",
  Deceased: "Fallecido",
};

const appointmentColors: Record<AppointmentStatus, string> = {
  Scheduled: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  Confirmed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  InProgress: "bg-brand-500/15 text-brand-400 border border-brand-500/30",
  Attended: "bg-teal-500/15 text-teal-400 border border-teal-500/30",
  NoShow: "bg-red-500/15 text-red-400 border border-red-500/30",
  Cancelled: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
  Rescheduled: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
};

const appointmentLabels: Record<AppointmentStatus, string> = {
  Scheduled: "Programada",
  Confirmed: "Confirmada",
  InProgress: "En Progreso",
  Attended: "Atendida",
  NoShow: "No Asistió",
  Cancelled: "Cancelada",
  Rescheduled: "Reprogramada",
};

const typeColors: Record<AppointmentType, string> = {
  Consultation: "bg-brand-500/15 text-brand-400 border border-brand-500/30",
  FollowUp: "bg-violet-500/15 text-violet-400 border border-violet-500/30",
  Emergency: "bg-red-500/15 text-red-400 border border-red-500/30",
  Procedure: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  LabWork: "bg-teal-500/15 text-teal-400 border border-teal-500/30",
};

const typeLabels: Record<AppointmentType, string> = {
  Consultation: "Consulta",
  FollowUp: "Seguimiento",
  Emergency: "Emergencia",
  Procedure: "Procedimiento",
  LabWork: "Laboratorio",
};

export function StatusBadge({ status, variant = "patient" }: StatusBadgeProps) {
  let className = "bg-slate-500/15 text-slate-400 border border-slate-500/30";
  let label = status;

  if (variant === "patient") {
    className =
      patientColors[status as PatientStatus] ?? className;
    label = patientLabels[status as PatientStatus] ?? status;
  } else if (variant === "appointment") {
    className =
      appointmentColors[status as AppointmentStatus] ?? className;
    label = appointmentLabels[status as AppointmentStatus] ?? status;
  } else if (variant === "appointmentType") {
    className = typeColors[status as AppointmentType] ?? className;
    label = typeLabels[status as AppointmentType] ?? status;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
