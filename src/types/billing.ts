export type InvoiceStatus =
  | "AwaitingPayment"
  | "PartiallyPaid"
  | "Paid"
  | "Cancelled"
  | "PendingInsurance"
  | "RequiresCollection";

export type NcfType =
  | "CreditoFiscal"
  | "Consumo"
  | "RegimenEspecial"
  | "Gubernamental"
  | "Exportaciones";

export const NCF_TYPE_LABEL: Record<NcfType, string> = {
  CreditoFiscal: "B01 — Crédito Fiscal",
  Consumo: "B02 — Consumo",
  RegimenEspecial: "B14 — Régimen Especial",
  Gubernamental: "B15 — Gubernamental",
  Exportaciones: "B16 — Exportaciones",
};

export type PaymentMethod =
  | "Cash"
  | "CreditCard"
  | "DebitCard"
  | "BankTransfer"
  | "Insurance"
  | "Mixed";

export type LineItemType =
  | "Consultation"
  | "Procedure"
  | "Lab"
  | "Medication"
  | "Other";

export interface InvoiceLineItemDto {
  id: string;
  type: LineItemType;
  description: string;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  insuranceCoverageAmount: number;
  patientAmount: number;
}

export interface PaymentDto {
  id: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  paymentDate: string;
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  ncf?: string;
  ncfType?: NcfType;
  patientId: string;
  patientName: string;
  consultId?: string;
  status: InvoiceStatus;
  insuranceDenialReason?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  insuranceCoverageAmount: number;
  totalAmount: number;
  patientResponsibilityAmount: number;
  paidAmount: number;
  balanceDue: number;
  notes?: string;
  paidAt?: string;
  createdAt: string;
  lineItems: InvoiceLineItemDto[];
  payments: PaymentDto[];
}

export interface InvoiceListParams {
  patientId?: string;
  status?: InvoiceStatus | "";
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface InvoicePaginatedResult {
  items: InvoiceDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateLineItemRequest {
  type: LineItemType;
  description: string;
  unitPrice: number;
  quantity: number;
}

export interface CreateInvoiceRequest {
  consultId?: string;
  patientId: string;
  ncfType?: NcfType;
  lineItems: CreateLineItemRequest[];
  discountAmount?: number;
  notes?: string;
}

export interface ProcessPaymentRequest {
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

export interface ResolveInsuranceClaimRequest {
  approved: boolean;
  paidAmount?: number;
  notes?: string;
}
