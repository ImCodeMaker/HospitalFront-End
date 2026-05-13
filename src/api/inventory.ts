import { api } from "@/lib/axios";
import type {
  MedicationPaginatedResult,
  MedicationListParams,
  StockTransactionRequest,
  CreateMedicationRequest,
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

  create: async (body: CreateMedicationRequest): Promise<{ id: string }> => {
    const { data } = await api.post<{ id: string }>("/medications", body);
    return data;
  },

  stockTransaction: async (
    id: string,
    body: StockTransactionRequest
  ): Promise<void> => {
    await api.post(`/medications/${id}/stock`, body);
  },
};
