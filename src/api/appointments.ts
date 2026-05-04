import { api } from "@/lib/axios";
import type {
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  PatchAppointmentStatusRequest,
  AppointmentListParams,
  AppointmentPaginatedResult,
} from "@/types/appointments";

export const appointmentsApi = {
  list: async (
    params: AppointmentListParams = {}
  ): Promise<AppointmentPaginatedResult> => {
    const { data } = await api.get<AppointmentPaginatedResult>("/appointments", {
      params: {
        doctorId: params.doctorId || undefined,
        patientId: params.patientId || undefined,
        status: params.status || undefined,
        from: params.from || undefined,
        to: params.to || undefined,
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
      },
    });
    return data;
  },

  create: async (body: CreateAppointmentRequest): Promise<{ id: string }> => {
    const { data } = await api.post<{ id: string }>("/appointments", body);
    return data;
  },

  update: async (
    id: string,
    body: UpdateAppointmentRequest
  ): Promise<void> => {
    await api.put(`/appointments/${id}`, body);
  },

  patchStatus: async (
    id: string,
    body: PatchAppointmentStatusRequest
  ): Promise<void> => {
    await api.patch(`/appointments/${id}/status`, body);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/appointments/${id}`);
  },
};
