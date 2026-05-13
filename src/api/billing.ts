import { api } from "@/lib/axios";
import type {
  InvoiceDto,
  InvoiceListParams,
  InvoicePaginatedResult,
  CreateInvoiceRequest,
  ProcessPaymentRequest,
  ResolveInsuranceClaimRequest,
} from "@/types/billing";

export const billingApi = {
  listInvoices: async (
    params: InvoiceListParams = {}
  ): Promise<InvoicePaginatedResult> => {
    const { data } = await api.get<InvoicePaginatedResult>("/billing", {
      params: {
        patientId: params.patientId || undefined,
        status: params.status || undefined,
        from: params.from || undefined,
        to: params.to || undefined,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      },
    });
    return data;
  },

  getInvoice: async (id: string): Promise<InvoiceDto> => {
    const { data } = await api.get<InvoiceDto>(`/billing/${id}`);
    return data;
  },

  createInvoice: async (body: CreateInvoiceRequest): Promise<{ id: string }> => {
    const { data } = await api.post<{ id: string }>("/billing", body);
    return data;
  },

  processPayment: async (
    id: string,
    body: ProcessPaymentRequest
  ): Promise<void> => {
    await api.post(`/billing/${id}/payments`, body);
  },

  submitInsuranceClaim: async (id: string): Promise<void> => {
    await api.post(`/billing/invoice/${id}/submit-claim`);
  },

  resolveInsuranceClaim: async (
    id: string,
    body: ResolveInsuranceClaimRequest
  ): Promise<void> => {
    await api.post(`/billing/invoice/${id}/resolve-claim`, body);
  },

  downloadPdf: async (id: string): Promise<Blob> => {
    const { data } = await api.get<Blob>(`/pdf/invoice/${id}`, {
      responseType: "blob",
    });
    return data;
  },
};
