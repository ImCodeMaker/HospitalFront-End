import { api } from "@/lib/axios";
import { filesApi } from "@/api/files";
import type {
  ConsultDto,
  ConsultPaginatedResult,
  ConsultListParams,
  CreateConsultRequest,
  UpdateConsultRequest,
  ConsultImageDto,
} from "@/types/consults";

export const consultsApi = {
  list: async (params: ConsultListParams = {}): Promise<ConsultPaginatedResult> => {
    const { data } = await api.get<ConsultPaginatedResult>("/consults", { params });
    return data;
  },

  listByPatient: async (patientId: string, page = 1, pageSize = 20): Promise<ConsultPaginatedResult> => {
    const { data } = await api.get<ConsultPaginatedResult>(`/consults/patient/${patientId}`, {
      params: { page, pageSize },
    });
    return data;
  },

  get: async (id: string): Promise<ConsultDto> => {
    const { data } = await api.get<ConsultDto>(`/consults/${id}`);
    return data;
  },

  create: async (body: CreateConsultRequest): Promise<ConsultDto> => {
    const { data } = await api.post<ConsultDto>("/consults", body);
    return data;
  },

  update: async (id: string, body: UpdateConsultRequest): Promise<ConsultDto> => {
    const { data } = await api.put<ConsultDto>(`/consults/${id}`, body);
    return data;
  },

  finalize: async (id: string): Promise<ConsultDto> => {
    const { data } = await api.post<ConsultDto>(`/consults/${id}/finalize`);
    return data;
  },

  getImages: async (id: string): Promise<ConsultImageDto[]> => {
    const { data } = await api.get<ConsultImageDto[]>(`/consults/${id}/images`);
    return data;
  },

  uploadImage: async (id: string, file: File, description?: string): Promise<ConsultImageDto> => {
    const { filePath } = await filesApi.upload("consult-images", file);
    const { data } = await api.post<ConsultImageDto>(`/consults/${id}/images`, {
      filePath,
      description,
    });
    return data;
  },
};
