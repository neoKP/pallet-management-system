import { describe, it, expect } from 'vitest';
import { Stock, Transaction, PalletId } from '../types';
import { buildCutoffSnapshot } from './auditControls';
import { buildCutoffWorkbook } from './cutoffExport';

const makeTx = (o: Partial<Transaction>): Transaction => ({
    id: 1,
    date: new Date(2026, 1, 10, 12).toISOString(),
    docNo: 'DOC-1',
    type: 'OUT',
    status: 'COMPLETED',
    source: 'hub_nw',
    dest: 'sai3',
    palletId: 'loscam_red' as PalletId,
    qty: 5,
    ...o,
} as Transaction);

const stock = { hub_nw: { loscam_red: 120, hiq: 4 }, sai3: { loscam_red: 30 } } as unknown as Stock;
const cutoffAt = new Date(2026, 3, 6, 8, 30);

const build = (txs: Transaction[]) =>
    buildCutoffWorkbook(buildCutoffSnapshot(stock, txs, { year: 2026, quarter: 1, cutoffAt }), 'admin');

describe('buildCutoffWorkbook', () => {
    it('มีแผ่นงานครบตามที่แผน Audit ต้องใช้', () => {
        const names = build([]).worksheets.map(w => w.name);
        expect(names).toEqual(['สรุป', 'ยอดคงเหลือ', 'รายการไตรมาส', 'ค้างระหว่างทาง', 'ปรับยอด', 'ยกเลิก', 'ซ่อมและซาก', 'ยอดค้างคู่ค้า']);
    });

    it('แผ่นยอดคงเหลือมีทุกสาขา พร้อมแถวรวมที่บวกถูก', () => {
        const ws = build([]).getWorksheet('ยอดคงเหลือ')!;
        // แถว 1 ชื่อรายงาน, 2 ว่าง, 3 หัวตาราง, 4-12 สาขา 9 แห่ง, 13 รวม
        expect(ws.rowCount).toBe(13);
        const hub = ws.getRow(4).values as any[];
        expect(hub[1]).toBe('ศูนย์ฯ NW (Hub)');
        expect(hub[2]).toBe(120);
        const total = ws.getRow(13).values as any[];
        expect(total[1]).toBe('รวม');
        expect(total[2]).toBe(150);          // loscam_red รวมทุกสาขา
        expect(total[total.length - 1]).toBe(154); // รวมทุกชนิด
    });

    it('แปลงรหัสสาขาและชนิดพาเลทเป็นชื่อที่อ่านได้', () => {
        const ws = build([makeTx({ referenceDocNo: 'CAR-26-001' })]).getWorksheet('รายการไตรมาส')!;
        const row = ws.getRow(4).values as any[];
        expect(row[3]).toBe('จ่ายออก');
        expect(row[5]).toBe('ศูนย์ฯ NW (Hub)');
        expect(row[6]).toBe('สาขาพุทธมณฑลสาย 3');
        expect(row[7]).toBe('Loscam (สีแดง)');
        expect(row[8]).toBe(5);
        expect(row[9]).toBe('CAR-26-001');
    });

    it('กันข้อความที่ผู้ใช้กรอกไม่ให้ถูกตีความเป็นสูตร Excel', () => {
        const ws = build([makeTx({ note: '=HYPERLINK("http://x","y")', driverName: '+66812345678' })]).getWorksheet('รายการไตรมาส')!;
        const row = ws.getRow(4).values as any[];
        expect(row[13]).toBe(`'=HYPERLINK("http://x","y")`);
        expect(row[11]).toBe(`'+66812345678`);
        expect(typeof ws.getRow(4).getCell(13).value).toBe('string');
    });

    it('แผ่นที่ไม่มีข้อมูลระบุว่าไม่มีรายการ แทนการเว้นว่าง', () => {
        const ws = build([]).getWorksheet('ปรับยอด')!;
        expect((ws.getRow(4).values as any[])[1]).toBe('ไม่มีรายการ');
    });

    it('เขียนเป็นไฟล์ xlsx ได้จริง', async () => {
        const buffer = await build([makeTx({}), makeTx({ id: 2, status: 'PENDING', date: new Date(2026, 3, 1).toISOString() })]).xlsx.writeBuffer();
        expect(buffer.byteLength).toBeGreaterThan(5000);
    });
});
