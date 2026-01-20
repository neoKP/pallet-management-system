import { Transaction, Stock, BranchId, PalletId } from '../types';
import { EXTERNAL_PARTNERS } from '../constants';

export interface KPIMetrics {
    totalTransactions: number;
    totalPalletsInStock: number;
    totalPalletsInTransit: number; // NEW: Pending/In-Transit pallets
    totalMovements: number;
    utilizationRate: number;
    maintenanceRate: number;
    totalScrapped: number;
    trend: 'up' | 'down' | 'stable';
    trendPercentage: number;
}

export interface ChartDataPoint {
    name: string;
    value: number;
    color?: string;
    percentage?: number;
}

export interface TimeSeriesData {
    date: string;
    in: number;
    out: number;
    maintenance: number;
    scrapped: number;
    total: number;
}

export interface LoscamRentalData {
    date: string;
    quantity: number;
    cost: number;
}

export interface BranchPerformance {
    branchId: BranchId;
    branchName: string;
    totalStock: number;
    inTransactions: number;
    outTransactions: number;
    utilizationRate: number;
    color: string;
    percentage?: number; // Added
}

export interface PalletTypeAnalysis {
    palletId: PalletId;
    palletName: string;
    totalStock: number;
    inCount: number;
    outCount: number;
    maintenanceCount: number;
    turnoverRate: number;
    color: string;
    percentage?: number; // Added
}

export interface ScrappedAnalysis {
    palletId: PalletId;
    palletName: string;
    scrappedQty: number;
    color: string;
    percentage: number;
}

// NEW: Premium Analytics Interfaces
export interface HeatmapData {
    date: Date;
    value: number;
}

export interface WaterfallDataPoint {
    label: string;
    value: number;
    isTotal?: boolean;
}

export interface SparklineData {
    date: string;
    value: number;
}

export interface PartnerBalanceData {
    date: string;
    receive: number;    // รับ
    dispatch: number;   // จ่าย
    cancelled: number;  // ยกเลิก
    borrow: number;     // ยืม
    return: number;     // คืน
    balance: number;    // ยอดสะสม (ยืม-คืน)
}

/**
 * Calculate KPI Metrics
 */
export const calculateKPIs = (
    transactions: Transaction[],
    stock: Stock,
    startDate: Date,
    endDate: Date
): KPIMetrics => {
    const filteredTransactions = filterTransactionsByDate(transactions, startDate, endDate);

    // Valid branch IDs (excluding external partners)
    const validBranchIds: BranchId[] = ['hub_nw', 'kpp', 'plk', 'cm', 'ekp', 'ms', 'maintenance_stock'];

    // Total Pallets in Stock (only from actual branches)
    const totalPalletsInStock = validBranchIds.reduce((sum, branchId) => {
        const branchStock = stock[branchId];
        if (branchStock) {
            return sum + Object.values(branchStock).reduce((branchSum, qty) => branchSum + qty, 0);
        }
        return sum;
    }, 0);

    // Total Pallets In-Transit (PENDING transactions to valid branches)
    const totalPalletsInTransit = transactions
        .filter(t => t.status === 'PENDING' && validBranchIds.includes(t.dest as BranchId))
        .reduce((sum, t) => sum + t.qty, 0);

    // Total Movements
    const totalMovements = filteredTransactions.reduce((sum, t) => sum + t.qty, 0);

    // Maintenance Rate
    const maintenanceTransactions = filteredTransactions.filter(t => t.type === 'MAINTENANCE');
    const maintenanceRate = filteredTransactions.length > 0
        ? (maintenanceTransactions.length / filteredTransactions.length) * 100
        : 0;

    // Utilization Rate (simplified: movements vs stock)
    const utilizationRate = totalPalletsInStock > 0
        ? Math.min((totalMovements / totalPalletsInStock) * 100, 100)
        : 0;

    // Calculate trend (compare with previous period)
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStart = new Date(startDate.getTime() - periodLength);
    const previousTransactions = filterTransactionsByDate(transactions, previousStart, startDate);

    const currentCount = filteredTransactions.length;
    const previousCount = previousTransactions.length;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercentage = 0;

    if (previousCount > 0) {
        trendPercentage = ((currentCount - previousCount) / previousCount) * 100;
        if (trendPercentage > 5) trend = 'up';
        else if (trendPercentage < -5) trend = 'down';
    }

    return {
        totalTransactions: filteredTransactions.length,
        totalPalletsInStock,
        totalPalletsInTransit,
        totalMovements,
        utilizationRate: Math.round(utilizationRate * 10) / 10,
        maintenanceRate: Math.round(maintenanceRate * 10) / 10,
        totalScrapped: filteredTransactions
            .filter(t => t.type === 'MAINTENANCE' && t.status === 'COMPLETED')
            .reduce((sum, t) => {
                const match = t.noteExtended?.match(/SCRAP:\s*(\d+)/);
                return sum + (match ? parseInt(match[1]) : 0);
            }, 0),
        trend,
        trendPercentage: Math.abs(Math.round(trendPercentage * 10) / 10),
    };
};

/**
 * Get Transaction Status Distribution
 */
export const getStatusDistribution = (
    transactions: Transaction[],
    startDate: Date,
    endDate: Date
): ChartDataPoint[] => {
    const filtered = filterTransactionsByDate(transactions, startDate, endDate);

    const statusCounts = filtered.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const colors = {
        COMPLETED: '#10b981',
        PENDING: '#f59e0b',
        CANCELLED: '#ef4444',
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
        name: status === 'COMPLETED' ? 'เสร็จสิ้น' : status === 'PENDING' ? 'รอดำเนินการ' : 'ยกเลิก',
        value: count,
        color: colors[status as keyof typeof colors] || '#6366f1',
        percentage: Math.round((count / filtered.length) * 100),
    }));
};

/**
 * Get Transaction Type Distribution
 */
export const getTypeDistribution = (
    transactions: Transaction[],
    startDate: Date,
    endDate: Date
): ChartDataPoint[] => {
    const filtered = filterTransactionsByDate(transactions, startDate, endDate);

    const typeCounts = filtered.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + t.qty;
        return acc;
    }, {} as Record<string, number>);

    const colors = {
        IN: '#3b82f6',
        OUT: '#f59e0b',
        MAINTENANCE: '#8b5cf6',
        ADJUST: '#06b6d4',
    };

    const labels = {
        IN: 'รับเข้า',
        OUT: 'จ่ายออก',
        MAINTENANCE: 'ซ่อมบำรุง',
        ADJUST: 'ปรับปรุง',
    };

    const total = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);

    return Object.entries(typeCounts).map(([type, count]) => ({
        name: labels[type as keyof typeof labels] || type,
        value: count,
        color: colors[type as keyof typeof colors] || '#6366f1',
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
};

/**
 * Get Time Series Data
 */
export const getTimeSeriesData = (
    transactions: Transaction[],
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day'
): TimeSeriesData[] => {
    const filtered = filterTransactionsByDate(transactions, startDate, endDate);

    const grouped = filtered.reduce((acc, t) => {
        const date = new Date(t.date);
        let key: string;

        if (groupBy === 'day') {
            key = date.toISOString().split('T')[0];
        } else if (groupBy === 'week') {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
        } else {
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        if (!acc[key]) {
            acc[key] = { date: key, in: 0, out: 0, maintenance: 0, scrapped: 0, total: 0 };
        }

        if (t.type === 'IN') acc[key].in += t.qty;
        else if (t.type === 'OUT') acc[key].out += t.qty;
        else if (t.type === 'MAINTENANCE') {
            acc[key].maintenance += t.qty;
            // Extract scrap if available
            const match = t.noteExtended?.match(/SCRAP:\s*(\d+)/);
            if (match) acc[key].scrapped += parseInt(match[1]);
        }

        acc[key].total += t.qty;

        return acc;
    }, {} as Record<string, TimeSeriesData>);

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Get Branch Performance
 */
export const getBranchPerformance = (
    transactions: Transaction[],
    stock: Stock,
    startDate: Date,
    endDate: Date,
    branchNames: Record<BranchId, string>
): BranchPerformance[] => {
    const filtered = filterTransactionsByDate(transactions, startDate, endDate);

    const branchColors = [
        '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444'
    ];

    // Get valid branch IDs from branchNames (excludes external partners)
    const validBranchIds = Object.keys(branchNames);
    const totalOverallStock = validBranchIds.reduce((sum, bid) => {
        const bStock = stock[bid as BranchId];
        return sum + (bStock ? Object.values(bStock).reduce((s, q) => s + q, 0) : 0);
    }, 0);

    return Object.entries(stock)
        .filter(([branchId]) => validBranchIds.includes(branchId)) // Only include actual branches
        .map(([branchId, branchStock], index) => {
            const totalStock = Object.values(branchStock).reduce((sum, qty) => sum + qty, 0);

            const branchTransactions = filtered.filter(
                t => t.source === branchId || t.dest === branchId
            );

            const inTransactions = branchTransactions.filter(t => t.dest === branchId && t.type === 'IN').length;
            const outTransactions = branchTransactions.filter(t => t.source === branchId && t.type === 'OUT').length;

            const utilizationRate = totalStock > 0
                ? Math.min(((inTransactions + outTransactions) / totalStock) * 100, 100)
                : 0;

            const percentage = totalOverallStock > 0 ? (totalStock / totalOverallStock) * 100 : 0;

            return {
                branchId: branchId as BranchId,
                branchName: branchNames[branchId as BranchId] || branchId,
                totalStock,
                inTransactions,
                outTransactions,
                utilizationRate: Math.round(utilizationRate * 10) / 10,
                color: branchColors[index % branchColors.length],
                percentage: Math.round(percentage * 10) / 10,
            };
        })
        .sort((a, b) => b.totalStock - a.totalStock);
};

/**
 * Get Pallet Type Analysis
 */
export const getPalletTypeAnalysis = (
    transactions: Transaction[],
    stock: Stock,
    startDate: Date,
    endDate: Date,
    palletNames: Record<PalletId, string>,
    palletColors: Record<PalletId, string>
): PalletTypeAnalysis[] => {
    const filtered = filterTransactionsByDate(transactions, startDate, endDate);

    // Calculate total stock per pallet type
    const palletStocks = Object.values(stock).reduce((acc, branchStock) => {
        Object.entries(branchStock).forEach(([palletId, qty]) => {
            acc[palletId as PalletId] = (acc[palletId as PalletId] || 0) + qty;
        });
        return acc;
    }, {} as Record<PalletId, number>);

    return Object.entries(palletStocks).map(([palletId, totalStock]) => {
        const palletTransactions = filtered.filter(t => t.palletId === palletId);

        const inCount = palletTransactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.qty, 0);
        const outCount = palletTransactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.qty, 0);
        const maintenanceCount = palletTransactions.filter(t => t.type === 'MAINTENANCE').reduce((sum, t) => sum + t.qty, 0);

        const turnoverRate = totalStock > 0 ? ((inCount + outCount) / totalStock) * 100 : 0;

        const totalAllStock = Object.values(palletStocks).reduce((sum, qty) => sum + qty, 0);

        return {
            palletId: palletId as PalletId,
            palletName: palletNames[palletId as PalletId] || palletId,
            totalStock,
            inCount,
            outCount,
            maintenanceCount,
            turnoverRate: Math.round(turnoverRate * 10) / 10,
            color: palletColors[palletId as PalletId] || '#6366f1',
            percentage: totalAllStock > 0 ? Math.round((totalStock / totalAllStock) * 100 * 10) / 10 : 0,
        };
    }).sort((a, b) => b.totalStock - a.totalStock);
};

/**
 * Get Scrapped Analysis
 */
export const getScrappedAnalysis = (
    transactions: Transaction[],
    startDate: Date,
    endDate: Date,
    palletNames: Record<PalletId, string>,
    palletColors: Record<PalletId, string>
): ScrappedAnalysis[] => {
    const filtered = filterTransactionsByDate(transactions, startDate, endDate);

    const getScrapQty = (noteExtended?: string) => {
        if (!noteExtended) return 0;
        const match = noteExtended.match(/SCRAP:\s*(\d+)/);
        return match ? parseInt(match[1]) : 0;
    };

    const scrapMap = filtered
        .filter(t => t.type === 'MAINTENANCE' && t.status === 'COMPLETED')
        .reduce((acc, t) => {
            const scrapQty = getScrapQty(t.noteExtended);
            if (scrapQty > 0) {
                const pid = t.originalPalletId || t.palletId;
                acc[pid] = (acc[pid] || 0) + scrapQty;
            }
            return acc;
        }, {} as Record<PalletId, number>);

    const totalScrapped = Object.values(scrapMap).reduce((sum, qty) => sum + qty, 0);

    return Object.entries(scrapMap).map(([pid, qty]) => ({
        palletId: pid as PalletId,
        palletName: palletNames[pid as PalletId] || pid,
        scrappedQty: qty,
        color: palletColors[pid as PalletId] || '#ef4444',
        percentage: totalScrapped > 0 ? Math.round((qty / totalScrapped) * 100) : 0
    })).sort((a, b) => b.scrappedQty - a.scrappedQty);
};

/**
 * Helper: Filter transactions by date range
 */
const filterTransactionsByDate = (
    transactions: Transaction[],
    startDate: Date,
    endDate: Date
): Transaction[] => {
    return transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
    });
};

/**
 * Apply conditional formatting color
 */
export const getConditionalColor = (value: number, thresholds: { low: number; high: number }): string => {
    if (value < thresholds.low) return '#ef4444'; // Red
    if (value > thresholds.high) return '#10b981'; // Green
    return '#f59e0b'; // Yellow
};

/**
 * Get Partner Balance Analysis (Borrow-Return)
 */
export const getPartnerBalanceAnalysis = (
    transactions: Transaction[],
    partnerId: string | 'all',
    startDate: Date,
    endDate: Date
): PartnerBalanceData[] => {
    // Filter relevant transactions (all time is needed for correct running balance)
    const isAll = partnerId === 'all';

    // Get all valid partner IDs if 'all'
    const partnerIds = isAll ? EXTERNAL_PARTNERS.map(p => p.id) : [partnerId];

    const grouped: Record<string, { receive: number, dispatch: number, cancelled: number, borrow: number, return: number }> = {};

    // Get all transactions involving these partners for flow analysis
    const allRelevantTx = transactions
        .filter(t => (partnerIds.includes(t.source) || partnerIds.includes(t.dest)))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    allRelevantTx.forEach(t => {
        // Use a Date object to ensure we get the local date parts consistently
        const d = new Date(t.date);
        const dateKey = formatDate(d);
        if (!grouped[dateKey]) grouped[dateKey] = { receive: 0, dispatch: 0, cancelled: 0, borrow: 0, return: 0 };

        if (t.status === 'CANCELLED') {
            grouped[dateKey].cancelled += t.qty;
            return;
        }

        // Standard flow
        if (partnerIds.includes(t.dest)) grouped[dateKey].dispatch += t.qty;
        if (partnerIds.includes(t.source)) grouped[dateKey].receive += t.qty;

        // Balance-affecting flow
        if (t.status === 'COMPLETED') {
            if (partnerIds.includes(t.dest)) grouped[dateKey].borrow += t.qty;
            if (partnerIds.includes(t.source)) grouped[dateKey].return += t.qty;
        }
    });

    // Generate daily time series for the range
    const result: PartnerBalanceData[] = [];
    let runningBalance = 0;

    // To get the starting balance before the startDate, we need to sum previous COMPLETED tx
    const preBalanceTx = allRelevantTx.filter(t => t.status === 'COMPLETED' && new Date(t.date) < startDate);
    runningBalance = preBalanceTx.reduce((acc, t) => {
        if (partnerIds.includes(t.dest)) return acc + t.qty;
        if (partnerIds.includes(t.source)) return acc - t.qty;
        return acc;
    }, 0);

    const curr = new Date(startDate);
    while (curr <= endDate) {
        const dateKey = formatDate(curr);
        const dayData = grouped[dateKey] || { receive: 0, dispatch: 0, cancelled: 0, borrow: 0, return: 0 };

        runningBalance += (dayData.borrow - dayData.return);

        result.push({
            date: dateKey,
            receive: dayData.receive,
            dispatch: dayData.dispatch,
            cancelled: dayData.cancelled,
            borrow: dayData.borrow,
            return: dayData.return,
            balance: runningBalance
        });

        curr.setDate(curr.getDate() + 1);
    }

    return result;
};

/**
 * Get Scrapped by Branch Summary
 */
export const getScrappedByBranch = (
    transactions: Transaction[],
    startDate: Date,
    endDate: Date,
    branchNames: Record<BranchId, string>
): ChartDataPoint[] => {
    const filtered = transactions.filter(t => {
        const d = new Date(t.date);
        return d >= startDate && d <= endDate && t.type === 'MAINTENANCE' && t.status === 'COMPLETED';
    });

    const branchScrap: Record<string, number> = {};
    filtered.forEach(t => {
        const match = t.noteExtended?.match(/SCRAP:\s*(\d+)/);
        if (match) {
            const qty = parseInt(match[1]);
            const bid = t.source || 'hub_nw'; // Maintenance happens at a branch
            branchScrap[bid] = (branchScrap[bid] || 0) + qty;
        }
    });

    const colors = ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'];

    return Object.entries(branchScrap).map(([bid, qty], i) => ({
        name: branchNames[bid as BranchId] || bid,
        value: qty,
        color: colors[i % colors.length]
    })).sort((a, b) => b.value - a.value);
};

/**
 * Get Net Balance Summary for all External Partners
 */
export const getPartnerSummary = (
    transactions: Transaction[],
    partnerList: { id: string, name: string }[]
): ChartDataPoint[] => {
    const partnerMap: Record<string, number> = {};

    transactions.filter(t => t.status === 'COMPLETED').forEach(t => {
        partnerList.forEach(p => {
            if (t.dest === p.id) partnerMap[p.id] = (partnerMap[p.id] || 0) + t.qty;
            if (t.source === p.id) partnerMap[p.id] = (partnerMap[p.id] || 0) - t.qty;
        });
    });

    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'];

    return partnerList.map((p, i) => ({
        name: p.name,
        value: partnerMap[p.id] || 0,
        color: colors[i % colors.length]
    })).sort((a, b) => b.value - a.value);
};

/**
 * Get Net Balance breakdown by Pallet Type for specific partner(s)
 */
export const getPartnerPalletTypeSummary = (
    transactions: Transaction[],
    partnerId: string | 'all',
    palletTypes: Record<string, { name: string, color: string }>
): ChartDataPoint[] => {
    const isAll = partnerId === 'all';
    const partnerIds = isAll ? ['sino', 'neo', 'ls', 'pakk_sai3'] : [partnerId];

    const balanceMap: Record<string, number> = {};

    transactions.filter(t => t.status === 'COMPLETED').forEach(t => {
        if (partnerIds.includes(t.dest)) {
            balanceMap[t.palletId] = (balanceMap[t.palletId] || 0) + t.qty;
        }
        if (partnerIds.includes(t.source)) {
            balanceMap[t.palletId] = (balanceMap[t.palletId] || 0) - t.qty;
        }
    });

    return Object.entries(palletTypes).map(([pid, pinfo]) => ({
        name: pinfo.name,
        value: balanceMap[pid] || 0,
        color: pinfo.color
    })).filter(item => item.value !== 0).sort((a, b) => b.value - a.value);
};

/**
 * Get Loscam Red Rental Analysis for the last 7 days
 */
export const getLoscamRentalAnalysis = (
    transactions: Transaction[],
    stock: Stock,
): LoscamRentalData[] => {
    // 1. Identify valid internal branches vs partners
    const validBranchIds: BranchId[] = ['hub_nw', 'kpp', 'plk', 'cm', 'ekp', 'ms', 'maintenance_stock'];
    const partnerIds = EXTERNAL_PARTNERS.map(p => p.id);
    const palletId: PalletId = 'loscam_red';

    // 2. Calculate CURRENT total in system (Possession)
    // Possession = Total in all internal branches + Total with all partners
    const currentInternalStock = validBranchIds.reduce((sum, bid) => {
        return sum + (stock[bid]?.[palletId] || 0);
    }, 0);

    const currentPartnerBalances = partnerIds.reduce((sum, pid) => {
        // Calculate current net balance for this partner
        const balance = transactions
            .filter(t => t.status === 'COMPLETED' && t.palletId === palletId)
            .reduce((acc, t) => {
                if (t.dest === pid) return acc + t.qty;
                if (t.source === pid) return acc - t.qty;
                return acc;
            }, 0);
        return sum + balance;
    }, 0);

    let runningPossession = currentInternalStock + currentPartnerBalances;

    // 3. Walk backwards for 7 days
    const result: LoscamRentalData[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Group relevant transactions by date (only those that change system-wide possession)
    // Possession changes only when it comes from OUTSIDE (provider) or goes to OUTSIDE.
    // However, the rule here is simpler: POSSESSION = Stock + Partner Balances.
    // Any transaction where source is NOT in (branches + partners) AND dest is in (branches + partners) increases possession.
    // Any transaction where source is in (branches + partners) AND dest is NOT in (branches + partners) decreases possession.

    // Actually, in this system, everything is either a branch or a partner. 
    // The "Provider" (loscam_wangnoi) is also in EXTERNAL_PARTNERS.
    // So "System" = [Internal Branches] + [Non-Provider Partners].
    // Possession = (Received from Provider) - (Returned to Provider).
    const providerId = 'loscam_wangnoi';

    // Sort transactions by date descending
    const sortedTx = [...transactions]
        .filter(t => t.status === 'COMPLETED' && t.palletId === palletId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    for (let i = 0; i < 7; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - i);
        const dateKey = formatDate(targetDate);

        // Calculate cost based on rule:
        // <= 2000 units: 1.40 THB/unit
        // > 2000 units: 1.10 THB/unit for all
        const cost = runningPossession > 2000
            ? runningPossession * 1.10
            : runningPossession * 1.40;

        result.push({
            date: dateKey,
            quantity: runningPossession,
            cost: Math.round(cost * 100) / 100
        });

        // Prepare runningPossession for previous day (subtract today's changes)
        // Possession increased today if: source was provider AND dest was internal/customer
        // Possession decreased today if: source was internal/customer AND dest was provider
        const dayStart = new Date(targetDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23, 59, 59, 999);

        const dayChanges = sortedTx.filter(t => {
            const d = new Date(t.date);
            return d >= dayStart && d <= dayEnd;
        });

        dayChanges.forEach(t => {
            // If it came from provider today, it was added to system. To go back, subtract it.
            if (t.source === providerId) runningPossession -= t.qty;
            // If it went to provider today, it left the system. To go back, add it.
            if (t.dest === providerId) runningPossession += t.qty;
        });
    }

    return result.reverse();
};
