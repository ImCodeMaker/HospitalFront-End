export type DocumentType = "Cedula" | "Passport" | "Other";
export type Gender = "Male" | "Female" | "Other";
export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type PatientStatus =
  | "Active"
  | "Inactive"
  | "Archived"
  | "Suspended"
  | "PendingVerification"
  | "Deceased";

export interface PatientDto {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  nationality: string;
  homeAddress: string;
  birthDate: string;
  age: number;
  isMinor: boolean;
  gender: Gender;
  status: PatientStatus;
  email: string | null;
  phone: string | null;
  bloodType: BloodType | null;
  knownAllergies: string | null;
  chronicConditions: string | null;
  hasInsurance: boolean;
  insuranceCompanyName: string | null;
  insurancePolicyNumber: string | null;
  insuranceCoveragePercentage: number | null;
  createdAt: string;
}

export interface PatientTimelineDto {
  id: string;
  category: string;
  type: string;
  description: string;
  performedBy: string | null;
  date: string;
  referenceId: string | null;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingPatientId?: string;
  existingPatientName?: string;
}

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  nationality: string;
  homeAddress: string;
  birthDate: string;
  gender: Gender;
  email?: string;
  phone?: string;
  bloodType?: BloodType;
  knownAllergies?: string;
  chronicConditions?: string;
  hasInsurance: boolean;
  insuranceCompanyId?: string;
  insurancePolicyNumber?: string;
  insurancePolicyHolderName?: string;
  insuranceCoveragePercentage?: number;
}

export interface UpdatePatientRequest extends CreatePatientRequest {
  id: string;
}

export interface PatchPatientStatusRequest {
  status: PatientStatus;
  reason?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface PatientListParams {
  search?: string;
  status?: PatientStatus | "";
  page?: number;
  pageSize?: number;
}

export interface PatientTimelineParams {
  category?: string;
  from?: string;
  to?: string;
}
