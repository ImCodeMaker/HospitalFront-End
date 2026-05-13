import type { UserRole } from "@/store/authStore";

export type PayrollStatus = "Draft" | "Approved" | "Paid";
export type RecruitmentStage =
  | "Applied"
  | "Screening"
  | "Interview"
  | "Offer"
  | "Hired"
  | "Rejected";

export interface EmployeeDto {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  specialtyId?: string;
  specialtyName?: string;
  email: string;
  phone: string;
  licenseNumber?: string;
  hireDate: string;
  salary: number;
  bankAccount?: string;
  isActive: boolean;
  createdAt: string;
}

export interface EmployeePerformanceDto {
  employeeId: string;
  employeeName: string;
  from: string;
  to: string;
  patientsAttended: number;
  avgConsultMinutes: number;
  revenueGenerated: number;
  noShowRate: number;
  totalAppointments: number;
}

export interface PayrollRecordDto {
  id: string;
  employeeId: string;
  employeeName: string;
  period: string;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netSalary: number;
  status: PayrollStatus;
  notes?: string;
  approvedAt?: string;
  paidAt?: string;
}

export interface RecruitmentApplicationDto {
  id: string;
  applicantName: string;
  appliedRole: string;
  email: string;
  phone?: string;
  stage: RecruitmentStage;
  notes?: string;
  appliedAt: string;
  updatedAt: string;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  role: UserRole;
  specialtyId?: string;
  email: string;
  phone: string;
  licenseNumber?: string;
  hireDate: string;
  salary: number;
  bankAccount?: string;
}

export interface UpdateEmployeeRequest extends CreateEmployeeRequest {
  isActive: boolean;
}

export interface GeneratePayrollRequest {
  employeeId: string;
  period: string;
  baseSalary: number;
  bonuses?: number;
  deductions?: number;
  notes?: string;
}

export interface CreateRecruitmentApplicationRequest {
  applicantName: string;
  appliedRole: string;
  email: string;
  phone?: string;
  notes?: string;
}

export interface EmployeeListParams {
  role?: UserRole | "";
  status?: "Active" | "Inactive" | "";
  page?: number;
  pageSize?: number;
}

export interface EmployeePaginatedResult {
  items: EmployeeDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PayrollListParams {
  page?: number;
  pageSize?: number;
}

export interface RecruitmentListParams {
  stage?: RecruitmentStage | "";
}
