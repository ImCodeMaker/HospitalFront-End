import { api } from "@/lib/axios";
import type {
  ClinicSettingsDto,
  UpdateClinicSettingsRequest,
  UserPaginatedResult,
  CreateUserRequest,
  SpecialtyDto,
  CreateSpecialtyRequest,
  InsuranceCompanyDto,
  CreateInsuranceCompanyRequest,
} from "@/types/settings";
import type { UserRole } from "@/store/authStore";

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
  specialtyId?: string;
}

export const settingsApi = {
  getClinicSettings: async (): Promise<ClinicSettingsDto> => {
    const { data } = await api.get<ClinicSettingsDto>("/settings");
    return data;
  },

  updateClinicSettings: async (body: UpdateClinicSettingsRequest): Promise<ClinicSettingsDto> => {
    const { data } = await api.put<ClinicSettingsDto>("/settings", body);
    return data;
  },

  listUsers: async (page = 1, pageSize = 20): Promise<UserPaginatedResult> => {
    const { data } = await api.get<UserPaginatedResult>("/users", {
      params: { page, pageSize },
    });
    return data;
  },

  createUser: async (body: CreateUserRequest): Promise<{ id: string }> => {
    const { data } = await api.post<{ id: string }>("/users", body);
    return data;
  },

  toggleUserActive: async (id: string, isActive: boolean): Promise<void> => {
    if (isActive) {
      await api.post(`/users/${id}/activate`);
    } else {
      await api.post(`/users/${id}/deactivate`);
    }
  },

  updateUser: async (id: string, body: UpdateUserRequest): Promise<void> => {
    await api.put(`/users/${id}`, body);
  },

  resetUserPassword: async (id: string, newPassword: string): Promise<void> => {
    await api.post(`/users/${id}/reset-password`, { newPassword });
  },

  listSpecialties: async (): Promise<SpecialtyDto[]> => {
    const { data } = await api.get<SpecialtyDto[]>("/specialties");
    return data;
  },

  createSpecialty: async (body: CreateSpecialtyRequest): Promise<{ id: string }> => {
    const { data } = await api.post<{ id: string }>("/specialties", body);
    return data;
  },

  listInsuranceCompanies: async (): Promise<InsuranceCompanyDto[]> => {
    const { data } = await api.get<InsuranceCompanyDto[]>("/insurancecompanies");
    return data;
  },

  createInsuranceCompany: async (
    body: CreateInsuranceCompanyRequest
  ): Promise<{ id: string }> => {
    const { data } = await api.post<{ id: string }>("/insurancecompanies", body);
    return data;
  },
};
