import { Stock, Transaction, BranchId, PalletId, Branch, PalletType } from '../types';
import { BRANCHES, PALLET_TYPES } from '../constants';

/**
 * โครงข้อมูลดิบที่อ่านมาจาก Firebase root ในหนึ่ง transaction
 * (Firebase อาจคืน transactions มาเป็น array หรือ object แล้วแต่รูปแบบที่เคยบันทึกไว้)
 */
export interface RootSnapshot {
    stock?: Stock | null;
    transactions?: Transaction[] | Record<string, Transaction> | null;
    [key: string]: unknown;
}

/**
 * ข้อผิดพลาดเชิงธุรกิจที่ผู้ใช้ต้องเห็นข้อความ เช่น สต็อกไม่พอ
 * แยกจาก Error ทั่วไป เพื่อให้ชั้น UI แสดงข้อความไทยได้ตรงจุด
 */
export class StockValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'StockValidationError';
    }
}

/**
 * แปลง transactions ที่อ่านจาก Firebase ให้เป็น array เสมอ
 * Firebase RTDB จะยุบ array ที่มีรูโหว่ให้กลายเป็น object โดยอัตโนมัติ
 * จึงต้องรองรับทั้งสองรูปแบบ และคัดค่า null/undefined ทิ้ง
 */
export const normalizeTransactions = (
    raw: Transaction[] | Record<string, Transaction> | null | undefined
): Transaction[] => {
    if (!raw) return [];
    const list = Array.isArray(raw) ? raw : Object.values(raw);
    return list.filter((t): t is Transaction => Boolean(t) && typeof t === 'object');
};

const isBranch = (id: string): boolean => BRANCHES.some((b: Branch) => b.id === id);

const getPalletName = (palletId: PalletId): string =>
    PALLET_TYPES.find((p: PalletType) => p.id === palletId)?.name || palletId;

const getBranchName = (branchId: string): string =>
    BRANCHES.find((b: Branch) => b.id === branchId)?.name || branchId;

/**
 * คัดลอกสต็อกแบบ deep copy เฉพาะสองชั้นที่ระบบใช้จริง (branch → pallet → number)
 * เพื่อไม่ให้การคำนวณไปแก้ค่าใน snapshot เดิมที่ Firebase ส่งมา
 */
export const cloneStock = (stock: Stock | null | undefined): Stock => {
    const next = {} as Stock;
    if (!stock) return next;
    (Object.keys(stock) as BranchId[]).forEach(branchId => {
        next[branchId] = { ...(stock[branchId] || {}) } as Record<PalletId, number>;
    });
    return next;
};

/**
 * บวก/ลบยอดพาเลทของสาขาหนึ่ง โดยสร้าง object ใหม่เสมอ
 * ใช้ค่าเริ่มต้น 0 เมื่อยังไม่เคยมีพาเลทชนิดนั้นในสาขา
 */
export const applyDelta = (
    stock: Stock,
    branchId: string,
    palletId: PalletId,
    delta: number
): void => {
    const branch = stock[branchId as BranchId];
    if (!branch) return;
    branch[palletId] = (branch[palletId] || 0) + delta;
};

/**
 * ตรวจว่าสาขาต้นทางมีของพอจ่ายหรือไม่ ก่อนหักสต็อกจริง
 *
 * สำคัญ: ต้องเรียกด้วย "สต็อกสดจาก Firebase" เท่านั้น ห้ามใช้ค่าจาก React state
 * เพราะ state อาจค้างอยู่ที่ยอดก่อนหน้าที่สาขาอื่นเพิ่งตัดไป (race condition)
 *
 * ตรวจแบบสะสม: หลายรายการในเอกสารเดียวกันที่เป็นพาเลทชนิดเดียวกัน
 * ต้องนับรวมกันก่อนเทียบกับยอดคงเหลือ ไม่ใช่ตรวจทีละรายการ
 */
export const assertSufficientStock = (
    stock: Stock,
    txs: Transaction[]
): void => {
    const required = new Map<string, number>();

    txs.forEach(tx => {
        if (tx.type === 'ADJUST') return;
        if (!isBranch(tx.source)) return;
        const key = `${tx.source}::${tx.palletId}`;
        required.set(key, (required.get(key) || 0) + tx.qty);
    });

    required.forEach((needed, key) => {
        const [branchId, palletId] = key.split('::');
        const available = (stock[branchId as BranchId] as Record<PalletId, number> | undefined)?.[palletId as PalletId] || 0;
        if (available < needed) {
            throw new StockValidationError(
                `สต็อกไม่เพียงพอ: ${getBranchName(branchId)} มี ${getPalletName(palletId as PalletId)} เหลือ ${available} แต่ต้องการจ่าย ${needed}`
            );
        }
    });
};

/**
 * รวมรายการใหม่เข้ากับรายการเดิม โดยยึด id เป็นตัวชี้
 * - เจอ id เดิม  → แทนที่ (กรณีอัปเดตสถานะ เช่น PENDING → COMPLETED)
 * - ไม่เจอ id    → เพิ่มต่อท้าย
 */
export const mergeTransactions = (
    current: Transaction[],
    incoming: Transaction[]
): Transaction[] => {
    const merged = [...current];
    const indexById = new Map<number, number>();
    merged.forEach((t, i) => {
        if (t && typeof t.id === 'number') indexById.set(t.id, i);
    });

    incoming.forEach(tx => {
        const at = indexById.get(tx.id);
        if (at !== undefined) {
            merged[at] = tx;
        } else {
            indexById.set(tx.id, merged.length);
            merged.push(tx);
        }
    });

    return merged;
};

/**
 * ฟังก์ชันที่รับ "ข้อมูลสดทั้งก้อน" แล้วคืนก้อนใหม่ที่คำนวณเสร็จแล้ว
 * ถูกออกแบบให้เป็น pure function เพื่อ:
 *   1. ให้ Firebase runTransaction เรียกซ้ำได้อย่างปลอดภัยเมื่อชนกัน
 *   2. ทดสอบได้โดยไม่ต้องต่อฐานข้อมูลจริง
 */
export type StockMutator = (
    currentStock: Stock,
    currentTxs: Transaction[]
) => { stock: Stock; txs: Transaction[] };

/**
 * สร้าง mutator สำหรับบันทึกรายการเคลื่อนย้าย
 *
 * ลำดับการทำงานภายใน (ต้องคงลำดับนี้ไว้):
 *   1. คัดลอกสต็อกสด
 *   2. ตรวจว่าของพอจ่าย  ← ต้องอยู่ก่อนหัก มิฉะนั้นสต็อกติดลบ
 *   3. หักต้นทาง / บวกปลายทาง
 *   4. รวมรายการเข้าชุดเดิม
 */
export const createMovementMutator = (newTxs: Transaction[]): StockMutator => {
    return (currentStock, currentTxs) => {
        const stock = cloneStock(currentStock);

        assertSufficientStock(stock, newTxs);

        newTxs.forEach(tx => {
            applyDelta(stock, tx.source, tx.palletId, -tx.qty);
            if (tx.status === 'COMPLETED') {
                applyDelta(stock, tx.dest, tx.palletId, tx.qty);
            }
        });

        return { stock, txs: mergeTransactions(currentTxs, newTxs) };
    };
};

/**
 * ยืนยันรับของปลายทาง (PENDING → COMPLETED)
 *
 * รองรับกรณีผู้รับแก้ยอด/ชนิดพาเลทตอนตรวจรับ:
 *   1. คืนยอดที่ต้นทางถูกหักไว้ตอนสร้างรายการ PENDING
 *   2. หักต้นทางใหม่ตามยอดที่รับจริง
 *   3. บวกปลายทางตามยอดที่รับจริง
 * ถ้าไม่มีการแก้ยอด (ไม่ส่ง originalTxs) จะข้ามขั้น 1-2 เพราะต้นทางถูกหักถูกต้องแล้ว
 */
export const createConfirmReceiveMutator = (
    results: Transaction[],
    originalTxs?: Transaction[]
): StockMutator => {
    return (currentStock, currentTxs) => {
        const stock = cloneStock(currentStock);
        const hasAdjustment = Boolean(originalTxs && originalTxs.length > 0);

        // กันยืนยันรับซ้ำ: ต้องตรวจสถานะจาก "ข้อมูลสด" ไม่ใช่จากที่หน้าจอส่งมา
        // เพราะหน้าจอของผู้ใช้อีกคนอาจยังค้างอยู่ที่สถานะ PENDING
        // ถ้าไม่ตรวจ การกดรับพร้อมกันจะบวกสต็อกปลายทางซ้ำสองเท่า
        const liveById = new Map(currentTxs.map(t => [t.id, t]));
        results.forEach(item => {
            const live = liveById.get(item.id);
            if (!live) return; // รายการใหม่ที่ยังไม่เคยบันทึก ปล่อยผ่าน
            if (live.status === 'COMPLETED') {
                throw new StockValidationError(
                    `รายการ ${live.docNo || item.id} ถูกยืนยันรับไปแล้ว กรุณารีเฟรชหน้าจอ`
                );
            }
            if (live.status === 'CANCELLED') {
                throw new StockValidationError(
                    `รายการ ${live.docNo || item.id} ถูกยกเลิกไปแล้ว ไม่สามารถยืนยันรับได้`
                );
            }
        });

        if (hasAdjustment) {
            originalTxs!.forEach(orig => {
                applyDelta(stock, orig.source, orig.palletId, orig.qty);
            });
        }

        const finalTxs = results.map(item => {
            const utx = {
                ...item,
                status: 'COMPLETED' as const,
                receivedAt: new Date().toISOString(),
            } as Transaction;

            // บันทึกยอดเดิมไว้เป็นหลักฐาน เมื่อผู้รับแก้ชนิดหรือจำนวนพาเลท
            if (originalTxs) {
                const orig = originalTxs.find(o => o.id === item.id);
                if (orig && (orig.palletId !== item.palletId || orig.qty !== item.qty)) {
                    utx.originalPalletId = orig.palletId;
                    utx.originalQty = orig.qty;
                }
            }
            return utx;
        });

        if (hasAdjustment) {
            assertSufficientStock(stock, finalTxs);
            finalTxs.forEach(utx => applyDelta(stock, utx.source, utx.palletId, -utx.qty));
        }

        finalTxs.forEach(utx => applyDelta(stock, utx.dest, utx.palletId, utx.qty));

        return { stock, txs: mergeTransactions(currentTxs, finalTxs) };
    };
};

/**
 * ยกเลิกเอกสาร (ทุกแถวที่มี docNo เดียวกัน) และคืนสต็อกกลับสู่สถานะก่อนหน้า
 *
 * ต้องค้นหาแถวที่จะยกเลิกจาก "ข้อมูลสด" ไม่ใช่จาก React state
 * เพื่อกันการยกเลิกซ้ำเมื่อผู้ใช้สองคนกดลบเอกสารเดียวกันพร้อมกัน
 */
export const createCancelMutator = (txId: number): StockMutator => {
    return (currentStock, currentTxs) => {
        const stock = cloneStock(currentStock);
        const target = currentTxs.find(t => t.id === txId);

        if (!target) {
            throw new StockValidationError('ไม่พบรายการที่ต้องการยกเลิก อาจถูกลบไปแล้ว');
        }

        const rowsToCancel = target.docNo
            ? currentTxs.filter(t => t.docNo === target.docNo && t.status !== 'CANCELLED')
            : [target];

        if (rowsToCancel.length === 0) {
            throw new StockValidationError('รายการนี้ถูกยกเลิกไปแล้ว');
        }

        rowsToCancel.forEach(t => {
            applyDelta(stock, t.source, t.palletId, t.qty);
            if (t.status === 'COMPLETED') {
                applyDelta(stock, t.dest, t.palletId, -t.qty);
            }
        });

        const cancelled = rowsToCancel.map(t => ({ ...t, status: 'CANCELLED' as const }));
        return { stock, txs: mergeTransactions(currentTxs, cancelled) };
    };
};

/**
 * ตั้งยอดสต็อกของสาขาเป็นค่าที่ระบุโดยตรง (ใช้กับการปรับยอด/สอบทาน)
 *
 * ต่างจาก movement ตรงที่ไม่ได้บวกลบจากยอดเดิม แต่ "เขียนทับ" ด้วยยอดที่นับได้จริง
 * จึงไม่ต้องตรวจสต็อกไม่พอ แต่ยังคงต้องทำใน transaction เพื่อไม่ให้ทับงานคนอื่น
 */
export const createSetStockMutator = (
    branchId: string,
    palletId: PalletId,
    newQty: number,
    auditTxs: Transaction[] = []
): StockMutator => {
    return (currentStock, currentTxs) => {
        const stock = cloneStock(currentStock);
        const branch = stock[branchId as BranchId];
        if (branch) {
            branch[palletId] = newQty;
        }
        return { stock, txs: mergeTransactions(currentTxs, auditTxs) };
    };
};

/**
 * กระจายจำนวนพาเลทเสียตามสัดส่วนของแต่ละชนิดในชุดที่ซ่อม
 *
 * ใช้วิธีปัดเศษแล้วให้รายการสุดท้ายรับส่วนที่เหลือทั้งหมด
 * เพื่อรับประกันว่าผลรวมเท่ากับ scrappedQty เสมอ (ไม่ขาดไม่เกินจากการปัดเศษ)
 */
export const distributeScrap = (
    items: { palletId: PalletId; qty: number }[],
    scrappedQty: number
): { palletId: PalletId; qty: number }[] => {
    if (scrappedQty <= 0 || items.length === 0) return [];

    const totalBatchQty = items.reduce((sum, i) => sum + i.qty, 0);
    if (totalBatchQty <= 0) return [];

    const result: { palletId: PalletId; qty: number }[] = [];
    let remaining = scrappedQty;

    items.forEach((item, idx) => {
        const isLast = idx === items.length - 1;
        const portion = isLast
            ? remaining
            : Math.min(remaining, Math.round((item.qty / totalBatchQty) * scrappedQty));
        if (portion > 0) {
            result.push({ palletId: item.palletId, qty: portion });
            remaining -= portion;
        }
    });

    return result;
};

/**
 * งานซ่อมบำรุง: หักพาเลทที่นำเข้าซ่อมออกจากสาขา บวกพาเลทที่ซ่อมเสร็จกลับเข้าสาขา
 * และย้ายพาเลทที่เสียใช้ไม่ได้ไปเก็บที่คลังซาก (scrap_stock)
 */
export const createMaintenanceMutator = (params: {
    branchId: string;
    items: { palletId: PalletId; qty: number }[];
    fixedQty: number;
    targetPalletId: PalletId;
    scrappedQty: number;
    auditTx: Transaction;
}): StockMutator => {
    return (currentStock, currentTxs) => {
        const stock = cloneStock(currentStock);

        // ตรวจของพอเข้าซ่อมจากสต็อกสดก่อนหัก เช่นเดียวกับการเคลื่อนย้าย
        // มิฉะนั้นสองคนที่ทำงานซ่อมพร้อมกันจะหักสต็อกคลังซ่อมจนติดลบ
        const required = new Map<PalletId, number>();
        params.items.forEach(i => required.set(i.palletId, (required.get(i.palletId) || 0) + i.qty));
        required.forEach((needed, palletId) => {
            const available = (stock[params.branchId as BranchId] as Record<PalletId, number> | undefined)?.[palletId] || 0;
            if (available < needed) {
                throw new StockValidationError(
                    `สต็อกไม่เพียงพอ: ${getBranchName(params.branchId)} มี ${getPalletName(palletId)} เหลือ ${available} แต่ต้องการนำเข้าซ่อม ${needed}`
                );
            }
        });

        params.items.forEach(i => applyDelta(stock, params.branchId, i.palletId, -i.qty));
        applyDelta(stock, params.branchId, params.targetPalletId, params.fixedQty);

        distributeScrap(params.items, params.scrappedQty).forEach(s =>
            applyDelta(stock, 'scrap_stock', s.palletId, s.qty)
        );

        return { stock, txs: mergeTransactions(currentTxs, [params.auditTx]) };
    };
};

/**
 * บันทึกรายการที่ไม่กระทบสต็อกสาขา (เช่น อัปเดตข้อมูลเอกสาร/บันทึกรายได้ขายซาก)
 * แยกออกมาเพื่อไม่ให้ต้องส่งสต็อกทั้งก้อนไปเขียนทับโดยไม่จำเป็น
 */
export const createTxOnlyMutator = (txs: Transaction[]): StockMutator => {
    return (currentStock, currentTxs) => ({
        stock: cloneStock(currentStock),
        txs: mergeTransactions(currentTxs, txs),
    });
};

/**
 * ปรับสต็อกหลายช่องพร้อมกันด้วยส่วนต่าง (delta) — ใช้กับงานซ่อมบำรุงและขายซาก
 * ที่ต้องหักพาเลทเสียออกจากสาขา แล้วบวกเข้าคลังซาก/คลังพร้อมใช้ในคราวเดียว
 */
export const createDeltaMutator = (
    deltas: { branchId: string; palletId: PalletId; delta: number }[],
    auditTxs: Transaction[] = []
): StockMutator => {
    return (currentStock, currentTxs) => {
        const stock = cloneStock(currentStock);
        deltas.forEach(d => applyDelta(stock, d.branchId, d.palletId, d.delta));
        return { stock, txs: mergeTransactions(currentTxs, auditTxs) };
    };
};
