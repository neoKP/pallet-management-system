import { describe, it, expect } from 'vitest';
import {
    PartnerHistoryRow, filterPartnerHistory, summarizePartnerByMonth,
    toBangkokDate, formatBangkokDate, formatThaiMonth,
} from './partnerPortal';
import { buildPartnerWorkbook, safeCell, filterLabel } from './partnerExport';

let seq = 0;
const row = (o: Partial<PartnerHistoryRow>): PartnerHistoryRow => ({
    id: ++seq,
    date: '2026-11-10T03:00:00.000Z',
    docNo: `EXT-IN-${seq}`,
    kind: 'RECEIVE',
    palletId: 'loscam_red',
    palletName: 'Loscam (สีแดง)',
    qty: 10,
    effect: -10,
    branchName: 'สาขาเชียงใหม่',
    ...o,
});

describe('วันที่ตามเวลาไทย', () => {
    it('เวลา UTC ที่ข้ามเที่ยงคืนไทย นับเป็นวันถัดไปตามเวลาไทย', () => {
        // 31 ต.ค. 18:30 UTC = 1 พ.ย. 01:30 เวลาไทย
        expect(toBangkokDate('2026-10-31T18:30:00.000Z')).toBe('2026-11-01');
        expect(formatBangkokDate('2026-10-31T18:30:00.000Z')).toBe('01/11/2026');
        expect(toBangkokDate('ไม่ใช่วันที่')).toBe('');
    });
    it('เดือนแบบไทย', () => {
        expect(formatThaiMonth('2026-11')).toBe('พ.ย. 2569');
        expect(formatThaiMonth('2026-01')).toBe('ม.ค. 2569');
    });
});

describe('filterPartnerHistory', () => {
    const rows = [
        row({ docNo: 'EXT-IN-20261101-001', date: '2026-10-31T18:30:00.000Z' }), // 1 พ.ย. ไทย
        row({ docNo: 'EXT-OUT-20261105-003', date: '2026-11-05T03:00:00.000Z', kind: 'RETURN' }),
        row({ docNo: 'EXT-IN-20261120-002', date: '2026-11-20T03:00:00.000Z' }),
    ];

    it('ไม่กรอง = ทุกแถว', () => {
        expect(filterPartnerHistory(rows, {})).toHaveLength(3);
    });
    it('ค้นเลขเอกสารบางส่วน ไม่สนตัวพิมพ์', () => {
        expect(filterPartnerHistory(rows, { q: 'ext-out' }).map(r => r.docNo)).toEqual(['EXT-OUT-20261105-003']);
        expect(filterPartnerHistory(rows, { q: '  1120 ' })).toHaveLength(1);
    });
    it('ช่วงวันที่รวมวันต้นและวันปลาย ตามเวลาไทย', () => {
        expect(filterPartnerHistory(rows, { from: '2026-11-01', to: '2026-11-05' }).map(r => r.docNo))
            .toEqual(['EXT-IN-20261101-001', 'EXT-OUT-20261105-003']);
        expect(filterPartnerHistory(rows, { from: '2026-11-02' })).toHaveLength(2);
        expect(filterPartnerHistory(rows, { to: '2026-10-31' })).toHaveLength(0);
    });
    it('เลือกวันกลับด้าน ระบบสลับให้เอง', () => {
        expect(filterPartnerHistory(rows, { from: '2026-11-05', to: '2026-11-01' })).toHaveLength(2);
    });
});

describe('summarizePartnerByMonth', () => {
    it('รวมรับ/คืนรายเดือนแยกประเภทพาเลท · ไม่นับคืนอัตโนมัติ/ปรับยอด · นับเอกสารไม่ซ้ำ', () => {
        const rows = [
            row({ docNo: 'A', qty: 10, date: '2026-11-02T03:00:00.000Z' }),
            row({ docNo: 'A', qty: 5, palletId: 'loscam_blue', palletName: 'Loscam (สีฟ้า)', date: '2026-11-02T03:00:00.000Z' }),
            row({ docNo: 'B', qty: 7, date: '2026-11-03T03:00:00.000Z' }),
            row({ docNo: 'C', kind: 'RETURN', qty: 4, date: '2026-11-04T03:00:00.000Z' }),
            row({ docNo: 'C-AUTO', kind: 'AUTO', qty: 99, date: '2026-11-04T03:00:00.000Z' }),
            row({ docNo: 'ADJ', kind: 'ADJUST', qty: 500, date: '2026-11-04T03:00:00.000Z' }),
            row({ docNo: 'D', qty: 3, date: '2026-10-31T18:30:00.000Z' }), // 1 พ.ย. ไทย
            row({ docNo: 'E', qty: 8, date: '2026-10-15T03:00:00.000Z' }),
        ];
        const s = summarizePartnerByMonth(rows);
        const novRed = s.find(r => r.month === '2026-11' && r.palletId === 'loscam_red')!;
        expect(novRed).toMatchObject({ received: 20, returned: 4, docs: 4 });
        expect(s.find(r => r.month === '2026-11' && r.palletId === 'loscam_blue')).toMatchObject({ received: 5, returned: 0, docs: 1 });
        expect(s.find(r => r.month === '2026-10')).toMatchObject({ received: 8, docs: 1 });
        expect(s[0].month).toBe('2026-11'); // ใหม่สุดก่อน
    });
});

describe('ไฟล์ Excel ของคู่ค้า', () => {
    it('มี 2 แผ่น ข้อมูลตรงกับที่กรอง และกันสูตรแฝง', async () => {
        const rows = [row({ docNo: '=HYPERLINK("x")', qty: 12 }), row({ docNo: 'EXT-OUT-1', kind: 'RETURN', qty: 3 })];
        const wb = buildPartnerWorkbook('บ. ซีโน-แปซิฟิค', rows, summarizePartnerByMonth(rows), { from: '2026-11-01' }, new Date('2026-11-14T06:00:00Z'));
        expect(wb.worksheets.map(w => w.name)).toEqual(['ประวัติรับ-คืน', 'สรุปรายเดือน']);
        const ws = wb.getWorksheet('ประวัติรับ-คืน')!;
        expect(ws.getRow(4).getCell(2).value).toBe(`'=HYPERLINK("x")`);
        expect(ws.getRow(4).getCell(6).value).toBe(12);
        expect(ws.getRow(5).getCell(3).value).toBe('นีโอสยามคืน');
        const ms = wb.getWorksheet('สรุปรายเดือน')!;
        expect(ms.getRow(4).values).toEqual([undefined, 'พ.ย. 2569', 'Loscam (สีแดง)', 12, 3, 2]);
        // เขียนไฟล์ได้จริง
        const buf = await wb.xlsx.writeBuffer();
        expect((buf as ArrayBuffer).byteLength).toBeGreaterThan(1000);
    });
    it('ข้อความตัวกรอง', () => {
        expect(filterLabel({})).toBe('ทุกรายการ');
        expect(filterLabel({ from: '2026-11-01', to: '2026-11-30', q: 'EXT' })).toBe('ช่วงวันที่ 01/11/2026 – 30/11/2026 · ค้นเลขเอกสาร "EXT"');
        expect(safeCell('+66')).toBe(`'+66`);
        // เลือกวันกลับด้าน — หัวไฟล์ต้องตรงกับช่วงที่กรองจริง
        expect(filterLabel({ from: '2026-11-05', to: '2026-11-01' })).toBe('ช่วงวันที่ 01/11/2026 – 05/11/2026');
    });
});
