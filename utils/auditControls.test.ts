import { describe, it, expect } from 'vitest';
import { Stock, Transaction, PalletId, CountFreeze } from '../types';
import { StockValidationError } from './stockMutation';
import {
    COUNT_FREEZE_MAX_HOURS,
    assertNotFrozen,
    buildCountFreeze,
    buildCutoffSnapshot,
    getPreviousQuarter,
    getQuarterRange,
    isCountFreezeActive,
    validateAdjustReference,
} from './auditControls';

const NOW = new Date('2026-04-06T02:00:00.000Z');

const makeFreeze = (o: Partial<CountFreeze> = {}): CountFreeze => ({
    active: true,
    startedAt: NOW.toISOString(),
    until: new Date(NOW.getTime() + 2 * 3600000).toISOString(),
    by: 'admin',
    ...o,
});

const makeTx = (o: Partial<Transaction>): Transaction => ({
    id: 1,
    date: new Date(2026, 1, 10, 12).toISOString(),
    docNo: 'DOC-1',
    type: 'OUT',
    status: 'COMPLETED',
    source: 'hub_nw',
    dest: 'sai3',
    palletId: 'loscam_red' as PalletId,
    qty: 1,
    ...o,
} as Transaction);

describe('isCountFreezeActive', () => {
    it('ไม่ล็อกเมื่อไม่มีข้อมูลโหมดตรวจนับ', () => {
        expect(isCountFreezeActive(null, NOW.getTime())).toBe(false);
        expect(isCountFreezeActive(undefined, NOW.getTime())).toBe(false);
    });

    it('ล็อกเมื่อเปิดโหมดและยังไม่ครบเวลา', () => {
        expect(isCountFreezeActive(makeFreeze(), NOW.getTime() + 3600000)).toBe(true);
    });

    it('ปลดล็อกเองเมื่อครบเวลา แม้ลืมกดปิดโหมด', () => {
        const freeze = makeFreeze();
        expect(isCountFreezeActive(freeze, new Date(freeze.until).getTime())).toBe(false);
        expect(isCountFreezeActive(freeze, new Date(freeze.until).getTime() + 1)).toBe(false);
    });

    it('ไม่ล็อกเมื่อ active เป็น false หรือเวลาสิ้นสุดอ่านไม่ได้', () => {
        expect(isCountFreezeActive(makeFreeze({ active: false }), NOW.getTime())).toBe(false);
        expect(isCountFreezeActive(makeFreeze({ until: 'not-a-date' }), NOW.getTime())).toBe(false);
        expect(isCountFreezeActive(makeFreeze({ until: '' }), NOW.getTime())).toBe(false);
    });
});

describe('assertNotFrozen', () => {
    it('ผ่านเมื่อไม่ได้อยู่ระหว่างตรวจนับ', () => {
        expect(() => assertNotFrozen(null, NOW.getTime())).not.toThrow();
    });

    it('โยน StockValidationError เพื่อไม่ให้ระบบลองบันทึกซ้ำ', () => {
        expect(() => assertNotFrozen(makeFreeze(), NOW.getTime())).toThrow(StockValidationError);
        expect(() => assertNotFrozen(makeFreeze(), NOW.getTime())).toThrow(/ตรวจนับสต็อก/);
    });
});

describe('buildCountFreeze', () => {
    it('กำหนดเวลาสิ้นสุดตามจำนวนชั่วโมง', () => {
        const freeze = buildCountFreeze({ hours: 4, by: 'admin', now: NOW });
        expect(freeze.active).toBe(true);
        expect(new Date(freeze.until).getTime() - NOW.getTime()).toBe(4 * 3600000);
        expect(isCountFreezeActive(freeze, NOW.getTime())).toBe(true);
    });

    it('ไม่ใส่ note เมื่อเป็นค่าว่าง เพราะ Firebase ไม่รับ undefined', () => {
        const freeze = buildCountFreeze({ hours: 1, by: 'admin', note: '   ', now: NOW });
        expect('note' in freeze).toBe(false);
    });

    it('ปฏิเสธระยะเวลาที่ไม่อยู่ในช่วงที่อนุญาต', () => {
        [0, -1, COUNT_FREEZE_MAX_HOURS + 1, NaN].forEach(hours => {
            expect(() => buildCountFreeze({ hours, by: 'admin', now: NOW })).toThrow(StockValidationError);
        });
    });
});

describe('validateAdjustReference', () => {
    it('คืนค่าที่ตัดช่องว่างแล้ว', () => {
        expect(validateAdjustReference('  CAR-26-001 ')).toBe('CAR-26-001');
    });

    it('บังคับกรอกเมื่อเป็นการปรับยอดทั่วไป', () => {
        ['', '   ', 'ab', null, undefined].forEach(value => {
            expect(() => validateAdjustReference(value as any)).toThrow(StockValidationError);
        });
    });

    it('ไม่บังคับเมื่อเป็นการตั้งยอดเริ่มต้น', () => {
        expect(validateAdjustReference('', true)).toBeUndefined();
        expect(validateAdjustReference('INIT-01', true)).toBe('INIT-01');
    });

    it('ปฏิเสธเลขที่ที่ยาวเกิน database rules', () => {
        expect(() => validateAdjustReference('x'.repeat(51))).toThrow(StockValidationError);
        expect(() => validateAdjustReference('x'.repeat(51), true)).toThrow(StockValidationError);
        expect(validateAdjustReference('x'.repeat(50))).toHaveLength(50);
    });
});

describe('getQuarterRange / getPreviousQuarter', () => {
    it('ไตรมาส 1 เริ่ม 1 ม.ค. และจบก่อน 1 เม.ย.', () => {
        const { start, end } = getQuarterRange(2026, 1);
        expect([start.getFullYear(), start.getMonth(), start.getDate()]).toEqual([2026, 0, 1]);
        expect([end.getFullYear(), end.getMonth(), end.getDate()]).toEqual([2026, 3, 1]);
    });

    it('ไตรมาส 4 จบที่ 1 ม.ค. ของปีถัดไป', () => {
        const { end } = getQuarterRange(2026, 4);
        expect([end.getFullYear(), end.getMonth()]).toEqual([2027, 0]);
    });

    it('คืนไตรมาสล่าสุดที่จบแล้ว และข้ามปีได้', () => {
        expect(getPreviousQuarter(new Date(2026, 3, 6))).toEqual({ year: 2026, quarter: 1 });
        expect(getPreviousQuarter(new Date(2026, 0, 8))).toEqual({ year: 2025, quarter: 4 });
        expect(getPreviousQuarter(new Date(2026, 11, 31))).toEqual({ year: 2026, quarter: 3 });
    });
});

describe('buildCutoffSnapshot', () => {
    const stock = { hub_nw: { loscam_red: 120 }, sai3: { loscam_red: 30 } } as unknown as Stock;
    const cutoffAt = new Date(2026, 3, 6, 8, 30);
    const txs: Transaction[] = [
        makeTx({ id: 1, date: new Date(2026, 0, 5).toISOString() }),
        makeTx({ id: 2, date: new Date(2026, 2, 31, 23).toISOString(), type: 'ADJUST', source: 'SYSTEM_ADJUSTMENT', dest: 'hub_nw' }),
        makeTx({ id: 3, date: new Date(2026, 1, 1).toISOString(), status: 'CANCELLED' }),
        makeTx({ id: 4, date: new Date(2026, 1, 2).toISOString(), type: 'SCRAP_SALE', source: 'scrap_stock', dest: 'SOLD' }),
        makeTx({ id: 5, date: new Date(2026, 3, 1, 0, 0).toISOString() }),              // ไตรมาส 2
        makeTx({ id: 6, date: new Date(2025, 11, 31, 23).toISOString() }),             // ไตรมาส 4 ปีก่อน
        makeTx({ id: 7, date: new Date(2026, 3, 1, 8, 30).toISOString(), status: 'PENDING' }), // ค้าง 5 วัน
    ];
    const snap = buildCutoffSnapshot(stock, txs, { year: 2026, quarter: 1, cutoffAt });

    it('รวมเฉพาะรายการในไตรมาสที่เลือก ทุกสถานะ เรียงตามวันที่', () => {
        expect(snap.quarterTxs.map(t => t.id)).toEqual([1, 3, 4, 2]);
    });

    it('แยกรายการปรับยอด ยกเลิก และซ่อม/ซาก', () => {
        expect(snap.adjusts.map(t => t.id)).toEqual([2]);
        expect(snap.cancelled.map(t => t.id)).toEqual([3]);
        expect(snap.maintenanceAndScrap.map(t => t.id)).toEqual([4]);
    });

    it('รายการค้างระหว่างทางนับทุกไตรมาส พร้อมจำนวนวันที่ค้าง', () => {
        expect(snap.pending).toHaveLength(1);
        expect(snap.pending[0].tx.id).toBe(7);
        expect(snap.pending[0].daysPending).toBe(5);
    });

    it('ยอดคงเหลือครบทุกสาขาและทุกชนิด ช่องที่ไม่มีข้อมูลเป็น 0', () => {
        expect(snap.stockRows).toHaveLength(9 * 7);
        expect(snap.stockRows.find(r => r.branchId === 'hub_nw' && r.palletId === 'loscam_red')?.qty).toBe(120);
        expect(snap.stockRows.find(r => r.branchId === 'cm' && r.palletId === 'hiq')?.qty).toBe(0);
    });

    it('มียอดค้างคู่ค้าตามชนิดพาเลทที่อนุญาตของแต่ละราย', () => {
        const sino = snap.partnerRows.filter(r => r.partnerId === 'sino');
        expect(sino.map(r => r.palletId).sort()).toEqual(['loscam_blue', 'loscam_red']);
    });

    it('ไม่พังเมื่อไม่มีข้อมูลหรือวันที่อ่านไม่ได้', () => {
        const empty = buildCutoffSnapshot({} as Stock, [makeTx({ date: 'bad' }), null as any], { year: 2026, quarter: 1, cutoffAt });
        expect(empty.quarterTxs).toHaveLength(0);
        expect(empty.stockRows.every(r => r.qty === 0)).toBe(true);
    });
});
