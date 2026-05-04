import type { UserRole } from "@/store/authStore";

export interface ClinicSettingsDto {
  id: string;
  clinicName: string;
  rnc?: string;
  address?: string;
  phone?: string;
  email?: string;
  timeZone: string;
  currency: string;
  itbisRate: number;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  sessionTimeoutMinutes: number;
}

export interface UpdateClinicSettingsRequest {
  clinicName: string;
  rnc?: string;
  address?: string;
  phone?: string;
  email?: string;
  timeZone: string;
  currency: string;
  itbisRate: number;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  sessionTimeoutMinutes: number;
}

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  roles: UserRole[];
  isActive: boolean;
  createdAt: string;
}

export interface UserPaginatedResult {
  items: UserDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface SpecialtyDto {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface CreateSpecialtyRequest {
  name: string;
  description?: string;
}

export interface InsuranceCompanyDto {
  id: string;
  name: string;
  rnc?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
}

export interface CreateInsuranceCompanyRequest {
  name: string;
  rnc?: string;
  contactEmail?: string;
  contactPhone?: string;
}
