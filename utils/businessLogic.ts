import { Transaction, PalletId, Partner } from '../types';
import { EXTERNAL_PARTNERS } from '../constants';

/**
 * Calculates the balance contribution of a transaction for a specific partner and pallet.
 * 
 * Sign Convention (ใช้เหมือนกันทั้ง Provider และ Customer):
 *   ค่าลบ = ยืมอยู่ (เป็นหนี้) → ยืมเข้า (IN) = ลบมากขึ้น
 *   ค่าบวก = คืนแล้ว (หนี้ลด) → ส่งคืน (OUT) = ลบน้อยลง
 */
export const getPartnerBalanceContribution = (t: Transaction, partnerId: string, palletId: PalletId): number => {
    if (t.palletId !== palletId || t.status !== 'COMPLETED') return 0;

    const isLoscamRed = partnerId === 'loscam_wangnoi' && palletId === 'loscam_red';

    // 1. Initial/Adjust Logic (Global for all partners to prevent conflicts)
    if (t.type === 'ADJUST' || t.isInitial) {
        if (t.dest === partnerId) return t.qty; // Adjustment increasing balance
        if (t.source === partnerId) return -t.qty; // Adjustment decreasing balance
        return 0;
    }

    // 2. Special Case: Loscam Red (Debt from Wangnoi vs Neo Corp)
    //    รับจาก Neo Corp = ยืมเพิ่ม = ลบ (หนี้เพิ่ม)
    //    ส่งคืน Loscam = คืนหนี้ = บวก (หนี้ลด)
    if (isLoscamRed) {
        if (t.source === 'neo_corp') return -t.qty;       // ยืมเพิ่ม → หนี้เพิ่ม (ลบ)
        if (t.dest === 'loscam_wangnoi') return t.qty;    // ส่งคืน → หนี้ลด (บวก)
        return 0;
    }

    // 3. Special Case: Sino Logic (We borrow from them)
    //    รับจาก Sino = ยืมเพิ่ม = ลบ (หนี้เพิ่ม)
    //    ส่งคืน Sino = คืนหนี้ = บวก (หนี้ลด)
    if (partnerId === 'sino') {
        if (t.source === 'sino') return -t.qty;   // ยืมเพิ่ม → หนี้เพิ่ม (ลบ)
        if (t.dest === 'sino') return t.qty;       // ส่งคืน → หนี้ลด (บวก)
        return 0;
    }

    // 4. General Partner Logic (ทั้ง Provider และ Customer ใช้ sign เดียวกัน)
    //    ลบ = ยืมอยู่ (หนี้เพิ่ม), บวก = คืนแล้ว (หนี้ลด)
    const partner = EXTERNAL_PARTNERS.find(p => p.id === partnerId);
    if (!partner) return 0;

    if (partner.type === 'provider') {
        // Provider: รับจากเขา = ยืมเพิ่ม (ลบ), ส่งคืนเขา = หนี้ลด (บวก)
        if (t.source === partnerId) return -t.qty;
        if (t.dest === partnerId) return t.qty;
    } else {
        // Customer: ส่งให้เขา = เขายืมไป (ลบ), เขาคืนมา = หนี้ลด (บวก)
        if (t.dest === partnerId) return -t.qty;   // ส่งให้เขา → เขายืมไป → หนี้เพิ่ม (ลบ)
        if (t.source === partnerId) return t.qty;   // เขาคืนมา → หนี้ลด (บวก)
    }

    return 0;
};

/**
 * Total balance for a partner/pallet
 */
export const calculatePartnerBalance = (transactions: Transaction[], partnerId: string, palletId: PalletId): number => {
    return transactions.reduce((sum, t) => sum + getPartnerBalanceContribution(t, partnerId, palletId), 0);
};
