import { api } from "@/lib/axios";

export interface AuditLogDto {
  id: number;
  tableName: string;
  recordId: string;
  action: string;
  changedBy?: string;
  changedAt: string;
  oldValues?: string;
  newValues?: string;
  ipAddress?: string;
}

export interface AuditLogQuery {
  tableName?: string;
  recordId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogPage {
  total: number;
  page: number;
  pageSize: number;
  items: AuditLogDto[];
}

export const auditApi = {
  list: async (params: AuditLogQuery = {}): Promise<AuditLogPage> => {
    const { data } = await api.get<AuditLogPage>("/audit", {
      params: {
        tableName: params.tableName || undefined,
        recordId: params.recordId || undefined,
        from: params.from || undefined,
        to: params.to || undefined,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 50,
      },
    });
    return data;
  },
};
