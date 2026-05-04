export type InvoiceStatus =
  | "AwaitingPayment"
  | "PartiallyPaid"
  | "Paid"
  | "Cancelled"
  | "PendingInsurance"
  | "RequiresCollection";

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
  patientId: string;
  patientName: string;
  consultId?: string;
  status: InvoiceStatus;
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
