import { api } from "@/lib/axios";
import type {
  CajaShiftDto,
  CashTransactionDto,
  OpenShiftRequest,
  CloseShiftRequest,
  CashTransactionRequest,
} from "@/types/caja";

export const cajaApi = {
  getActiveShift: async (): Promise<CajaShiftDto | null> => {
    try {
      const { data } = await api.get<CajaShiftDto>("/caja/current");
      return data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return null;
      throw err;
    }
  },

  openShift: async (body: OpenShiftRequest): Promise<CajaShiftDto> => {
    const { data } = await api.post<CajaShiftDto>("/caja/open", body);
    return data;
  },

  closeShift: async (id: string, body: CloseShiftRequest): Promise<void> => {
    await api.post(`/caja/${id}/close`, body);
  },

  createTransaction: async (
    shiftId: string,
    body: CashTransactionRequest
  ): Promise<CashTransactionDto> => {
    const { data } = await api.post<CashTransactionDto>(`/caja/${shiftId}/transactions`, body);
    return data;
  },

  listTransactions: async (shiftId: string): Promise<CashTransactionDto[]> => {
    const { data } = await api.get<CashTransactionDto[]>(`/caja/${shiftId}/transactions`);
    return data;
  },
};
