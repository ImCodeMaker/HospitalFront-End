import { api } from "@/lib/axios";
import type {
  PatientDto,
  PatientTimelineDto,
  DuplicateCheckResult,
  CreatePatientRequest,
  UpdatePatientRequest,
  PatchPatientStatusRequest,
  PaginatedResult,
  PatientListParams,
  PatientTimelineParams,
  DocumentType,
} from "@/types/patients";

export const patientsApi = {
  list: async (params: PatientListParams = {}): Promise<PaginatedResult<PatientDto>> => {
    const { data } = await api.get<PaginatedResult<PatientDto>>("/patients", {
      params: {
        search: params.search || undefined,
        status: params.status || undefined,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      },
    });
    return data;
  },

  getById: async (id: string): Promise<PatientDto> => {
    const { data } = await api.get<PatientDto>(`/patients/${id}`);
    return data;
  },

  getTimeline: async (
    id: string,
    params: PatientTimelineParams = {}
  ): Promise<PatientTimelineDto[]> => {
    const { data } = await api.get<PatientTimelineDto[]>(
      `/patients/${id}/timeline`,
      {
        params: {
          category: params.category || undefined,
          from: params.from || undefined,
          to: params.to || undefined,
        },
      }
    );
    return data;
  },

  checkDuplicate: async (
    documentType: DocumentType,
    documentNumber: string
  ): Promise<DuplicateCheckResult> => {
    const { data } = await api.get<DuplicateCheckResult>(
      "/patients/check-duplicate",
      { params: { documentType, documentNumber } }
    );
    return data;
  },

  create: async (body: CreatePatientRequest): Promise<{ id: string }> => {
    const { data } = await api.post<{ id: string }>("/patients", body);
    return data;
  },

  update: async (id: string, body: UpdatePatientRequest): Promise<void> => {
    await api.put(`/patients/${id}`, body);
  },

  patchStatus: async (
    id: string,
    body: PatchPatientStatusRequest
  ): Promise<void> => {
    await api.patch(`/patients/${id}/status`, body);
  },

  exportData: async (id: string): Promise<Blob> => {
    const { data } = await api.get<Blob>(`/patients/${id}/export`, {
      responseType: "blob",
    });
    return data;
  },

  anonymize: async (id: string): Promise<void> => {
    await api.post(`/patients/${id}/anonymize`);
  },
};
