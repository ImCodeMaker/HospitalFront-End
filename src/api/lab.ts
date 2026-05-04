import { api } from "@/lib/axios";
import type {
  LabOrderDto,
  LabResultDto,
  LabOrderListParams,
  CreateLabOrderRequest,
  AddLabResultRequest,
  PatchLabOrderStatusRequest,
} from "@/types/lab";

export const labApi = {
  list: async (params: LabOrderListParams = {}): Promise<LabOrderDto[]> => {
    const { data } = await api.get<LabOrderDto[]>("/lab-orders", { params });
    return data;
  },

  listByConsult: async (consultId: string): Promise<LabOrderDto[]> => {
    const { data } = await api.get<LabOrderDto[]>(`/lab-orders/consult/${consultId}`);
    return data;
  },

  create: async (body: CreateLabOrderRequest): Promise<{ id: string }> => {
    const { data } = await api.post<{ id: string }>("/lab-orders", body);
    return data;
  },

  patchStatus: async (id: string, body: PatchLabOrderStatusRequest): Promise<void> => {
    await api.patch(`/lab-orders/${id}/status`, body);
  },

  addResult: async (id: string, body: AddLabResultRequest): Promise<LabResultDto> => {
    const { data } = await api.post<LabResultDto>(`/lab-orders/${id}/results`, body);
    return data;
  },

  getResults: async (id: string): Promise<LabResultDto[]> => {
    const { data } = await api.get<LabResultDto[]>(`/lab-orders/${id}/results`);
    return data;
  },
};
