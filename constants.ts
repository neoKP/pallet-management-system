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
  { id: 'sai3', name: 'พุทธมณฑลสาย 3', type: 'BRANCH' },
  { id: 'kpp', name: 'สาขากำแพงเพชร', type: 'BRANCH' },
  { id: 'plk', name: 'สาขาพิษณุโลก', type: 'BRANCH' },
  { id: 'cm', name: 'สาขาเชียงใหม่', type: 'BRANCH' },
  { id: 'ekp', name: 'EKP', type: 'BRANCH' },
  { id: 'maintenance_stock', name: 'คลังซ่อมบำรุง (Maintenance Stock)', type: 'BRANCH' },
];

export const EXTERNAL_PARTNERS: Partner[] = [
  { id: 'neo_corp', name: 'บ. นีโอ คอร์ปอเรท', type: 'customer', allowedPallets: ['loscam_red'] },
  { id: 'sino', name: 'บ. ซีโน-แปซิฟิค', type: 'customer', allowedPallets: ['loscam_red'] },
  { id: 'lamsoon', name: 'บ. ล่ำสูง', type: 'customer', allowedPallets: ['loscam_red'] },
  { id: 'loscam_wangnoi', name: 'Loscam วังน้อย', type: 'provider', allowedPallets: ['loscam_red'] },
  { id: 'hiq_th', name: 'HI-Q', type: 'provider', allowedPallets: ['hiq'] },
];

export const INITIAL_STOCK: Stock = {
  hub_nw: { loscam_red: 1250, loscam_yellow: 450, loscam_blue: 320, hiq: 180, general: 2400, plastic_circular: 150 },
  sai3: { loscam_red: 420, loscam_yellow: 150, loscam_blue: 90, hiq: 45, general: 850, plastic_circular: 30 },
  kpp: { loscam_red: 280, loscam_yellow: 80, loscam_blue: 40, hiq: 20, general: 560, plastic_circular: 10 },
  plk: { loscam_red: 310, loscam_yellow: 95, loscam_blue: 55, hiq: 25, general: 620, plastic_circular: 15 },
  cm: { loscam_red: 195, loscam_yellow: 60, loscam_blue: 30, hiq: 15, general: 440, plastic_circular: 5 },
  ekp: { loscam_red: 150, loscam_yellow: 40, loscam_blue: 20, hiq: 10, general: 320, plastic_circular: 0 },
  maintenance_stock: { loscam_red: 85, loscam_yellow: 25, loscam_blue: 15, hiq: 10, general: 180, plastic_circular: 0 },
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 1,
    date: new Date().toISOString().split('T')[0],
    docNo: 'INT-20240101-001',
    type: 'OUT',
    status: 'COMPLETED',
    source: 'hub_nw',
    dest: 'sai3',
    palletId: 'loscam_red',
    qty: 100,
    driverName: 'สมชาย ขยันขับ',
    carRegistration: '1กข 1234',
    note: 'ส่งพาเลทประจำวัน'
  },
  {
    id: 2,
    date: new Date().toISOString().split('T')[0],
    docNo: 'EXT-IN-20240101-002',
    type: 'IN',
    status: 'COMPLETED',
    source: 'loscam_wangnoi',
    dest: 'hub_nw',
    palletId: 'loscam_red',
    qty: 500,
    referenceDocNo: 'LSC-998877',
    note: 'รับพาเลทเช่าเพิ่ม'
  }
];

export const MOCK_USERS: User[] = [
  { username: 'admin', role: 'ADMIN', name: 'System Administrator' },
  { username: 'user_nw', role: 'USER', branchId: 'hub_nw', name: 'Operator - Hub NW' },
  { username: 'user_sai3', role: 'USER', branchId: 'sai3', name: 'Staff - Sai 3' },
  { username: 'user_cm', role: 'USER', branchId: 'cm', name: 'Staff - Chiang Mai' },
  { username: 'user_kpp', role: 'USER', branchId: 'kpp', name: 'Staff - Kamphaeng Phet' },
  { username: 'user_plk', role: 'USER', branchId: 'plk', name: 'Staff - Phitsanulok' },
  { username: 'user_ekp', role: 'USER', branchId: 'ekp', name: 'Staff - EKP' },
];

export const VEHICLE_TYPES = [
  { id: '4w', name: 'รถ 4 ล้อ' },
  { id: '6w', name: 'รถ 6 ล้อ' },
  { id: '10w', name: 'รถ 10 ล้อ' },
  { id: 'trailer', name: 'รถเทรลเลอร์' },
  { id: 'truck_trailer', name: 'รถพ่วง แม่ลูก' },
  { id: 'container', name: 'รถตู้คอนเทนเนอร์' },
];
