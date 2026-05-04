import { api } from "@/lib/axios";
import type {
  MedicationDto,
  MedicationPaginatedResult,
  MedicationListParams,
  StockHistoryEntryDto,
  StockTransactionRequest,
  CreateMedicationRequest,
  UpdateMedicationRequest,
} from "@/types/inventory";

export const inventoryApi = {
  list: async (
    params: MedicationListParams = {}
  ): Promise<MedicationPaginatedResult> => {
    const { data } = await api.get<MedicationPaginatedResult>("/medications", {
      params: {
        search: params.search || undefined,
        lowStockOnly: params.lowStockOnly || undefined,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      },
    });
    return data;
  },

  getById: async (id: string): Promise<MedicationDto> => {
    const { data } = await api.get<MedicationDto>(`/medications/${id}`);
    return data;
  },

  create: async (body: CreateMedicationRequest): Promise<{ id: string }> => {
    const { data } = await api.post<{ id: string }>("/medications", body);
    return data;
  },

  update: async (id: string, body: UpdateMedicationRequest): Promise<void> => {
    await api.put(`/medications/${id}`, body);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/medications/${id}`);
  },

  stockTransaction: async (
    id: string,
    body: StockTransactionRequest
  ): Promise<void> => {
    await api.post(`/medications/${id}/stock-transaction`, body);
  },

  stockHistory: async (id: string): Promise<StockHistoryEntryDto[]> => {
    const { data } = await api.get<StockHistoryEntryDto[]>(
      `/medications/${id}/stock-history`
    );
    return data;
  },
};
