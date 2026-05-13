export type DocumentType = "Cedula" | "Passport" | "Other";
export type Gender = "Male" | "Female" | "Other";
export type GuardianRelationship = "Mother" | "Father" | "Sibling" | "Spouse" | "Grandparent" | "LegalGuardian" | "Other";

export const GUARDIAN_RELATIONSHIP_LABEL: Record<GuardianRelationship, string> = {
  Mother: "Madre",
  Father: "Padre",
  Sibling: "Hermano(a)",
  Spouse: "Cónyuge",
  Grandparent: "Abuelo(a)",
  LegalGuardian: "Tutor legal",
  Other: "Otro",
};
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
  guardianFirstName: string | null;
  guardianLastName: string | null;
  guardianDocumentType: DocumentType | null;
  guardianDocumentNumber: string | null;
  guardianRelationship: GuardianRelationship | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
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
  guardianFirstName?: string;
  guardianLastName?: string;
  guardianDocumentType?: DocumentType;
  guardianDocumentNumber?: string;
  guardianRelationship?: GuardianRelationship;
  guardianPhone?: string;
  guardianEmail?: string;
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
