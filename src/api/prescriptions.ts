import { api } from "@/lib/axios";
import type {
  PrescriptionDto,
  AddPrescriptionRequest,
  DrugInteractionAlert,
} from "@/types/prescriptions";

export const prescriptionsApi = {
  listByConsult: async (consultId: string): Promise<PrescriptionDto[]> => {
    const { data } = await api.get<PrescriptionDto[]>(`/prescriptions/consult/${consultId}`);
    return data;
  },

  add: async (body: AddPrescriptionRequest): Promise<PrescriptionDto> => {
    const { data } = await api.post<PrescriptionDto>("/prescriptions", {
      consultId: body.consultId,
      prescription: body,
    });
    return data;
  },

  checkInteractions: async (rxcuis: string[]): Promise<DrugInteractionAlert[]> => {
    const params = new URLSearchParams();
    for (const r of rxcuis) params.append("rxcui", r);
    const { data } = await api.get<DrugInteractionAlert[]>(
      `/prescriptions/check-interactions?${params.toString()}`
    );
    return data;
  },
};
