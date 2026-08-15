import { describe, it, expect } from 'vitest';
import { EXTERNAL_PARTNERS, AUTOMATION_RULES } from '../constants';
import { Partner } from '../types';

/**
 * เทสต์กติกาการทำรายการกับคู่ค้า อ่านจาก constants โดยตรง
 * เพื่อกันการแก้กติกาพลาดโดยไม่รู้ตัว (เช่น ลบสาขาออกจาก branchRestriction)
 */

const findPartner = (id: string): Partner => {
    const p = EXTERNAL_PARTNERS.find(x => x.id === id);
    if (!p) throw new Error(`ไม่พบคู่ค้า ${id}`);
    return p;
};

/** จำลองตรรกะเดียวกับที่ useMovementLogic ใช้ตรวจสิทธิ์สาขา */
const isBranchAllowed = (partner: Partner, branchId: string, type: 'IN' | 'OUT'): boolean => {
    const restriction = type === 'IN' ? partner.branchRestriction?.in : partner.branchRestriction?.out;
    if (restriction === undefined) return true;   // ไม่กำหนด = ทำได้ทุกสาขา
    if (restriction === 'all') return true;
    if (restriction === 'none') return false;
    return Array.isArray(restriction) && restriction.includes(branchId);
};

describe('HI-Q (hiq_th) — สิทธิ์รายสาขา', () => {
    const hiq = findPartner('hiq_th');

    it('สาย 3 รับเข้าและจ่ายออกได้ (กติกาเดิม ต้องไม่หาย)', () => {
        expect(isBranchAllowed(hiq, 'sai3', 'IN')).toBe(true);
        expect(isBranchAllowed(hiq, 'sai3', 'OUT')).toBe(true);
    });

    it('ศูนย์ฯ นครสวรรค์ (hub_nw) รับเข้าและจ่ายออกได้', () => {
        expect(isBranchAllowed(hiq, 'hub_nw', 'IN')).toBe(true);
        expect(isBranchAllowed(hiq, 'hub_nw', 'OUT')).toBe(true);
    });

    it('สาขาอื่นยังทำไม่ได้ (ต้องโอนกันภายในตามกติกาเดิม)', () => {
        ['plk', 'cm', 'kpp', 'ekp', 'ms'].forEach(branch => {
            expect(isBranchAllowed(hiq, branch, 'IN')).toBe(false);
            expect(isBranchAllowed(hiq, branch, 'OUT')).toBe(false);
        });
    });

    it('รองรับเฉพาะพาเลท HI-Q เท่านั้น', () => {
        expect(hiq.allowedPallets).toEqual(['hiq']);
    });
});

describe('HI-Q — การยืนยันอัตโนมัติตอนจ่ายออก', () => {
    it('สาย 3 ยืนยันอัตโนมัติ', () => {
        expect(AUTOMATION_RULES.sai3.partnersWithAutoFlow).toContain('hiq_th');
    });

    it('ศูนย์ฯ นครสวรรค์ ยืนยันอัตโนมัติเช่นกัน', () => {
        expect(AUTOMATION_RULES.hub_nw.partnersWithAutoFlow).toContain('hiq_th');
    });
});

describe('คู่ค้าอื่นต้องไม่ถูกกระทบจากการแก้ครั้งนี้', () => {
    it('Loscam วังน้อย: จ่ายออกได้เฉพาะนครสวรรค์ และรับเข้าไม่ได้เลย', () => {
        const loscam = findPartner('loscam_wangnoi');
        expect(isBranchAllowed(loscam, 'hub_nw', 'OUT')).toBe(true);
        expect(isBranchAllowed(loscam, 'sai3', 'OUT')).toBe(false);
        expect(isBranchAllowed(loscam, 'hub_nw', 'IN')).toBe(false);
    });

    it('ล่ำสูง: ทำได้ที่สาย 3 และนครสวรรค์ตามเดิม', () => {
        const lamsoon = findPartner('lamsoon');
        expect(isBranchAllowed(lamsoon, 'sai3', 'IN')).toBe(true);
        expect(isBranchAllowed(lamsoon, 'hub_nw', 'IN')).toBe(true);
        expect(isBranchAllowed(lamsoon, 'plk', 'IN')).toBe(false);
    });
});
