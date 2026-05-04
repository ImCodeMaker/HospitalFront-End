import { api } from "@/lib/axios";
import type {
  ConsultDto,
  ConsultPaginatedResult,
  ConsultListParams,
  CreateConsultRequest,
  UpdateConsultRequest,
  PatchConsultStatusRequest,
  ConsultImageDto,
} from "@/types/consults";

export const consultsApi = {
  list: async (params: ConsultListParams = {}): Promise<ConsultPaginatedResult> => {
    const { data } = await api.get<ConsultPaginatedResult>("/consults", { params });
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

  patchStatus: async (id: string, body: PatchConsultStatusRequest): Promise<ConsultDto> => {
    const { data } = await api.patch<ConsultDto>(`/consults/${id}/status`, body);
    return data;
  },

  getImages: async (id: string): Promise<ConsultImageDto[]> => {
    const { data } = await api.get<ConsultImageDto[]>(`/consults/${id}/images`);
    return data;
  },

  uploadImage: async (id: string, file: File): Promise<ConsultImageDto> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<ConsultImageDto>(`/consults/${id}/images`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};
