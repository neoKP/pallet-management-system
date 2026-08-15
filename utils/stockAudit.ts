import { Transaction, PalletId, BranchId, Stock } from '../types';

/**
 * ตรวจว่าสต็อกช่องไหน "ไม่ได้นับจริง" มานานแล้ว
 *
 * ทำไมต้องมี:
 *   ยอดในระบบกับของจริงจะค่อย ๆ ต่างกันตามเวลา (ของตกหล่น นับพลาด บันทึกช้า)
 *   วิธีแก้คือนับสต็อกจริงแล้วปรับยอด (ADJUST) เป็นระยะ
 *   เครื่องมือนี้ช่วยบอกว่าช่องไหนควรนับก่อน โดยดูจากวันที่ปรับยอดครั้งล่าสุด
 *   และจำนวนรายการที่เกิดขึ้นหลังจากนั้น
 */

export interface StockAuditRow {
    branchId: string;
    palletId: PalletId;
    currentQty: number;
    /** วันที่ปรับยอดครั้งล่าสุด (ISO) — null = ไม่เคยปรับเลย */
    lastCountedAt: string | null;
    /** จำนวนวันนับจากการปรับยอดล่าสุด — null = ไม่เคยปรับ */
    daysSinceCount: number | null;
    /** จำนวนรายการเคลื่อนไหวหลังการปรับยอดล่าสุด */
    movementsSince: number;
    /** ยิ่งสูงยิ่งควรนับก่อน */
    riskScore: number;
    level: 'critical' | 'warning' | 'ok';
}

/** เกินกี่วันถือว่าควรนับใหม่ */
export const STALE_DAYS_WARNING = 30;
export const STALE_DAYS_CRITICAL = 60;

/**
 * ประเมินความเสี่ยงจากสองปัจจัย: นานแค่ไหนแล้ว และมีของเคลื่อนไหวเยอะแค่ไหน
 *
 * ช่องที่ปรับยอดนานแล้วแต่แทบไม่มีการเคลื่อนไหว ความเสี่ยงต่ำกว่าช่องที่
 * เพิ่งปรับแต่มีรายการวิ่งเข้าออกหลายร้อยใบ จึงถ่วงน้ำหนักทั้งสองอย่าง
 */
const computeRisk = (days: number | null, movements: number): number => {
    // ไม่เคยปรับยอดเลย = เสี่ยงสูงสุด
    if (days === null) return 1000 + movements;
    return days + movements * 2;
};

const levelOf = (days: number | null, movements: number): StockAuditRow['level'] => {
    if (days === null) return 'critical';
    if (days >= STALE_DAYS_CRITICAL) return 'critical';
    if (days >= STALE_DAYS_WARNING || movements >= 100) return 'warning';
    return 'ok';
};

/**
 * สร้างรายงานว่าช่องไหนควรนับสต็อกก่อน
 *
 * @param now วันที่อ้างอิง (ส่งเข้ามาเพื่อให้เทสต์ได้ ไม่อ่านเวลาปัจจุบันเอง)
 */
export const buildStockAudit = (
    stock: Stock,
    transactions: Transaction[],
    now: Date = new Date()
): StockAuditRow[] => {
    const rows: StockAuditRow[] = [];
    const nowMs = now.getTime();

    // เก็บเฉพาะรายการที่ยังไม่ถูกยกเลิก
    const active = transactions.filter(t => t && t.status !== 'CANCELLED');

    (Object.keys(stock || {}) as BranchId[]).forEach(branchId => {
        const palletMap = stock[branchId] || {};

        (Object.keys(palletMap) as PalletId[]).forEach(palletId => {
            // รายการที่กระทบช่องนี้
            //
            // เอกสารซ่อมบำรุงหักพาเลทชนิดหนึ่งแล้วได้อีกชนิดหนึ่ง โดยบันทึก palletId
            // เป็นชนิดที่ซ่อมเสร็จเท่านั้น ถ้าดูแค่ palletId ชนิดที่ถูกนำเข้าซ่อม
            // และของที่ย้ายเข้าคลังซากจะไม่ถูกนับว่ามีการเคลื่อนไหว
            const related = active.filter(t => {
                if (t.type === 'MAINTENANCE') {
                    const atSource = t.source === branchId;
                    // ชนิดที่ซ่อมเสร็จ (บวกกลับเข้าสาขาต้นทาง)
                    if (atSource && t.palletId === palletId) return true;
                    // ชนิดที่ถูกนำเข้าซ่อม (หักจากสาขาต้นทาง)
                    if (atSource && t.maintenanceItems?.some(i => i.palletId === palletId)) return true;
                    // ชนิดที่ถูกย้ายเข้าคลังซาก
                    if (branchId === 'scrap_stock' && t.scrapAllocations?.some(s => s.palletId === palletId)) return true;
                    return false;
                }
                if (t.palletId !== palletId) return false;
                // ต้นทางถูกหักตั้งแต่สร้างเอกสาร จึงนับทันทีไม่ว่าสถานะใด
                if (t.source === branchId) return true;
                // ปลายทางยังไม่ได้รับของจนกว่าจะยืนยันรับ (PENDING = ยังอยู่ระหว่างทาง)
                return t.dest === branchId && t.status === 'COMPLETED';
            });

            // หาการปรับยอดครั้งล่าสุด = จุดที่ยืนยันยอดจริงครั้งสุดท้าย
            let lastCountedAt: string | null = null;
            related.forEach(t => {
                if (t.type !== 'ADJUST' || !t.date) return;
                if (!lastCountedAt || t.date > lastCountedAt) lastCountedAt = t.date;
            });

            const daysSinceCount = lastCountedAt
                ? Math.floor((nowMs - new Date(lastCountedAt).getTime()) / 86400000)
                : null;

            // นับเฉพาะรายการเคลื่อนย้ายจริงที่เกิดหลังการปรับยอด (ไม่นับ ADJUST เอง)
            const movementsSince = related.filter(
                t => t.type !== 'ADJUST' && (!lastCountedAt || (t.date || '') > lastCountedAt)
            ).length;

            rows.push({
                branchId,
                palletId,
                currentQty: palletMap[palletId] || 0,
                lastCountedAt,
                daysSinceCount,
                movementsSince,
                riskScore: computeRisk(daysSinceCount, movementsSince),
                level: levelOf(daysSinceCount, movementsSince),
            });
        });
    });

    return rows.sort((a, b) => b.riskScore - a.riskScore);
};

/**
 * กรองเฉพาะช่องที่ควรนับ และตัดช่องที่ไม่มีของและไม่มีการเคลื่อนไหวออก
 * เพื่อไม่ให้รายการยาวจนหาของสำคัญไม่เจอ
 */
export const getStaleStockAlerts = (
    stock: Stock,
    transactions: Transaction[],
    now: Date = new Date()
): StockAuditRow[] =>
    buildStockAudit(stock, transactions, now).filter(
        r => r.level !== 'ok' && (r.currentQty !== 0 || r.movementsSince > 0)
    );
