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

    // 1. Special Case: Loscam Red
    // User says: Borrowed from Neo Corp, Returned to Loscam Wangnoi. Owed = (Neo - Wangnoi)
    if (isLoscamRed) {
        // Regular flow
        if (t.source === 'neo_corp') return t.qty;
        if (t.dest === 'loscam_wangnoi') return -t.qty;

        // Manual Adjustments to Loscam account
        if (t.type === 'ADJUST') {
            if (t.dest === 'loscam_wangnoi') return t.qty; // Adjusting debt UP (using dest=wangnoi for consistency with other partners)
            if (t.source === 'loscam_wangnoi') return -t.qty;
        }
        return 0;
    }

    // 2. Special Case: Sino Red (They lend to us)
    if (isSino) {
        if (t.source === 'sino') return t.qty;
        if (t.dest === 'sino') return -t.qty;

        if (t.type === 'ADJUST') {
            if (t.dest === 'sino') return t.qty;
            if (t.source === 'sino') return -t.qty;
        }
        return 0;
    }

    // 3. General Partner Logic
    const partner = EXTERNAL_PARTNERS.find(p => p.id === partnerId);
    if (!partner) return 0;

    if (partner.type === 'provider') {
        // Providers (We borrow from them): Positive = We receive more
        if (t.source === partnerId) return t.qty;
        if (t.dest === partnerId) return -t.qty;

        // Adjustments: UP means we add to our liability
        if (t.type === 'ADJUST') {
            if (t.dest === partnerId) return t.qty;
            if (t.source === partnerId) return -t.qty;
        }
    } else {
        // Customers (They borrow from us): Positive = They receive more
        if (t.dest === partnerId) return t.qty;
        if (t.source === partnerId) return -t.qty;

        // Adjustments: UP means they owe us more
        if (t.type === 'ADJUST') {
            if (t.dest === partnerId) return t.qty;
            if (t.source === partnerId) return -t.qty;
        }
    }

    return 0;
};

/**
 * Total balance for a partner/pallet
 */
export const calculatePartnerBalance = (transactions: Transaction[], partnerId: string, palletId: PalletId): number => {
    return transactions.reduce((sum, t) => sum + getPartnerBalanceContribution(t, partnerId, palletId), 0);
};
