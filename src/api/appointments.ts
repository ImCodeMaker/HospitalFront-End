import { api } from "@/lib/axios";
import type {
  CreateAppointmentRequest,
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

  patchStatus: async (
    id: string,
    body: PatchAppointmentStatusRequest
  ): Promise<void> => {
    await api.patch(`/appointments/${id}/status`, body);
  },
};
