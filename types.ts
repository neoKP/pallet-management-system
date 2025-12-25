// Enhanced types with better type safety and documentation

/**
 * Pallet Type Identifiers
 */
export type PalletId =
  | 'loscam_red'
  | 'loscam_yellow'
  | 'loscam_blue'
  | 'hiq'
  | 'general'
  | 'plastic_circular';

/**
 * Branch Identifiers
 */
export type BranchId =
  | 'hub_nks'
  | 'sai3'
  | 'kpp'
  | 'plk'
  | 'cm'
  | 'ekp'
  | 'maintenance_stock';

/**
 * Transaction Types
 */
export type TransactionType = 'IN' | 'OUT' | 'MAINTENANCE' | 'ADJUST';

/**
 * Maintenance Action Types
 */
export type MaintenanceAction = 'REPAIR_CONVERT' | 'DISCARD';

/**
 * User Role Types
 */
export type UserRole = 'ADMIN' | 'USER';

/**
 * User Interface
 */
export interface User {
  username: string;
  role: UserRole;
  branchId?: BranchId;
  name: string;
}

/**
 * Pallet Type Definition
 */
export interface PalletType {
  id: PalletId;
  name: string;
  color: string;
  isRental: boolean;
  material: 'wood' | 'plastic';
}

/**
 * Branch Definition
 */
export interface Branch {
  id: BranchId;
  name: string;
  type: 'HUB' | 'BRANCH';
}

/**
 * External Partner Definition
 */
export interface Partner {
  id: string;
  name: string;
  type: 'customer' | 'provider';
  allowedPallets: PalletId[];
}

/**
 * Transaction Record
 */
export interface Transaction {
  id: number;
  date: string;
  docNo: string; // Document Number
  type: TransactionType;
  status: 'PENDING' | 'COMPLETED';
  source: string;
  dest: string;
  palletId: PalletId;
  qty: number;
  note?: string;
  action?: MaintenanceAction;
  targetPallet?: PalletId;
  noteExtended?: string;
  qtyRepaired?: number;
  carRegistration?: string;
  vehicleType?: string;
  driverName?: string;
  transportCompany?: string;
  referenceDocNo?: string;
}

/**
 * Stock State Type
 * Maps each branch to its pallet inventory
 */
export type Stock = Record<BranchId, Record<PalletId, number>>;

/**
 * AI Chat Message
 */
export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  timestamp?: string;
  links?: GroundingLink[];
}

/**
 * Grounding Link from AI Response
 */
export interface GroundingLink {
  web?: {
    uri: string;
    title: string;
  };
}

/**
 * Form State for Movement
 */
export interface MovementFormState {
  type: TransactionType;
  target: string;
  pallet: PalletId;
  qty: string;
}

/**
 * Batch Maintenance Data
 */
export interface BatchMaintenanceData {
  items: { palletId: PalletId; qty: number }[];
  fixedQty: number;
  scrappedQty: number;
  note: string;
}

/**
 * API Response Wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Loading State Type
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Error Type
 */
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}