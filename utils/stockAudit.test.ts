import { describe, it, expect } from 'vitest';
import { Stock, Transaction, PalletId } from '../types';
import { buildStockAudit, getStaleStockAlerts, STALE_DAYS_WARNING } from './stockAudit';

const NOW = new Date('2026-08-15T00:00:00.000Z');

/** สร้างวันที่ย้อนหลังจาก NOW ตามจำนวนวันที่ระบุ */
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();

const makeStock = (over: Record<string, Record<string, number>> = {}): Stock => ({
    hub_nw: { loscam_red: 100 },
    sai3: { loscam_red: 50 },
    ...over,
} as unknown as Stock);

const makeTx = (o: Partial<Transaction>): Transaction => ({
    id: 1,
    date: daysAgo(1),
    docNo: 'DOC-1',
    type: 'OUT',
    status: 'COMPLETED',
    source: 'hub_nw',
    dest: 'sai3',
    palletId: 'loscam_red' as PalletId,
    qty: 1,
    ...o,
} as Transaction);

describe('buildStockAudit', () => {
    it('รายงานว่าไม่เคยนับ เมื่อไม่มีการปรับยอดเลย', () => {
        const rows = buildStockAudit(makeStock(), [], NOW);
        const hub = rows.find(r => r.branchId === 'hub_nw')!;
        expect(hub.lastCountedAt).toBeNull();
        expect(hub.daysSinceCount).toBeNull();
        expect(hub.level).toBe('critical');
    });

    it('คำนวณจำนวนวันจากการปรับยอดครั้งล่าสุด', () => {
        const txs = [
            makeTx({ id: 1, type: 'ADJUST', date: daysAgo(90), dest: 'hub_nw' }),
            makeTx({ id: 2, type: 'ADJUST', date: daysAgo(10), dest: 'hub_nw' }), // ล่าสุด
        ];
        const hub = buildStockAudit(makeStock(), txs, NOW).find(r => r.branchId === 'hub_nw')!;
        expect(hub.daysSinceCount).toBe(10);
    });

    it('นับเฉพาะรายการเคลื่อนย้ายที่เกิดหลังการปรับยอด', () => {
        const txs = [
            makeTx({ id: 1, date: daysAgo(40), source: 'hub_nw' }),   // ก่อนปรับ ไม่นับ
            makeTx({ id: 2, type: 'ADJUST', date: daysAgo(30), dest: 'hub_nw' }),
            makeTx({ id: 3, date: daysAgo(20), source: 'hub_nw' }),   // หลังปรับ นับ
            makeTx({ id: 4, date: daysAgo(10), source: 'hub_nw' }),   // หลังปรับ นับ
        ];
        const hub = buildStockAudit(makeStock(), txs, NOW).find(r => r.branchId === 'hub_nw')!;
        expect(hub.movementsSince).toBe(2);
    });

    it('นับพาเลทที่ถูกนำเข้าซ่อม แม้เอกสารจะบันทึก palletId เป็นชนิดที่ซ่อมเสร็จ', () => {
        // งานซ่อม: หัก loscam_red 10 ตัว → ได้ general 6 ตัว
        // เอกสารบันทึก palletId='general' แต่ loscam_red ก็ถูกกระทบด้วย
        const stock = { maintenance_stock: { loscam_red: 20, general: 0 } } as unknown as Stock;
        const txs = [
            makeTx({ id: 1, type: 'ADJUST', date: daysAgo(5), dest: 'maintenance_stock', palletId: 'loscam_red' as PalletId }),
            makeTx({
                id: 2,
                type: 'MAINTENANCE',
                date: daysAgo(1),
                source: 'maintenance_stock',
                dest: 'maintenance_stock',
                palletId: 'general' as PalletId,
                qty: 6,
                maintenanceItems: [{ palletId: 'loscam_red' as PalletId, qty: 10 }],
            }),
        ];

        const red = buildStockAudit(stock, txs, NOW)
            .find(r => r.branchId === 'maintenance_stock' && r.palletId === 'loscam_red')!;
        expect(red.movementsSince).toBe(1);
    });

    it('นับพาเลทที่ถูกย้ายเข้าคลังซาก จาก scrapAllocations', () => {
        const stock = {
            maintenance_stock: { loscam_red: 10 },
            scrap_stock: { loscam_red: 5 },
        } as unknown as Stock;
        const txs = [
            makeTx({ id: 1, type: 'ADJUST', date: daysAgo(5), dest: 'scrap_stock', palletId: 'loscam_red' as PalletId }),
            makeTx({
                id: 2,
                type: 'MAINTENANCE',
                date: daysAgo(1),
                source: 'maintenance_stock',
                dest: 'maintenance_stock',
                palletId: 'general' as PalletId,
                qty: 6,
                maintenanceItems: [{ palletId: 'loscam_red' as PalletId, qty: 10 }],
                scrapAllocations: [{ palletId: 'loscam_red' as PalletId, qty: 4 }],
            }),
        ];

        const scrapRed = buildStockAudit(stock, txs, NOW)
            .find(r => r.branchId === 'scrap_stock' && r.palletId === 'loscam_red')!;
        expect(scrapRed.movementsSince).toBe(1);
    });

    it('ไม่นับรายการที่ยังไม่ถึงปลายทาง (PENDING) ให้สาขาปลายทาง', () => {
        // ของยังอยู่ระหว่างทาง สต็อกปลายทางยังไม่เปลี่ยน จึงไม่ควรเตือนให้นับ
        const txs = [
            makeTx({ id: 1, type: 'ADJUST', date: daysAgo(5), dest: 'sai3' }),
            makeTx({ id: 2, date: daysAgo(1), source: 'hub_nw', dest: 'sai3', status: 'PENDING' }),
        ];
        const sai3 = buildStockAudit(makeStock(), txs, NOW).find(r => r.branchId === 'sai3')!;
        expect(sai3.movementsSince).toBe(0);
    });

    it('ยังนับให้สาขาต้นทาง แม้รายการจะเป็น PENDING (เพราะของถูกหักแล้ว)', () => {
        const txs = [
            makeTx({ id: 1, type: 'ADJUST', date: daysAgo(5), dest: 'hub_nw' }),
            makeTx({ id: 2, date: daysAgo(1), source: 'hub_nw', dest: 'sai3', status: 'PENDING' }),
        ];
        const hub = buildStockAudit(makeStock(), txs, NOW).find(r => r.branchId === 'hub_nw')!;
        expect(hub.movementsSince).toBe(1);
    });

    it('ไม่นับรายการที่ถูกยกเลิกแล้ว', () => {
        const txs = [
            makeTx({ id: 1, type: 'ADJUST', date: daysAgo(30), dest: 'hub_nw' }),
            makeTx({ id: 2, date: daysAgo(5), source: 'hub_nw', status: 'CANCELLED' }),
        ];
        const hub = buildStockAudit(makeStock(), txs, NOW).find(r => r.branchId === 'hub_nw')!;
        expect(hub.movementsSince).toBe(0);
    });

    it('เรียงช่องที่ควรนับก่อนไว้บนสุด', () => {
        const txs = [
            // hub_nw เพิ่งปรับ ไม่มีรายการ → เสี่ยงต่ำ
            makeTx({ id: 1, type: 'ADJUST', date: daysAgo(1), dest: 'hub_nw' }),
            // sai3 ปรับนานแล้ว → เสี่ยงสูงกว่า
            makeTx({ id: 2, type: 'ADJUST', date: daysAgo(120), dest: 'sai3' }),
        ];
        const rows = buildStockAudit(makeStock(), txs, NOW);
        expect(rows[0].branchId).toBe('sai3');
    });

    it('ช่องที่มีรายการเคลื่อนไหวเยอะเสี่ยงกว่าช่องที่เงียบ แม้ปรับยอดวันเดียวกัน', () => {
        const txs: Transaction[] = [
            makeTx({ id: 1, type: 'ADJUST', date: daysAgo(20), dest: 'hub_nw' }),
            makeTx({ id: 2, type: 'ADJUST', date: daysAgo(20), dest: 'sai3' }),
        ];
        // ใส่รายการให้ hub_nw 50 ใบ
        for (let i = 0; i < 50; i++) {
            txs.push(makeTx({ id: 100 + i, date: daysAgo(5), source: 'hub_nw', dest: 'cm' }));
        }
        const rows = buildStockAudit(makeStock(), txs, NOW);
        const hub = rows.find(r => r.branchId === 'hub_nw')!;
        const sai3 = rows.find(r => r.branchId === 'sai3')!;
        expect(hub.riskScore).toBeGreaterThan(sai3.riskScore);
    });
});

describe('ระดับการแจ้งเตือน', () => {
    it('เกิน 60 วัน = critical', () => {
        const txs = [makeTx({ type: 'ADJUST', date: daysAgo(70), dest: 'hub_nw' })];
        const hub = buildStockAudit(makeStock(), txs, NOW).find(r => r.branchId === 'hub_nw')!;
        expect(hub.level).toBe('critical');
    });

    it('เกิน 30 วัน = warning', () => {
        const txs = [makeTx({ type: 'ADJUST', date: daysAgo(STALE_DAYS_WARNING + 1), dest: 'hub_nw' })];
        const hub = buildStockAudit(makeStock(), txs, NOW).find(r => r.branchId === 'hub_nw')!;
        expect(hub.level).toBe('warning');
    });

    it('เพิ่งปรับและรายการน้อย = ok', () => {
        const txs = [makeTx({ type: 'ADJUST', date: daysAgo(2), dest: 'hub_nw' })];
        const hub = buildStockAudit(makeStock(), txs, NOW).find(r => r.branchId === 'hub_nw')!;
        expect(hub.level).toBe('ok');
    });

    it('รายการเยอะเกิน 100 ใบ = warning แม้เพิ่งปรับยอด', () => {
        const txs: Transaction[] = [makeTx({ id: 1, type: 'ADJUST', date: daysAgo(2), dest: 'hub_nw' })];
        for (let i = 0; i < 101; i++) {
            txs.push(makeTx({ id: 100 + i, date: daysAgo(1), source: 'hub_nw', dest: 'cm' }));
        }
        const hub = buildStockAudit(makeStock(), txs, NOW).find(r => r.branchId === 'hub_nw')!;
        expect(hub.level).toBe('warning');
    });
});

describe('getStaleStockAlerts', () => {
    it('ตัดช่องที่ยอดเป็น 0 และไม่มีการเคลื่อนไหวออก', () => {
        const stock = makeStock({ cm: { loscam_red: 0, general: 0 } });
        const alerts = getStaleStockAlerts(stock, [], NOW);
        expect(alerts.some(a => a.branchId === 'cm')).toBe(false);
    });

    it('ยังแจ้งเตือนช่องที่ยอดเป็น 0 แต่มีการเคลื่อนไหว', () => {
        const stock = makeStock({ cm: { loscam_red: 0 } });
        const txs = [makeTx({ id: 1, date: daysAgo(5), source: 'cm', palletId: 'loscam_red' as PalletId })];
        const alerts = getStaleStockAlerts(stock, txs, NOW);
        expect(alerts.some(a => a.branchId === 'cm')).toBe(true);
    });

    it('ไม่แจ้งเตือนช่องที่สถานะ ok', () => {
        const txs = [makeTx({ type: 'ADJUST', date: daysAgo(1), dest: 'hub_nw' })];
        const alerts = getStaleStockAlerts(makeStock({ sai3: { loscam_red: 0 } }), txs, NOW);
        expect(alerts.some(a => a.branchId === 'hub_nw')).toBe(false);
    });
});
