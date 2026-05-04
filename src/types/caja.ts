export type TransactionType =
  | "PaymentCash"
  | "PaymentCard"
  | "BankTransfer"
  | "CashRefund"
  | "CashAdvance"
  | "PettyCashExpense";

export interface CajaShiftDto {
  id: string;
  openedByUserId: string;
  openingBalance: number;
  closingBalance?: number | null;
  expectedBalance?: number | null;
  discrepancy?: number | null;
  isOpen: boolean;
  closedAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface CashTransactionDto {
  id: string;
  type: TransactionType;
  amount: number;
  description?: string | null;
  isApproved: boolean;
  createdAt: string;
}

export interface OpenShiftRequest {
  openingBalance: number;
}

export interface CloseShiftRequest {
  closingBalance: number;
  notes?: string;
}

export interface CashTransactionRequest {
  type: TransactionType;
  amount: number;
  description: string;
}
