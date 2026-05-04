import type { BloodType, DocumentType, Gender } from "@/types/patients";
import type { InvoiceStatus } from "@/types/billing";
import type { ConsultStatus } from "@/types/consults";
import type { AppointmentStatus, AppointmentType } from "@/types/appointments";

export interface PortalProfileDto {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  birthDate: string;
  age: number;
  gender: Gender;
  email: string | null;
  phone: string | null;
  homeAddress: string;
  bloodType: BloodType | null;
  knownAllergies: string | null;
  chronicConditions: string | null;
  hasInsurance: boolean;
  insuranceCompanyName: string | null;
  insurancePolicyNumber: string | null;
  insuranceCoveragePercentage: number | null;
}

export interface PortalAppointmentDto {
  id: string;
  scheduledDate: string;
  durationMinutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  reason: string | null;
}

export interface PortalConsultSummaryDto {
  id: string;
  specialtyName: string;
  doctorName: string;
  status: ConsultStatus;
  diagnosisDescription: string | null;
  treatmentPlan: string | null;
  date: string;
}

export interface PortalInvoiceDto {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: InvoiceStatus;
  createdAt: string;
}
