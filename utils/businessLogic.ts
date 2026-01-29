import { Transaction, PalletId, Partner } from '../types';
import { EXTERNAL_PARTNERS } from '../constants';

/**
 * Calculates the balance contribution of a transaction for a specific partner and pallet.
 * returns positive for "debt/possession increases" and negative for "decreases".
 */
export const getPartnerBalanceContribution = (t: Transaction, partnerId: string, palletId: PalletId): number => {
    if (t.palletId !== palletId || t.status !== 'COMPLETED') return 0;

    const isLoscamRed = partnerId === 'loscam_wangnoi' && palletId === 'loscam_red';
    const isSino = partnerId === 'sino' && palletId === 'loscam_red'; // Sino specifically borrow logic for red pallets

    // 1. Initial/Adjust Logic (Global for all partners to prevent conflicts)
    if (t.type === 'ADJUST' || t.isInitial) {
        if (t.dest === partnerId) return t.qty; // Adjustment increasing balance
        if (t.source === partnerId) return -t.qty; // Adjustment decreasing balance
        return 0;
    }

    // 2. Special Case: Loscam Red (Debt from Wangnoi vs Neo Corp)
    if (isLoscamRed) {
        if (t.source === 'neo_corp') return t.qty;
        if (t.dest === 'loscam_wangnoi') return -t.qty;
        return 0;
    }

    // 3. Special Case: Sino Red (They lend to us)
    if (isSino) {
        if (t.source === 'sino') return t.qty;
        if (t.dest === 'sino') return -t.qty;
        return 0;
    }

    // 4. General Partner Logic (Movements only now)
    const partner = EXTERNAL_PARTNERS.find(p => p.id === partnerId);
    if (!partner) return 0;

    if (partner.type === 'provider') {
        // Providers (We borrow from them): Positive = We receive more (Debt UP)
        if (t.source === partnerId) return t.qty; // Received from them
        if (t.dest === partnerId) return -t.qty; // Returned to them
    } else {
        // Customers (They borrow from us): Positive = They receive more (Debt UP)
        if (t.dest === partnerId) return t.qty; // Sent to them
        if (t.source === partnerId) return -t.qty; // Received back from them
    }

    return 0;
};

/**
 * Total balance for a partner/pallet
 */
export const calculatePartnerBalance = (transactions: Transaction[], partnerId: string, palletId: PalletId): number => {
    return transactions.reduce((sum, t) => sum + getPartnerBalanceContribution(t, partnerId, palletId), 0);
};
