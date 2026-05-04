export interface PrescriptionDto {
  id: string;
  consultId: string;
  prescribedByDoctorId: string;
  drugName: string;
  medicationId?: string | null;
  presentation?: string | null;
  dosage: string;
  frequency: string;
  routeOfAdministration?: string | null;
  durationDays?: number | null;
  quantityToDispense?: number | null;
  specialInstructions?: string | null;
}

export interface AddPrescriptionRequest {
  consultId: string;
  drugName: string;
  dosage: string;
  frequency: string;
  durationDays?: number;
  quantityToDispense?: number;
  presentation?: string;
  routeOfAdministration?: string;
  specialInstructions?: string;
  medicationId?: string;
}

export interface DrugInteractionAlert {
  drug1: string;
  drug2: string;
  severity: "critical" | "moderate" | "minor";
  description: string;
}
