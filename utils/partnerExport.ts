import ExcelJS from 'exceljs';
import {
    PartnerHistoryRow, PartnerMonthSummaryRow, PartnerHistoryFilter,
    formatBangkokDate, formatThaiMonth,
} from './partnerPortal';

/**
 * ไฟล์ Excel สำหรับคู่ค้า (ดูอย่างเดียว) — ประวัติรับ-คืนตามตัวกรอง + สรุปรายเดือน
 * ใส่เฉพาะข้อมูลที่หน้าคู่ค้าแสดงอยู่แล้ว ไม่มีข้อมูลภายใน
 */

const KIND_TEXT: Record<string, string> = {
    RECEIVE: 'ส่งให้นีโอสยาม',
    RETURN: 'นีโอสยามคืน',
    AUTO: 'คืนอัตโนมัติ (ระบบ)',
    ADJUST: 'ปรับยอด',
};

/** กันสูตร Excel แฝง (ข้อความขึ้นต้นด้วย = + - @) */
export const safeCell = (value: unknown): string => {
    const text = value === undefined || value === null ? '' : String(value);
    return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
};

const style = (ws: ExcelJS.Worksheet, headerRow: number, widths: number[]) => {
    ws.getRow(headerRow).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    ws.views = [{ state: 'frozen', ySplit: headerRow }];
};

/** คำอธิบายตัวกรองที่ใช้ (ใส่หัวไฟล์ให้รู้ว่าไฟล์นี้ครอบช่วงไหน) */
export const filterLabel = (f: PartnerHistoryFilter): string => {
    const parts: string[] = [];
    if (f.from || f.to) {
        // สลับให้ตรงกับที่ filterPartnerHistory ใช้กรองจริง เมื่อผู้ใช้เลือกวันกลับด้าน
        let from = f.from, to = f.to;
        if (from && to && from > to) [from, to] = [to, from];
        const d = (ymd?: string) => (ymd ? formatBangkokDate(`${ymd}T12:00:00+07:00`) : '…');
        parts.push(`ช่วงวันที่ ${d(from)} – ${d(to)}`);
    }
    if (f.q?.trim()) parts.push(`ค้นเลขเอกสาร "${safeCell(f.q.trim())}"`);
    return parts.length ? parts.join(' · ') : 'ทุกรายการ';
};

export const buildPartnerWorkbook = (
    partnerName: string,
    history: PartnerHistoryRow[],
    monthly: PartnerMonthSummaryRow[],
    filter: PartnerHistoryFilter,
    now: Date = new Date()
): ExcelJS.Workbook => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Neo Siam Logistics';
    wb.created = now;

    const ws = wb.addWorksheet('ประวัติรับ-คืน');
    ws.addRow([`ประวัติรับ-คืนพาเลท ${safeCell(partnerName)} กับนีโอสยาม`]).font = { bold: true, size: 13 };
    ws.addRow([`${filterLabel(filter)} · ข้อมูล ณ ${now.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} · ${history.length} รายการ`]);
    ws.addRow(['วันที่', 'เลขที่เอกสาร', 'รายการ', 'ประเภทพาเลท', 'สาขานีโอสยาม', 'จำนวน (ใบ)']);
    for (const h of history) {
        ws.addRow([formatBangkokDate(h.date), safeCell(h.docNo), KIND_TEXT[h.kind] || h.kind, safeCell(h.palletName), safeCell(h.branchName), h.qty]);
    }
    if (!history.length) ws.addRow(['ไม่มีรายการ']);
    style(ws, 3, [12, 24, 18, 26, 28, 12]);

    const ms = wb.addWorksheet('สรุปรายเดือน');
    ms.addRow(['สรุปรับ-คืนรายเดือน (ไม่ใช่ยอดคงค้าง)']).font = { bold: true, size: 13 };
    ms.addRow([filterLabel(filter)]);
    ms.addRow(['เดือน', 'ประเภทพาเลท', 'ส่งให้นีโอสยาม (ใบ)', 'นีโอสยามคืน (ใบ)', 'จำนวนเอกสาร']);
    for (const m of monthly) ms.addRow([formatThaiMonth(m.month), safeCell(m.palletName), m.received, m.returned, m.docs]);
    if (!monthly.length) ms.addRow(['ไม่มีรายการ']);
    style(ms, 3, [14, 26, 20, 18, 14]);

    return wb;
};

/** สร้างไฟล์แล้วให้เบราว์เซอร์ดาวน์โหลด · คืนชื่อไฟล์ */
export const downloadPartnerWorkbook = async (
    partnerName: string,
    history: PartnerHistoryRow[],
    monthly: PartnerMonthSummaryRow[],
    filter: PartnerHistoryFilter
): Promise<string> => {
    const wb = buildPartnerWorkbook(partnerName, history, monthly, filter);
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const range = filter.from || filter.to ? `_${filter.from || 'start'}_${filter.to || 'now'}` : '';
    const fileName = `ประวัติรับคืนพาเลท_NeoSiam${range}.xlsx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return fileName;
};
