import { Transaction, PalletId, Partner } from '../types';
import { EXTERNAL_PARTNERS } from '../constants';

/**
 * Calculates the balance contribution of a transaction for a specific partner and pallet.
 * 
 * Sign Convention:
 *   Provider (เรายืมจากเขา): ค่าลบ = เรายืมอยู่ (เป็นหนี้), ส่งคืน = บวก (หนี้ลด)
 *   Customer (เขายืมจากเรา): ค่าบวก = เขายืมอยู่ (เขาเป็นหนี้เรา), รับคืน = ลบ (หนี้ลด)
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

    // 4. General Partner Logic
    const partner = EXTERNAL_PARTNERS.find(p => p.id === partnerId);
    if (!partner) return 0;

    if (partner.type === 'provider') {
        // Provider (เรายืมจากเขา): ลบ = ยืมเพิ่ม, บวก = คืนหนี้
        if (t.source === partnerId) return -t.qty; // ยืมเพิ่ม → หนี้เพิ่ม (ลบ)
        if (t.dest === partnerId) return t.qty;    // ส่งคืน → หนี้ลด (บวก)
    } else {
        // Customer (เขายืมจากเรา): บวก = เขายืมเพิ่ม, ลบ = เขาคืน
        if (t.dest === partnerId) return t.qty;    // ส่งให้เขา → เขาเป็นหนี้เพิ่ม (บวก)
        if (t.source === partnerId) return -t.qty; // เขาคืน → หนี้ลด (ลบ)
    }

    return 0;
};

/**
 * Total balance for a partner/pallet
 */
export const calculatePartnerBalance = (transactions: Transaction[], partnerId: string, palletId: PalletId): number => {
    return transactions.reduce((sum, t) => sum + getPartnerBalanceContribution(t, partnerId, palletId), 0);
};
