export type LabPriority = "Routine" | "Urgent" | "Stat";
export type LabOrderStatus = "Pending" | "InProgress" | "Completed" | "Cancelled";
export type LabResultFlag = "Normal" | "Low" | "High" | "Critical";

export interface LabOrderDto {
  id: string;
  consultId: string;
  patientId: string;
  patientName: string;
  orderedByDoctorId: string;
  doctorName: string;
  testName: string;
  testCategory?: string | null;
  priority: LabPriority;
  status: LabOrderStatus;
  clinicalIndication?: string | null;
  sampleType?: string | null;
  isExternal: boolean;
  externalLabName?: string | null;
  sampleCollectedAt?: string | null;
  resultsAvailableAt?: string | null;
  resultReviewedByDoctor: boolean;
  createdAt: string;
  results: LabResultDto[];
}

export interface LabResultDto {
  id: string;
  testName: string;
  value?: string | null;
  unit?: string | null;
  referenceRange?: string | null;
  flag: LabResultFlag;
  notes?: string | null;
  resultFilePath?: string | null;
}

export interface CreateLabOrderRequest {
  consultId: string;
  testName: string;
  testCategory?: string;
  priority: LabPriority;
  clinicalIndication?: string;
  sampleType?: string;
  isExternal?: boolean;
  externalLabName?: string;
}

export interface AddLabResultRequest {
  testName: string;
  value?: string;
  unit?: string;
  referenceRange?: string;
  flag: LabResultFlag;
  notes?: string;
}

export interface LabOrderListParams {
  status?: LabOrderStatus | "";
  priority?: LabPriority | "";
}

export interface PatchLabOrderStatusRequest {
  status: LabOrderStatus;
}
