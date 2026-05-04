import { api } from "@/lib/axios";
import type {
  DailyRevenueSummaryDto,
  AccountsReceivableDto,
  InventoryReportItemDto,
} from "@/types/reports";

export const reportsApi = {
  dailyRevenue: async (date: string): Promise<DailyRevenueSummaryDto> => {
    const { data } = await api.get<DailyRevenueSummaryDto>("/reports/daily-revenue", {
      params: { date },
    });
    return data;
  },

  accountsReceivable: async (): Promise<AccountsReceivableDto[]> => {
    const { data } = await api.get<AccountsReceivableDto[]>("/reports/accounts-receivable");
    return data;
  },

  inventoryReport: async (): Promise<InventoryReportItemDto[]> => {
    const { data } = await api.get<InventoryReportItemDto[]>("/reports/inventory");
    return data;
  },

  downloadRevenuePdf: async (date: string): Promise<Blob> => {
    const { data } = await api.get<Blob>("/reports/daily-revenue", {
      params: { date, format: "pdf" },
      responseType: "blob",
    });
    return data;
  },
};
