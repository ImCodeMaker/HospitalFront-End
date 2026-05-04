export type Presentation =
  | "Tablet"
  | "Capsule"
  | "Syrup"
  | "Injection"
  | "Cream"
  | "Drops"
  | "Inhaler"
  | "Patch"
  | "Suppository"
  | "Other";

export type StockTransactionType =
  | "Purchase"
  | "Dispense"
  | "Adjustment"
  | "Expiry"
  | "Return";

export interface MedicationDto {
  id: string;
  genericName: string;
  brandName?: string;
  presentation: Presentation;
  concentration?: string;
  storageLocation?: string;
  minimumStockThreshold: number;
  currentStock: number;
  salePrice: number;
  costPrice?: number;
  batchNumber?: string;
  expirationDate?: string;
  isActive: boolean;
  isLowStock: boolean;
  createdAt: string;
}

export interface StockHistoryEntryDto {
  id: string;
  type: StockTransactionType;
  quantity: number;
  stockAfter: number;
  unitCost?: number;
  batchNumber?: string;
  expirationDate?: string;
  notes?: string;
  createdAt: string;
  createdByName?: string;
}

export interface StockTransactionRequest {
  type: StockTransactionType;
  quantity: number;
  unitCost?: number;
  batchNumber?: string;
  expirationDate?: string;
  notes?: string;
}

export interface CreateMedicationRequest {
  genericName: string;
  brandName?: string;
  presentation: Presentation;
  concentration?: string;
  storageLocation?: string;
  minimumStockThreshold: number;
  currentStock: number;
  salePrice: number;
  costPrice?: number;
  batchNumber?: string;
  expirationDate?: string;
}

export interface UpdateMedicationRequest extends CreateMedicationRequest {
  isActive: boolean;
}

export interface MedicationListParams {
  search?: string;
  lowStockOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface MedicationPaginatedResult {
  items: MedicationDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
