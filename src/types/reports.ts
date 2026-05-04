export type AgingBucket = "0-30" | "31-60" | "61-90" | "90+";

export interface DailyRevenueSummaryDto {
  date: string;
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
  transferRevenue: number;
  insuranceRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
}

export interface AccountsReceivableDto {
  invoiceId: string;
  invoiceNumber: string;
  patientName: string;
  balanceDue: number;
  invoiceDate: string;
  daysOutstanding: number;
  agingBucket: AgingBucket;
}

export interface InventoryReportItemDto {
  id: string;
  genericName: string;
  brandName?: string;
  currentStock: number;
  minimumStockThreshold: number;
  salePrice: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  isExpiringSoon: boolean;
  isExpired: boolean;
  earliestExpirationDate?: string;
}
