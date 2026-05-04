export type AppointmentType =
  | "Consultation"
  | "FollowUp"
  | "Emergency"
  | "Procedure"
  | "LabWork";

export type AppointmentStatus =
  | "Scheduled"
  | "Confirmed"
  | "InProgress"
  | "Attended"
  | "NoShow"
  | "Cancelled"
  | "Rescheduled";

export interface AppointmentDto {
  id: string;
  patientId: string;
  patientName: string;
  assignedDoctorId: string;
  assignedDoctorName?: string;
  scheduledDate: string;
  durationMinutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  reminderSent: boolean;
  createdAt: string;
}

export interface CreateAppointmentRequest {
  patientId: string;
  assignedDoctorId: string;
  scheduledDate: string;
  durationMinutes: number;
  type: AppointmentType;
  reason?: string;
}

export interface UpdateAppointmentRequest {
  patientId: string;
  assignedDoctorId: string;
  scheduledDate: string;
  durationMinutes: number;
  type: AppointmentType;
  reason?: string;
  notes?: string;
}

export interface PatchAppointmentStatusRequest {
  status: AppointmentStatus;
}

export interface AppointmentListParams {
  doctorId?: string;
  patientId?: string;
  status?: AppointmentStatus | "";
  from?: string;
  to?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface AppointmentPaginatedResult {
  items: AppointmentDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}
