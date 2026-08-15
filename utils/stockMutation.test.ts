import { describe, it, expect } from 'vitest';
import { Stock, Transaction, PalletId } from '../types';
import {
    normalizeTransactions,
    cloneStock,
    assertSufficientStock,
    mergeTransactions,
    createMovementMutator,
    createConfirmReceiveMutator,
    createCancelMutator,
    createSetStockMutator,
    createTxOnlyMutator,
    createDeltaMutator,
    createMaintenanceMutator,
    distributeScrap,
    StockValidationError,
    StockMutator,
} from './stockMutation';

/** สร้างสต็อกตั้งต้นแบบย่อสำหรับทดสอบ (ใช้ id สาขาจริงของระบบ) */
const makeStock = (overrides: Partial<Record<string, Record<string, number>>> = {}): Stock => ({
    hub_nw: { loscam_red: 100, general: 50 },
    plk: { loscam_red: 20, general: 10 },
    cm: { loscam_red: 0, general: 0 },
    kpp: { loscam_red: 0, general: 0 },
    ekp: { loscam_red: 0, general: 0 },
    ms: { loscam_red: 0, general: 0 },
    sai3: { loscam_red: 0, general: 0 },
    maintenance_stock: { loscam_red: 0, general: 0 },
    scrap_stock: { loscam_red: 0, general: 0 },
    ...overrides,
} as unknown as Stock);

const makeTx = (over: Partial<Transaction> = {}): Transaction => ({
    id: 1,
    date: '2026-08-15T00:00:00.000Z',
    docNo: 'INT-20260815-001',
    type: 'OUT',
    status: 'COMPLETED',
    source: 'hub_nw',
    dest: 'plk',
    palletId: 'loscam_red' as PalletId,
    qty: 10,
    ...over,
} as Transaction);

/**
 * จำลอง Firebase runTransaction:
 * เก็บข้อมูลกลางไว้หนึ่งชุด ให้ mutator อ่าน-เขียนแบบ atomic ทีละราย
 * ใช้พิสูจน์ว่าการคำนวณจากข้อมูลสดให้ผลถูกต้องเมื่อมีหลายคนเขียนพร้อมกัน
 */
const makeFakeDb = (initialStock: Stock, initialTxs: Transaction[] = []) => {
    let stock = initialStock;
    let txs = initialTxs;
    return {
        run(mutator: StockMutator) {
            const result = mutator(stock, txs);
            stock = result.stock;
            txs = result.txs;
        },
        get stock() { return stock; },
        get txs() { return txs; },
    };
};

describe('normalizeTransactions', () => {
    it('คืน array ว่างเมื่อไม่มีข้อมูล', () => {
        expect(normalizeTransactions(null)).toEqual([]);
        expect(normalizeTransactions(undefined)).toEqual([]);
    });

    it('รองรับข้อมูลที่ Firebase คืนมาเป็น object', () => {
        const tx = makeTx();
        expect(normalizeTransactions({ a: tx })).toEqual([tx]);
    });

    it('คัดค่า null ที่ Firebase แทรกมาในช่องว่างของ array ทิ้ง', () => {
        const tx = makeTx();
        const raw = [tx, null, undefined] as unknown as Transaction[];
        expect(normalizeTransactions(raw)).toEqual([tx]);
    });
});

describe('cloneStock', () => {
    it('แก้ก้อนที่คัดลอกแล้วต้องไม่กระทบต้นฉบับ', () => {
        const original = makeStock();
        const copy = cloneStock(original);
        copy.hub_nw.loscam_red = 999;
        expect(original.hub_nw.loscam_red).toBe(100);
    });
});

describe('assertSufficientStock', () => {
    it('ผ่านเมื่อของพอจ่าย', () => {
        expect(() =>
            assertSufficientStock(makeStock(), [makeTx({ qty: 100 })])
        ).not.toThrow();
    });

    it('โยน error พร้อมข้อความไทยเมื่อของไม่พอ', () => {
        expect(() =>
            assertSufficientStock(makeStock(), [makeTx({ qty: 101 })])
        ).toThrow(StockValidationError);
    });

    it('นับรวมหลายรายการพาเลทเดียวกันในเอกสารเดียวก่อนตรวจ', () => {
        // 60 + 50 = 110 > 100 ที่มีอยู่ — ถ้าตรวจทีละรายการจะหลุด
        const txs = [
            makeTx({ id: 1, qty: 60 }),
            makeTx({ id: 2, qty: 50 }),
        ];
        expect(() => assertSufficientStock(makeStock(), txs)).toThrow(StockValidationError);
    });

    it('ไม่ตรวจสต็อกเมื่อต้นทางเป็นคู่ค้าภายนอก (ไม่ใช่สาขา)', () => {
        const tx = makeTx({ source: 'sino', dest: 'hub_nw', type: 'IN', qty: 9999 });
        expect(() => assertSufficientStock(makeStock(), [tx])).not.toThrow();
    });

    it('ข้ามการตรวจสำหรับรายการปรับยอด (ADJUST)', () => {
        const tx = makeTx({ type: 'ADJUST', qty: 9999 });
        expect(() => assertSufficientStock(makeStock(), [tx])).not.toThrow();
    });
});

describe('mergeTransactions', () => {
    it('เพิ่มรายการใหม่ต่อท้าย', () => {
        const existing = [makeTx({ id: 1 })];
        const result = mergeTransactions(existing, [makeTx({ id: 2 })]);
        expect(result).toHaveLength(2);
    });

    it('แทนที่รายการเดิมเมื่อ id ซ้ำ แทนการเพิ่มซ้ำ', () => {
        const existing = [makeTx({ id: 1, status: 'PENDING' })];
        const result = mergeTransactions(existing, [makeTx({ id: 1, status: 'COMPLETED' })]);
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('COMPLETED');
    });

    it('ไม่แก้ array เดิมที่ส่งเข้ามา', () => {
        const existing = [makeTx({ id: 1 })];
        mergeTransactions(existing, [makeTx({ id: 2 })]);
        expect(existing).toHaveLength(1);
    });
});

describe('createMovementMutator', () => {
    it('หักต้นทางและบวกปลายทางเมื่อสถานะ COMPLETED', () => {
        const mutator = createMovementMutator([makeTx({ qty: 10 })]);
        const { stock } = mutator(makeStock(), []);
        expect(stock.hub_nw.loscam_red).toBe(90);
        expect(stock.plk.loscam_red).toBe(30);
    });

    it('หักต้นทางแต่ยังไม่บวกปลายทางเมื่อสถานะ PENDING', () => {
        const mutator = createMovementMutator([makeTx({ qty: 10, status: 'PENDING' })]);
        const { stock } = mutator(makeStock(), []);
        expect(stock.hub_nw.loscam_red).toBe(90);
        expect(stock.plk.loscam_red).toBe(20); // ยังไม่เพิ่ม รอยืนยันรับ
    });

    it('ไม่แก้สต็อกต้นฉบับที่รับเข้ามา', () => {
        const original = makeStock();
        createMovementMutator([makeTx({ qty: 10 })])(original, []);
        expect(original.hub_nw.loscam_red).toBe(100);
    });
});

describe('createConfirmReceiveMutator', () => {
    it('บวกสต็อกปลายทางเมื่อยืนยันรับตามยอดเดิม', () => {
        const pending = makeTx({ id: 1, qty: 10, status: 'PENDING' });
        // ต้นทางถูกหักไปแล้วตอนสร้าง PENDING (100 - 10 = 90)
        const stock = makeStock({ hub_nw: { loscam_red: 90, general: 50 } });

        const { stock: next } = createConfirmReceiveMutator([pending])(stock, [pending]);

        expect(next.plk.loscam_red).toBe(30); // 20 + 10
        expect(next.hub_nw.loscam_red).toBe(90); // ต้นทางไม่ถูกหักซ้ำ
    });

    it('ปรับยอดต้นทางให้ถูกต้องเมื่อผู้รับแก้จำนวน', () => {
        const original = makeTx({ id: 1, qty: 10, status: 'PENDING' });
        const received = makeTx({ id: 1, qty: 7, status: 'PENDING' }); // รับจริงแค่ 7
        const stock = makeStock({ hub_nw: { loscam_red: 90, general: 50 } });

        const { stock: next, txs } = createConfirmReceiveMutator([received], [original])(stock, [original]);

        expect(next.hub_nw.loscam_red).toBe(93); // คืน 10 แล้วหัก 7 → 90+10-7
        expect(next.plk.loscam_red).toBe(27);    // 20 + 7
        expect(txs[0].originalQty).toBe(10);      // เก็บหลักฐานยอดเดิม
    });

    it('ตั้งสถานะเป็น COMPLETED และบันทึกเวลารับ', () => {
        const pending = makeTx({ id: 1, status: 'PENDING' });
        const { txs } = createConfirmReceiveMutator([pending])(makeStock(), [pending]);
        expect(txs[0].status).toBe('COMPLETED');
        expect(txs[0].receivedAt).toBeTruthy();
    });

    it('ปฏิเสธเมื่อรายการถูกยืนยันรับไปแล้ว (กัน 2 คนกดรับพร้อมกัน)', () => {
        const already = makeTx({ id: 1, status: 'COMPLETED' });
        // ข้อมูลสดบอกว่ารับไปแล้ว — ห้ามบวกสต็อกปลายทางซ้ำ
        expect(() =>
            createConfirmReceiveMutator([makeTx({ id: 1, status: 'PENDING' })])(makeStock(), [already])
        ).toThrow(StockValidationError);
    });

    it('ปฏิเสธเมื่อรายการถูกยกเลิกไปแล้ว', () => {
        const cancelled = makeTx({ id: 1, status: 'CANCELLED' });
        expect(() =>
            createConfirmReceiveMutator([makeTx({ id: 1, status: 'PENDING' })])(makeStock(), [cancelled])
        ).toThrow(StockValidationError);
    });

    it('สต็อกปลายทางต้องไม่บวกซ้ำเมื่อกดรับ 2 ครั้งติดกัน', () => {
        const pending = makeTx({ id: 1, qty: 10, status: 'PENDING' });
        const db = makeFakeDb(makeStock({ hub_nw: { loscam_red: 90, general: 50 } }), [pending]);

        db.run(createConfirmReceiveMutator([pending]));
        expect(db.stock.plk.loscam_red).toBe(30); // 20 + 10

        // คนที่สองกดรับใบเดิม — ต้องถูกปฏิเสธ ไม่ใช่บวกเป็น 40
        expect(() => db.run(createConfirmReceiveMutator([pending]))).toThrow(StockValidationError);
        expect(db.stock.plk.loscam_red).toBe(30);
    });
});

describe('createCancelMutator', () => {
    it('คืนสต็อกต้นทางและหักปลายทางเมื่อยกเลิกรายการที่ COMPLETED แล้ว', () => {
        const tx = makeTx({ id: 1, qty: 10, status: 'COMPLETED' });
        const stock = makeStock({
            hub_nw: { loscam_red: 90, general: 50 },
            plk: { loscam_red: 30, general: 10 },
        });

        const { stock: next, txs } = createCancelMutator(1)(stock, [tx]);

        expect(next.hub_nw.loscam_red).toBe(100); // คืนกลับ
        expect(next.plk.loscam_red).toBe(20);     // หักออก
        expect(txs[0].status).toBe('CANCELLED');
    });

    it('ยกเลิกทุกแถวที่อยู่ในเอกสารเดียวกัน', () => {
        const txs = [
            makeTx({ id: 1, docNo: 'DOC-1', palletId: 'loscam_red' as PalletId, qty: 5 }),
            makeTx({ id: 2, docNo: 'DOC-1', palletId: 'general' as PalletId, qty: 3 }),
        ];
        const { txs: result } = createCancelMutator(1)(makeStock(), txs);
        expect(result.filter(t => t.status === 'CANCELLED')).toHaveLength(2);
    });

    it('ปฏิเสธเมื่อรายการถูกยกเลิกไปแล้ว (กันกดลบซ้ำ 2 คน)', () => {
        const tx = makeTx({ id: 1, status: 'CANCELLED' });
        expect(() => createCancelMutator(1)(makeStock(), [tx])).toThrow(StockValidationError);
    });

    it('ปฏิเสธเมื่อไม่พบรายการ', () => {
        expect(() => createCancelMutator(999)(makeStock(), [])).toThrow(StockValidationError);
    });

    it('ย้อนงานซ่อมบำรุงได้ครบทุกช่อง (ของเข้าซ่อม/ซ่อมเสร็จ/เข้าคลังซาก)', () => {
        // จำลองสภาพหลังบันทึกงานซ่อม: หัก loscam_red 10, ได้ general 6, เข้าคลังซาก 4
        const stock = makeStock({
            maintenance_stock: { loscam_red: 10, general: 6 },
            scrap_stock: { loscam_red: 4, general: 0 },
        });
        const maintTx = makeTx({
            id: 1,
            type: 'MAINTENANCE',
            source: 'maintenance_stock',
            dest: 'maintenance_stock',
            palletId: 'general' as PalletId,
            qty: 6,
            maintenanceItems: [{ palletId: 'loscam_red' as PalletId, qty: 10 }],
            scrapAllocations: [{ palletId: 'loscam_red' as PalletId, qty: 4 }],
        });

        const { stock: next } = createCancelMutator(1)(stock, [maintTx]);

        expect(next.maintenance_stock.loscam_red).toBe(20); // คืนของเข้าซ่อม 10
        expect(next.maintenance_stock.general).toBe(0);      // ถอนของที่ซ่อมเสร็จ 6
        expect(next.scrap_stock.loscam_red).toBe(0);         // ถอนของออกจากคลังซาก 4
    });

    it('ปฏิเสธการยกเลิกเมื่อจะทำให้สต็อกติดลบ (ของถูกใช้ไปแล้ว)', () => {
        // ของในคลังซากถูกขายไปแล้ว เหลือ 0 → ยกเลิกงานซ่อมไม่ได้
        const stock = makeStock({
            maintenance_stock: { loscam_red: 0, general: 6 },
            scrap_stock: { loscam_red: 0, general: 0 },
        });
        const maintTx = makeTx({
            id: 1,
            type: 'MAINTENANCE',
            source: 'maintenance_stock',
            dest: 'maintenance_stock',
            palletId: 'general' as PalletId,
            qty: 6,
            maintenanceItems: [{ palletId: 'loscam_red' as PalletId, qty: 10 }],
            scrapAllocations: [{ palletId: 'loscam_red' as PalletId, qty: 4 }],
        });

        expect(() => createCancelMutator(1)(stock, [maintTx])).toThrow(StockValidationError);
    });

    it('ปฏิเสธการยกเลิกเอกสารซ่อมรุ่นเก่าที่ไม่มีรายละเอียดการเคลื่อนไหว', () => {
        // เอกสารที่บันทึกไว้ก่อนมี maintenanceItems/scrapAllocations
        // ย้อนสต็อกให้ครบไม่ได้ จึงต้องปฏิเสธ ไม่ใช่ย้อนครึ่ง ๆ กลาง ๆ จนข้อมูลพัง
        const legacyTx = makeTx({
            id: 1,
            type: 'MAINTENANCE',
            source: 'maintenance_stock',
            dest: 'maintenance_stock',
            palletId: 'general' as PalletId,
            qty: 6,
            // ไม่มี maintenanceItems / scrapAllocations
        });
        const stock = makeStock({ maintenance_stock: { loscam_red: 10, general: 6 } });

        expect(() => createCancelMutator(1)(stock, [legacyTx])).toThrow(StockValidationError);
    });

    it('ยกเลิกเอกสารซ่อมที่ไม่มีของเสียได้ ถ้ามี maintenanceItems ครบ', () => {
        // scrapAllocations ว่างได้ตามปกติ (ซ่อมเสร็จหมด ไม่มีของทิ้ง) ต้องไม่ถูกปฏิเสธ
        const tx = makeTx({
            id: 1,
            type: 'MAINTENANCE',
            source: 'maintenance_stock',
            dest: 'maintenance_stock',
            palletId: 'general' as PalletId,
            qty: 10,
            maintenanceItems: [{ palletId: 'loscam_red' as PalletId, qty: 10 }],
            scrapAllocations: [],
        });
        const stock = makeStock({ maintenance_stock: { loscam_red: 0, general: 10 } });

        const { stock: next } = createCancelMutator(1)(stock, [tx]);
        expect(next.maintenance_stock.loscam_red).toBe(10);
        expect(next.maintenance_stock.general).toBe(0);
    });

    it('ปฏิเสธการยกเลิกเอกสารทั่วไปเมื่อปลายทางของหมดแล้ว', () => {
        // ส่งของไป plk แล้ว plk จ่ายต่อจนหมด → ยกเลิกไม่ได้เพราะจะติดลบ
        const tx = makeTx({ id: 1, qty: 10, status: 'COMPLETED', dest: 'cm' });
        const stock = makeStock({ cm: { loscam_red: 0, general: 0 } });

        expect(() => createCancelMutator(1)(stock, [tx])).toThrow(StockValidationError);
    });
});

describe('createSetStockMutator', () => {
    it('ตั้งยอดเป็นค่าที่ระบุโดยตรง', () => {
        const { stock } = createSetStockMutator('hub_nw', 'loscam_red' as PalletId, 42)(makeStock(), []);
        expect(stock.hub_nw.loscam_red).toBe(42);
    });

    it('ตั้งยอดเป็น 0 ได้ (ไม่ถูกมองว่าเป็นค่าว่าง)', () => {
        const { stock } = createSetStockMutator('hub_nw', 'loscam_red' as PalletId, 0)(makeStock(), []);
        expect(stock.hub_nw.loscam_red).toBe(0);
    });
});

describe('createDeltaMutator', () => {
    it('ปรับหลายช่องพร้อมกันในครั้งเดียว', () => {
        const { stock } = createDeltaMutator([
            { branchId: 'maintenance_stock', palletId: 'loscam_red' as PalletId, delta: -5 },
            { branchId: 'scrap_stock', palletId: 'loscam_red' as PalletId, delta: 5 },
        ])(makeStock({ maintenance_stock: { loscam_red: 10, general: 0 } }), []);

        expect(stock.maintenance_stock.loscam_red).toBe(5);
        expect(stock.scrap_stock.loscam_red).toBe(5);
    });
});

describe('distributeScrap', () => {
    it('ผลรวมที่กระจายต้องเท่ากับจำนวนที่เสียเสมอ', () => {
        const items = [
            { palletId: 'loscam_red' as PalletId, qty: 7 },
            { palletId: 'general' as PalletId, qty: 3 },
        ];
        const result = distributeScrap(items, 10);
        expect(result.reduce((s, r) => s + r.qty, 0)).toBe(10);
    });

    it('ผลรวมยังตรงแม้สัดส่วนปัดเศษไม่ลงตัว', () => {
        const items = [
            { palletId: 'loscam_red' as PalletId, qty: 1 },
            { palletId: 'general' as PalletId, qty: 1 },
        ];
        const result = distributeScrap(items, 7); // 3.5 ต่อชนิด
        expect(result.reduce((s, r) => s + r.qty, 0)).toBe(7);
    });

    it('คืนค่าว่างเมื่อไม่มีของเสีย', () => {
        expect(distributeScrap([{ palletId: 'general' as PalletId, qty: 5 }], 0)).toEqual([]);
    });

    it('ไม่คืนจำนวนติดลบเมื่อของเสียน้อยกว่าจำนวนชนิด', () => {
        const items = [
            { palletId: 'loscam_red' as PalletId, qty: 50 },
            { palletId: 'general' as PalletId, qty: 1 },
        ];
        const result = distributeScrap(items, 1);
        expect(result.every(r => r.qty >= 0)).toBe(true);
        expect(result.reduce((s, r) => s + r.qty, 0)).toBe(1);
    });
});

describe('createMaintenanceMutator', () => {
    it('หักของเข้าซ่อม บวกของซ่อมเสร็จ และย้ายของเสียไปคลังซาก', () => {
        const stock = makeStock({ maintenance_stock: { loscam_red: 20, general: 0 } });
        const auditTx = makeTx({ id: 1, type: 'MAINTENANCE', source: 'maintenance_stock', dest: 'maintenance_stock' });

        const { stock: next } = createMaintenanceMutator({
            branchId: 'maintenance_stock',
            items: [{ palletId: 'loscam_red' as PalletId, qty: 10 }],
            fixedQty: 6,
            targetPalletId: 'general' as PalletId,
            scrappedQty: 4,
            auditTx,
        })(stock, []);

        expect(next.maintenance_stock.loscam_red).toBe(10); // 20 - 10
        expect(next.maintenance_stock.general).toBe(6);      // ซ่อมเสร็จ
        expect(next.scrap_stock.loscam_red).toBe(4);         // ของเสียเข้าคลังซาก
    });

    it('ปฏิเสธเมื่อของเข้าซ่อมมากกว่าที่มีในคลัง', () => {
        const stock = makeStock({ maintenance_stock: { loscam_red: 5, general: 0 } });
        expect(() =>
            createMaintenanceMutator({
                branchId: 'maintenance_stock',
                items: [{ palletId: 'loscam_red' as PalletId, qty: 10 }], // มีแค่ 5
                fixedQty: 6,
                targetPalletId: 'general' as PalletId,
                scrappedQty: 4,
                auditTx: makeTx({ id: 1, type: 'MAINTENANCE' }),
            })(stock, [])
        ).toThrow(StockValidationError);
    });

    it('สต็อกซ่อมบำรุงต้องไม่ติดลบเมื่อ 2 คนทำงานซ่อมพร้อมกัน', () => {
        const db = makeFakeDb(makeStock({ maintenance_stock: { loscam_red: 12, general: 0 } }));
        const build = (id: number) => createMaintenanceMutator({
            branchId: 'maintenance_stock',
            items: [{ palletId: 'loscam_red' as PalletId, qty: 10 }],
            fixedQty: 8,
            targetPalletId: 'general' as PalletId,
            scrappedQty: 2,
            auditTx: makeTx({ id, type: 'MAINTENANCE' }),
        });

        db.run(build(1));                                  // เหลือ 2
        expect(() => db.run(build(2))).toThrow(StockValidationError);
        expect(db.stock.maintenance_stock.loscam_red).toBe(2); // ไม่ติดลบ
    });
});

describe('createTxOnlyMutator', () => {
    it('เพิ่มรายการโดยไม่แตะสต็อก', () => {
        const { stock, txs } = createTxOnlyMutator([makeTx({ id: 5 })])(makeStock(), []);
        expect(stock.hub_nw.loscam_red).toBe(100);
        expect(txs).toHaveLength(1);
    });
});

describe('🔥 Race condition: 2 สาขาบันทึกพร้อมกัน', () => {
    it('สต็อกต้องถูกต้องเมื่อ 2 รายการตัดจากสาขาเดียวกันติดกัน', () => {
        const db = makeFakeDb(makeStock());

        // สาขา A จ่ายออก 10, สาขา B จ่ายออก 20 จาก hub_nw ชุดเดียวกัน
        db.run(createMovementMutator([makeTx({ id: 1, qty: 10, docNo: 'A' })]));
        db.run(createMovementMutator([makeTx({ id: 2, qty: 20, docNo: 'B' })]));

        // 100 - 10 - 20 = 70 (ของเดิมจะได้ 80 เพราะต่างคนต่างคำนวณจาก 100)
        expect(db.stock.hub_nw.loscam_red).toBe(70);
        expect(db.txs).toHaveLength(2);
    });

    it('รายการเก่าต้องไม่หายเมื่อบันทึกรายการใหม่ทับ', () => {
        const db = makeFakeDb(makeStock(), [makeTx({ id: 99, docNo: 'OLD' })]);
        db.run(createMovementMutator([makeTx({ id: 100, qty: 5, docNo: 'NEW' })]));

        expect(db.txs.map(t => t.docNo)).toContain('OLD');
        expect(db.txs.map(t => t.docNo)).toContain('NEW');
    });

    it('รายการที่สองต้องถูกปฏิเสธเมื่อรายการแรกใช้ของไปจนไม่พอ', () => {
        const db = makeFakeDb(makeStock()); // hub_nw มี 100

        db.run(createMovementMutator([makeTx({ id: 1, qty: 80 })])); // เหลือ 20

        // คนที่สองขอ 30 — ถ้าอ่านจากค่าเก่า (100) จะผ่าน แล้วสต็อกติดลบ
        expect(() =>
            db.run(createMovementMutator([makeTx({ id: 2, qty: 30 })]))
        ).toThrow(StockValidationError);

        expect(db.stock.hub_nw.loscam_red).toBe(20); // ไม่ติดลบ
    });
});
