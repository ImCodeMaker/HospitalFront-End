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

  listSpecialties: async (): Promise<SpecialtyDto[]> => {
    const { data } = await api.get<SpecialtyDto[]>("/specialties");
    return data;
  },

  createSpecialty: async (body: CreateSpecialtyRequest): Promise<{ id: string }> => {
    const { data } = await api.post<{ id: string }>("/specialties", body);
    return data;
  },

  listInsuranceCompanies: async (): Promise<InsuranceCompanyDto[]> => {
    const { data } = await api.get<InsuranceCompanyDto[]>("/insurance-companies");
    return data;
  },

  createInsuranceCompany: async (
    body: CreateInsuranceCompanyRequest
  ): Promise<{ id: string }> => {
    const { data } = await api.post<{ id: string }>("/insurance-companies", body);
    return data;
  },

  toggleInsuranceCompanyActive: async (id: string): Promise<void> => {
    await api.patch(`/insurance-companies/${id}/toggle-active`);
  },
};
