import ExcelJS from 'exceljs';
import { Transaction } from '../types';
import { BRANCHES, EXTERNAL_PARTNERS, PALLET_TYPES } from '../constants';
import { CutoffSnapshot } from './auditControls';

/**
 * ส่งออกข้อมูล ณ เวลาตัดยอด เป็น Excel ไฟล์เดียวสำหรับผู้ตรวจ
 *
 * รวมทุกอย่างที่แผน Audit รายไตรมาสต้องใช้ไว้คนละแผ่นงาน เพื่อให้ผู้ดูแลระบบ
 * กดครั้งเดียวตอนตัดยอด แทนการส่งออกทีละรายงานซึ่งยอดอาจขยับระหว่างนั้น
 */

const HEADER_FILL = '1E293B';
const BORDER = 'E2E8F0';

const TYPE_LABEL: Record<string, string> = {
    IN: 'รับเข้า',
    OUT: 'จ่ายออก',
    MAINTENANCE: 'ซ่อมบำรุง',
    ADJUST: 'ปรับยอด',
    SCRAP_SALE: 'ขายซาก',
    SCRAP_DISCARD: 'ทิ้งซาก',
};

const STATUS_LABEL: Record<string, string> = {
    PENDING: 'ค้างระหว่างทาง',
    COMPLETED: 'เสร็จสิ้น',
    CANCELLED: 'ยกเลิก',
};

const SPECIAL_NAMES: Record<string, string> = {
    SYSTEM_ADJUSTMENT: 'ปรับยอดโดยระบบ',
    SOLD: 'ขายซาก',
    DISCARDED: 'ทิ้ง/เสีย',
};

const entityName = (id: string): string =>
    BRANCHES.find(b => b.id === id)?.name ||
    EXTERNAL_PARTNERS.find(p => p.id === id)?.name ||
    SPECIAL_NAMES[id] ||
    id ||
    '';

const palletName = (id: string): string => PALLET_TYPES.find(p => p.id === id)?.name || id || '';

const formatDateTime = (iso: string): string => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? iso || ''
        : d.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
};

/** ป้องกัน Excel ตีความข้อความที่ผู้ใช้กรอกเป็นสูตร (formula injection) */
const safeText = (value: unknown): string => {
    const text = value === undefined || value === null ? '' : String(value);
    return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
};

const TX_COLUMNS = [
    'วันที่', 'เลขที่เอกสาร', 'ประเภท', 'สถานะ', 'ต้นทาง', 'ปลายทาง', 'ชนิดพาเลท', 'จำนวน',
    'เลขที่อ้างอิง', 'ทะเบียนรถ', 'ผู้ขับ', 'บริษัทขนส่ง', 'หมายเหตุ', 'ยอดก่อนปรับ', 'ผู้ปรับยอด', 'รายได้ขายซาก',
];
const TX_WIDTHS = [18, 20, 12, 15, 26, 26, 26, 10, 18, 14, 18, 22, 40, 12, 20, 14];

const txRow = (t: Transaction): (string | number)[] => [
    formatDateTime(t.date),
    safeText(t.docNo),
    TYPE_LABEL[t.type] || t.type,
    STATUS_LABEL[t.status] || t.status,
    entityName(t.source),
    entityName(t.dest),
    palletName(t.palletId),
    t.qty || 0,
    safeText(t.referenceDocNo),
    safeText(t.carRegistration),
    safeText(t.driverName),
    safeText(t.transportCompany),
    safeText(t.note),
    t.previousQty ?? '',
    safeText(t.adjustedBy),
    t.scrapRevenue ?? '',
];

const addSheet = (
    workbook: ExcelJS.Workbook,
    name: string,
    title: string,
    columns: string[],
    widths: number[],
    rows: (string | number)[][]
) => {
    const ws = workbook.addWorksheet(name);
    ws.addRow([title]).font = { bold: true, size: 13 };
    ws.addRow([]);
    const header = ws.addRow(columns);
    header.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    rows.forEach(r => ws.addRow(r));
    if (rows.length === 0) ws.addRow(['ไม่มีรายการ']);
    ws.columns.forEach((col, i) => { col.width = widths[i] || 16; });
    ws.eachRow((row, n) => {
        if (n < 3) return;
        row.eachCell(cell => {
            cell.border = {
                top: { style: 'thin', color: { argb: BORDER } },
                left: { style: 'thin', color: { argb: BORDER } },
                bottom: { style: 'thin', color: { argb: BORDER } },
                right: { style: 'thin', color: { argb: BORDER } },
            };
        });
    });
    ws.views = [{ state: 'frozen', ySplit: 3 }];
    return ws;
};

export const buildCutoffWorkbook = (snapshot: CutoffSnapshot, exportedBy: string): ExcelJS.Workbook => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Neo Siam Logistics';
    workbook.created = new Date(snapshot.cutoffAt);
    const label = `Q${snapshot.quarter}/${snapshot.year}`;

    // ----- สรุป -----
    const info = workbook.addWorksheet('สรุป');
    info.addRow(['ข้อมูล ณ เวลาตัดยอด สำหรับการตรวจนับสต็อกพาเลทรายไตรมาส']).font = { bold: true, size: 14 };
    info.addRow([]);
    [
        ['รอบตรวจ', label],
        ['เวลาตัดยอด', formatDateTime(snapshot.cutoffAt)],
        ['ผู้ส่งออกข้อมูล', safeText(exportedBy)],
        ['จำนวนรายการในไตรมาส', snapshot.quarterTxs.length],
        ['รายการค้างระหว่างทาง ณ เวลาตัดยอด', snapshot.pending.length],
        ['รายการค้างระหว่างทางเกิน 3 วัน', snapshot.pending.filter(p => p.daysPending > 3).length],
        ['รายการปรับยอดในไตรมาส', snapshot.adjusts.length],
        ['รายการที่ถูกยกเลิกในไตรมาส', snapshot.cancelled.length],
        ['รายการซ่อมบำรุงและซากในไตรมาส', snapshot.maintenanceAndScrap.length],
    ].forEach(r => { info.addRow(r).getCell(1).font = { bold: true }; });
    info.addRow([]);
    info.addRow(['หมายเหตุ : ไฟล์นี้มียอดคงเหลือในระบบ ให้ส่งเฉพาะหัวหน้าผู้ตรวจ ห้ามเปิดเผยแก่ผู้นับจนกว่าจะส่งใบตรวจนับแล้ว']);
    info.getColumn(1).width = 40;
    info.getColumn(2).width = 30;

    // ----- ยอดคงเหลือ (สาขา x ชนิดพาเลท) -----
    const stockRows = BRANCHES.map(b => {
        const cells = PALLET_TYPES.map(p =>
            snapshot.stockRows.find(r => r.branchId === b.id && r.palletId === p.id)?.qty || 0
        );
        return [b.name, ...cells, cells.reduce((a, c) => a + c, 0)];
    });
    const totals = PALLET_TYPES.map((_, i) => stockRows.reduce((sum, r) => sum + (r[i + 1] as number), 0));
    stockRows.push(['รวม', ...totals, totals.reduce((a, c) => a + c, 0)]);
    addSheet(
        workbook, 'ยอดคงเหลือ', `ยอดคงเหลือในระบบ ณ เวลาตัดยอด ${formatDateTime(snapshot.cutoffAt)}`,
        ['สาขา', ...PALLET_TYPES.map(p => p.name), 'รวม'],
        [34, ...PALLET_TYPES.map(() => 16), 12],
        stockRows
    );

    addSheet(workbook, 'รายการไตรมาส', `รายการทั้งหมดของ ${label}`, TX_COLUMNS, TX_WIDTHS, snapshot.quarterTxs.map(txRow));

    addSheet(
        workbook, 'ค้างระหว่างทาง', 'รายการสถานะ PENDING ณ เวลาตัดยอด',
        ['จำนวนวันที่ค้าง', ...TX_COLUMNS], [14, ...TX_WIDTHS],
        snapshot.pending.map(p => [p.daysPending, ...txRow(p.tx)])
    );

    addSheet(workbook, 'ปรับยอด', `รายการปรับยอด (ADJUST) ของ ${label}`, TX_COLUMNS, TX_WIDTHS, snapshot.adjusts.map(txRow));
    addSheet(workbook, 'ยกเลิก', `รายการที่ถูกยกเลิกของ ${label}`, TX_COLUMNS, TX_WIDTHS, snapshot.cancelled.map(txRow));
    addSheet(workbook, 'ซ่อมและซาก', `รายการซ่อมบำรุง ขายซาก และทิ้งซากของ ${label}`, TX_COLUMNS, TX_WIDTHS, snapshot.maintenanceAndScrap.map(txRow));

    addSheet(
        workbook, 'ยอดค้างคู่ค้า', 'ยอดค้างคู่ค้า ณ เวลาตัดยอด (คำนวณจากรายการในระบบ)',
        ['คู่ค้า', 'ชนิดพาเลท', 'ยอดค้าง (ใบ)'], [34, 30, 16],
        snapshot.partnerRows.map(r => [r.partnerName, r.palletName, r.balance])
    );

    return workbook;
};

/** สร้างไฟล์แล้วให้เบราว์เซอร์ดาวน์โหลด */
export const exportCutoffSnapshotToExcel = async (snapshot: CutoffSnapshot, exportedBy: string): Promise<string> => {
    const workbook = buildCutoffWorkbook(snapshot, exportedBy);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const stamp = snapshot.cutoffAt.replace(/[-:]/g, '').slice(0, 13);
    const fileName = `NSL_Audit_Cutoff_${snapshot.year}Q${snapshot.quarter}_${stamp}.xlsx`;
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
    return fileName;
};
