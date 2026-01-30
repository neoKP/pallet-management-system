import { PalletType, Branch, Partner, Stock, Transaction, User } from './types';

export const PALLET_TYPES: PalletType[] = [
  { id: 'loscam_red', name: 'Loscam (สีแดง)', color: 'bg-red-600', isRental: true, material: 'wood' },
  { id: 'loscam_yellow', name: 'Loscam (สีเหลือง)', color: 'bg-yellow-400', isRental: false, material: 'wood' },
  { id: 'loscam_blue', name: 'Loscam (สีฟ้า)', color: 'bg-blue-400', isRental: false, material: 'wood' },
  { id: 'hiq', name: 'HI-Q', color: 'bg-orange-500', isRental: false, material: 'wood' },
  { id: 'general', name: 'พาเลทหมุนเวียน (ไม้/คละสี)', color: 'bg-gray-400', isRental: false, material: 'wood' },
  { id: 'plastic_circular', name: 'พาเลทพลาสติก (หมุนเวียน)', color: 'bg-teal-500', isRental: false, material: 'plastic' },
];

export const BRANCHES: Branch[] = [
  { id: 'hub_nw', name: 'ศูนย์ฯ NW (Hub)', type: 'HUB' },
  { id: 'sai3', name: 'สาขาพุทธมณฑลสาย 3', type: 'BRANCH' },
  { id: 'kpp', name: 'สาขากำแพงเพชร', type: 'BRANCH' },
  { id: 'plk', name: 'สาขาพิษณุโลก', type: 'BRANCH' },
  { id: 'cm', name: 'สาขาเชียงใหม่', type: 'BRANCH' },
  { id: 'ekp', name: 'EKP', type: 'BRANCH' },
  { id: 'ms', name: 'สาขาแม่สอด', type: 'BRANCH' },
  { id: 'maintenance_stock', name: 'คลังซ่อมบำรุง (Maintenance Stock)', type: 'BRANCH' },
];

export const EXTERNAL_PARTNERS: Partner[] = [
  { id: 'neo_corp', name: 'บ. นีโอ คอร์ปอเรท', type: 'customer', allowedPallets: ['loscam_red'], rentalFee: 0, gracePeriod: 0 },
  { id: 'sino', name: 'บ. ซีโน-แปซิฟิค', type: 'customer', allowedPallets: ['loscam_red', 'loscam_blue'], rentalFee: 1.0, gracePeriod: 10 },
  { id: 'lamsoon', name: 'บ. ล่ำสูง', type: 'customer', allowedPallets: ['loscam_red'] },
  { id: 'ufc', name: 'บ. UFC', type: 'customer', allowedPallets: ['loscam_red', 'loscam_blue'] },
  { id: 'loxley', name: 'บ. Loxley', type: 'customer', allowedPallets: ['loscam_red', 'loscam_blue', 'loscam_yellow'] },
  { id: 'kopee', name: 'บ. โคพี่', type: 'customer', allowedPallets: ['loscam_red'] },
  { id: 'loscam_wangnoi', name: 'Loscam วังน้อย', type: 'provider', allowedPallets: ['loscam_red'], rentalFee: 1.4, gracePeriod: 0, mappingName: 'บ. นีโอ คอร์ปอเรท' },
  { id: 'hiq_th', name: 'HI-Q', type: 'provider', allowedPallets: ['hiq'] },
];

export const INITIAL_STOCK: Stock = {
  hub_nw: { loscam_red: 0, loscam_yellow: 0, loscam_blue: 0, hiq: 0, general: 0, plastic_circular: 0 },
  sai3: { loscam_red: 0, loscam_yellow: 0, loscam_blue: 0, hiq: 0, general: 0, plastic_circular: 0 },
  kpp: { loscam_red: 0, loscam_yellow: 0, loscam_blue: 0, hiq: 0, general: 0, plastic_circular: 0 },
  plk: { loscam_red: 0, loscam_yellow: 0, loscam_blue: 0, hiq: 0, general: 0, plastic_circular: 0 },
  cm: { loscam_red: 0, loscam_yellow: 0, loscam_blue: 0, hiq: 0, general: 0, plastic_circular: 0 },
  ekp: { loscam_red: 0, loscam_yellow: 0, loscam_blue: 0, hiq: 0, general: 0, plastic_circular: 0 },
  ms: { loscam_red: 0, loscam_yellow: 0, loscam_blue: 0, hiq: 0, general: 0, plastic_circular: 0 },
  maintenance_stock: { loscam_red: 0, loscam_yellow: 0, loscam_blue: 0, hiq: 0, general: 0, plastic_circular: 0 },
};

/**
 * Modern Business Logic v2.0.0
 * Automation Rules
 */
export const AUTOMATION_RULES = {
  sai3: {
    partnersWithAutoFlow: ['lamsoon', 'ufc', 'loxley', 'kopee', 'hiq_th'],
    action: 'AUTO_FLOW', // Auto Receive & Dispatch at Sai 3 only
  },
  hub_nw: { // Nakhon Sawan Hub
    loscam: {
      provider: 'loscam_wangnoi',
      autoReceiveAt: 'hub_nw',
      autoDispatchAs: 'neo_corp' // Dispatch out as Neo Corp
    },
    sino: {
      provider: 'sino',
      autoReceiveAt: 'hub_nw',
      autoDispatchAs: 'sino'
    }
  }
};

export const RENTAL_FREE_DAYS = 10;

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const AUTHORIZED_USERS: User[] = [
  { username: 'admin', role: 'ADMIN', name: 'System Administrator' },
  { username: 'user_nw', role: 'USER', branchId: 'hub_nw', name: 'Operator - Hub NW' },
  { username: 'user_sai3', role: 'USER', branchId: 'sai3', name: 'Staff - Sai 3 (BKK)' },
  { username: 'user_cm', role: 'USER', branchId: 'cm', name: 'Staff - Chiang Mai' },
  { username: 'user_kpp', role: 'USER', branchId: 'kpp', name: 'Staff - Kamphaeng Phet' },
  { username: 'user_plk', role: 'USER', branchId: 'plk', name: 'Staff - Phitsanulok' },
  { username: 'user_ekp', role: 'USER', branchId: 'ekp', name: 'Staff - EKP' },
  { username: 'user_ms', role: 'USER', branchId: 'ms', name: 'Staff - Mae Sot' },
  { username: 'user_maintenance', role: 'USER', branchId: 'maintenance_stock', name: 'Staff - Maintenance' },
];

export const VEHICLE_TYPES = [
  { id: '4w', name: 'รถ 4 ล้อ' },
  { id: '6w', name: 'รถ 6 ล้อ' },
  { id: '10w', name: 'รถ 10 ล้อ' },
  { id: 'trailer', name: 'รถเทรลเลอร์' },
  { id: 'truck_trailer', name: 'รถพ่วง แม่ลูก' },
  { id: 'container', name: 'รถตู้คอนเทนเนอร์' },
];

export const DEFAULT_THRESHOLDS: any = {
  hub_nw: {
    loscam_red: { min: 100, max: 500 },
    loscam_blue: { min: 10, max: 100 },
  },
  sai3: {
    loscam_red: { min: 50, max: 300 },
  }
};
