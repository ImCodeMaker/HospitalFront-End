export type ConsultStatus = "Open" | "InProgress" | "Finished" | "Cancelled";

export interface ConsultDto {
  id: string;
  patientId: string;
  patientName: string;
  specialtyId: string;
  specialtyName: string;
  doctorId: string;
  doctorName: string;
  status: ConsultStatus;
  weightKg?: number | null;
  heightCm?: number | null;
  bmi?: number | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  heartRate?: number | null;
  temperatureCelsius?: number | null;
  o2Saturation?: number | null;
  respiratoryRate?: number | null;
  chiefComplaint?: string | null;
  clinicalObservations?: string | null;
  diagnosisCodes?: string | null;
  diagnosisDescription?: string | null;
  treatmentPlan?: string | null;
  specialtyData?: string | null;
  dentalChart?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
}

export interface CreateConsultRequest {
  patientId?: string;
  specialtyId: string;
  chiefComplaint?: string;
  quickPatient?: QuickPatientRequest;
}

export interface QuickPatientRequest {
  firstName: string;
  lastName: string;
  documentType: "Cedula" | "Passport" | "Other";
  documentNumber: string;
  birthDate: string;
  gender: "Male" | "Female" | "Other";
  nationality?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface UpdateConsultRequest {
  weightKg?: number | null;
  heightCm?: number | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  heartRate?: number | null;
  temperatureCelsius?: number | null;
  o2Saturation?: number | null;
  respiratoryRate?: number | null;
  chiefComplaint?: string | null;
  clinicalObservations?: string | null;
  diagnosisCodes?: string | null;
  diagnosisDescription?: string | null;
  treatmentPlan?: string | null;
  specialtyData?: string | null;
  dentalChart?: string | null;
}

export interface PatchConsultStatusRequest {
  status: ConsultStatus;
}

export interface ConsultListParams {
  patientId?: string;
  doctorId?: string;
  status?: ConsultStatus | "";
  page?: number;
  pageSize?: number;
}

export interface ConsultImageDto {
  id: string;
  consultId: string;
  fileName: string;
  contentType: string;
  url: string;
  uploadedAt: string;
}

export interface ConsultPaginatedResult {
  items: ConsultDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}
