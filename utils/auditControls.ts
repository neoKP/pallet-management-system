import { Stock, Transaction, PalletId, BranchId, CountFreeze } from '../types';
import { BRANCHES, PALLET_TYPES, EXTERNAL_PARTNERS } from '../constants';
import { StockValidationError } from './stockMutation';
import { calculatePartnerBalance } from './businessLogic';

/**
 * เครื่องมือสนับสนุนการตรวจนับสต็อกรายไตรมาส (Audit)
 *
 * รวม 3 เรื่องที่ผู้ตรวจต้องใช้:
 *   1. โหมดตรวจนับ  — ปิดรับการบันทึกชั่วคราว เพื่อให้ยอดในระบบนิ่งระหว่างนับของจริง
 *   2. เลขที่อ้างอิงการปรับยอด — ทุกการปรับยอดต้องสอบกลับได้ว่ามาจากใบตรวจนับหรือ CAR/PAR ใบไหน
 *   3. ข้อมูล ณ เวลาตัดยอด — รวบรวมยอดคงเหลือและรายการทั้งไตรมาสไว้ในชุดเดียว
 *
 * ทุกฟังก์ชันเป็น pure function รับเวลาเข้ามาเป็นพารามิเตอร์ เพื่อให้ทดสอบได้
 */

// ---------------------------------------------------------------------------
// 1. โหมดตรวจนับ
// ---------------------------------------------------------------------------

/** ระยะเวลาปิดรับการบันทึกที่เลือกได้ (ชั่วโมง) */
export const COUNT_FREEZE_HOUR_OPTIONS = [1, 2, 3, 4, 6, 8];

/** เพดานสูงสุด กันกรณีลืมปิดโหมดแล้วระบบล็อกค้างข้ามวัน */
export const COUNT_FREEZE_MAX_HOURS = 8;

/**
 * โหมดตรวจนับยังมีผลอยู่หรือไม่
 *
 * หมดอายุเองเมื่อเลยเวลา until เพื่อไม่ให้ทั้งบริษัทบันทึกงานไม่ได้
 * หากผู้ดูแลระบบลืมกดปิดโหมด
 */
export const isCountFreezeActive = (
    freeze: CountFreeze | null | undefined,
    nowMs: number
): boolean => {
    if (!freeze || !freeze.active || !freeze.until) return false;
    const untilMs = new Date(freeze.until).getTime();
    if (Number.isNaN(untilMs)) return false;
    return nowMs < untilMs;
};

const formatThaiTime = (iso: string): string =>
    new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

/** @throws StockValidationError เมื่ออยู่ระหว่างตรวจนับ (ไม่ต้องลองบันทึกซ้ำ) */
export const assertNotFrozen = (
    freeze: CountFreeze | null | undefined,
    nowMs: number
): void => {
    if (!isCountFreezeActive(freeze, nowMs)) return;
    throw new StockValidationError(
        `อยู่ระหว่างตรวจนับสต็อก ระบบปิดรับการบันทึกชั่วคราวถึงเวลา ${formatThaiTime(freeze!.until)} น. ` +
        'กรุณาจดรายการลงกระดาษพร้อมเวลาและเลขที่เอกสาร แล้วบันทึกเข้าระบบหลังเปิดระบบ'
    );
};

export const buildCountFreeze = (params: {
    hours: number;
    by: string;
    note?: string;
    now: Date;
}): CountFreeze => {
    const hours = Number(params.hours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > COUNT_FREEZE_MAX_HOURS) {
        throw new StockValidationError(`ระยะเวลาตรวจนับต้องอยู่ระหว่าง 1 ถึง ${COUNT_FREEZE_MAX_HOURS} ชั่วโมง`);
    }
    const startedAt = params.now.toISOString();
    const until = new Date(params.now.getTime() + hours * 3600000).toISOString();
    const freeze: CountFreeze = { active: true, startedAt, until, by: params.by.slice(0, 100) };
    const note = (params.note || '').trim().slice(0, 200);
    // Firebase ไม่รับค่า undefined จึงใส่ note เฉพาะเมื่อมีข้อความ
    if (note) freeze.note = note;
    return freeze;
};

// ---------------------------------------------------------------------------
// 2. เลขที่อ้างอิงการปรับยอด
// ---------------------------------------------------------------------------

export const ADJUST_REF_MIN_LENGTH = 3;
/** ต้องไม่เกินที่ database rules กำหนดให้ referenceDocNo */
export const ADJUST_REF_MAX_LENGTH = 50;

/**
 * ตรวจเลขที่อ้างอิงของการปรับยอด แล้วคืนค่าที่ตัดช่องว่างแล้ว
 *
 * การตั้งยอดเริ่มต้นระบบ (isInitial) ไม่บังคับ เพราะยังไม่มีใบตรวจนับหรือ CAR/PAR ให้อ้าง
 *
 * @throws StockValidationError เมื่อไม่กรอกหรือยาวเกิน
 */
export const validateAdjustReference = (
    reference: string | null | undefined,
    isInitial?: boolean
): string | undefined => {
    const value = (reference || '').trim();
    if (value.length > ADJUST_REF_MAX_LENGTH) {
        throw new StockValidationError(`เลขที่อ้างอิงยาวเกิน ${ADJUST_REF_MAX_LENGTH} ตัวอักษร`);
    }
    if (isInitial) return value || undefined;
    if (value.length < ADJUST_REF_MIN_LENGTH) {
        throw new StockValidationError(
            'กรุณาระบุเลขที่อ้างอิงของการปรับยอด เช่น เลขที่ CAR/PAR (CAR-26-001) หรือเลขที่ใบตรวจนับ'
        );
    }
    return value;
};

// ---------------------------------------------------------------------------
// 3. ข้อมูล ณ เวลาตัดยอด
// ---------------------------------------------------------------------------

export type Quarter = 1 | 2 | 3 | 4;

/** ช่วงเวลาของไตรมาสตามเวลาเครื่องผู้ใช้ — start รวม, end ไม่รวม */
export const getQuarterRange = (year: number, quarter: Quarter): { start: Date; end: Date } => ({
    start: new Date(year, (quarter - 1) * 3, 1),
    end: new Date(year, quarter * 3, 1),
});

/** ไตรมาสล่าสุดที่จบไปแล้ว — ค่าเริ่มต้นของการตรวจ เพราะตรวจหลังสิ้นไตรมาส */
export const getPreviousQuarter = (now: Date): { year: number; quarter: Quarter } => {
    const current = Math.floor(now.getMonth() / 3) + 1;
    return current === 1
        ? { year: now.getFullYear() - 1, quarter: 4 }
        : { year: now.getFullYear(), quarter: (current - 1) as Quarter };
};

export interface CutoffStockRow {
    branchId: BranchId;
    branchName: string;
    palletId: PalletId;
    palletName: string;
    qty: number;
}

export interface CutoffPartnerRow {
    partnerId: string;
    partnerName: string;
    palletId: PalletId;
    palletName: string;
    balance: number;
}

export interface CutoffPendingRow {
    tx: Transaction;
    /** จำนวนวันเต็มที่ค้างระหว่างทาง นับถึงเวลาตัดยอด */
    daysPending: number;
}

export interface CutoffSnapshot {
    year: number;
    quarter: Quarter;
    cutoffAt: string;
    stockRows: CutoffStockRow[];
    /** รายการทั้งหมดของไตรมาส ทุกสถานะ เรียงตามวันที่ */
    quarterTxs: Transaction[];
    /** รายการค้างระหว่างทางทั้งหมด ณ เวลาตัดยอด (ไม่จำกัดไตรมาส) */
    pending: CutoffPendingRow[];
    adjusts: Transaction[];
    cancelled: Transaction[];
    maintenanceAndScrap: Transaction[];
    partnerRows: CutoffPartnerRow[];
}

const palletName = (id: PalletId): string => PALLET_TYPES.find(p => p.id === id)?.name || id;

/**
 * รวบรวมข้อมูลที่ผู้ตรวจต้องใช้ ณ เวลาตัดยอด ไว้ในชุดเดียว
 *
 * @param cutoffAt เวลาตัดยอด (ส่งเข้ามาเพื่อให้ทดสอบได้ ไม่อ่านเวลาปัจจุบันเอง)
 */
export const buildCutoffSnapshot = (
    stock: Stock,
    transactions: Transaction[],
    params: { year: number; quarter: Quarter; cutoffAt: Date }
): CutoffSnapshot => {
    const { start, end } = getQuarterRange(params.year, params.quarter);
    const startMs = start.getTime();
    const endMs = end.getTime();
    const cutoffMs = params.cutoffAt.getTime();
    const all = (transactions || []).filter(Boolean);

    const stockRows: CutoffStockRow[] = [];
    BRANCHES.forEach(b => {
        PALLET_TYPES.forEach(p => {
            stockRows.push({
                branchId: b.id,
                branchName: b.name,
                palletId: p.id,
                palletName: p.name,
                qty: stock?.[b.id]?.[p.id] || 0,
            });
        });
    });

    const quarterTxs = all
        .filter(t => {
            const ms = new Date(t.date).getTime();
            return !Number.isNaN(ms) && ms >= startMs && ms < endMs;
        })
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    const pending: CutoffPendingRow[] = all
        .filter(t => t.status === 'PENDING')
        .map(tx => ({
            tx,
            daysPending: Math.max(0, Math.floor((cutoffMs - new Date(tx.date).getTime()) / 86400000)),
        }))
        .sort((a, b) => b.daysPending - a.daysPending);

    const partnerRows: CutoffPartnerRow[] = [];
    EXTERNAL_PARTNERS.forEach(partner => {
        partner.allowedPallets.forEach(pid => {
            partnerRows.push({
                partnerId: partner.id,
                partnerName: partner.name,
                palletId: pid,
                palletName: palletName(pid),
                balance: calculatePartnerBalance(all, partner.id, pid),
            });
        });
    });

    return {
        year: params.year,
        quarter: params.quarter,
        cutoffAt: params.cutoffAt.toISOString(),
        stockRows,
        quarterTxs,
        pending,
        adjusts: quarterTxs.filter(t => t.type === 'ADJUST'),
        cancelled: quarterTxs.filter(t => t.status === 'CANCELLED'),
        maintenanceAndScrap: quarterTxs.filter(
            t => t.type === 'MAINTENANCE' || t.type === 'SCRAP_SALE' || t.type === 'SCRAP_DISCARD'
        ),
        partnerRows,
    };
};
