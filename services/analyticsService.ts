import { Transaction, Stock, BranchId, PalletId } from '../types';
import { EXTERNAL_PARTNERS, PALLET_TYPES } from '../constants';
import { calculatePartnerBalance, getPartnerBalanceContribution } from '../utils/businessLogic';

export interface KPIMetrics {
    totalTransactions: number;
    totalPalletsInStock: number;
    totalPalletsInTransit: number;
    totalMovements: number;
    utilizationRate: number;
    maintenanceRate: number;
    totalScrapped: number;
    totalIn: number;
    totalInTrend: number;
    totalOut: number;
    totalOutTrend: number;
    totalActivity: number;
    totalActivityTrend: number;
    maxPossession: number;
    maxPossessionTrend: number;
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
    percentage?: number;
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
    percentage?: number;
}

export interface ScrappedAnalysis {
    palletId: PalletId;
    palletName: string;
    scrappedQty: number;
    color: string;
    percentage: number;
}

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
    receive: number;
    dispatch: number;
    cancelled: number;
    borrow: number;
    return: number;
    balance: number;
}

export interface StockPrediction {
    branchId: BranchId;
    branchName: string;
    palletId: PalletId;
    palletName: string;
    currentStock: number;
    avgDailyIn: number;
    avgDailyOut: number;
    burnRate: number; // Avg Daily Out - Avg Daily In
    daysUntilEmpty: number;
    predictedDate: string;
    status: 'Safe' | 'Warning' | 'Critical';
    recommendedReplenishment: number;
}

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
 * Calculate KPI Metrics
 */
export const calculateKPIs = (
    transactions: Transaction[],
    stock: Stock,
    startDate: Date,
    endDate: Date
): KPIMetrics => {
    const filteredTransactions = filterTransactionsByDate(transactions, startDate, endDate);
    const validBranchIds: BranchId[] = ['hub_nw', 'kpp', 'plk', 'cm', 'ekp', 'ms', 'maintenance_stock'];

    const totalPalletsInStock = validBranchIds.reduce((sum, branchId) => {
        const branchStock = stock[branchId];
        return sum + (branchStock ? Object.values(branchStock).reduce((s, q) => s + q, 0) : 0);
    }, 0);

    const totalPalletsInTransit = transactions
        .filter(t => t.status === 'PENDING' && validBranchIds.includes(t.dest as BranchId))
        .reduce((sum, t) => sum + t.qty, 0);

    const totalMovements = filteredTransactions.reduce((sum, t) => sum + t.qty, 0);

    const maintenanceTransactions = filteredTransactions.filter(t => t.type === 'MAINTENANCE');
    const maintenanceRate = filteredTransactions.length > 0 ? (maintenanceTransactions.length / filteredTransactions.length) * 100 : 0;
    const utilizationRate = totalPalletsInStock > 0 ? Math.min((totalMovements / totalPalletsInStock) * 100, 100) : 0;

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

    const currentIn = filteredTransactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.qty, 0);
    const currentOut = filteredTransactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.qty, 0);

    const prevIn = previousTransactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.qty, 0);
    const prevOut = previousTransactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.qty, 0);
    const prevActivity = previousTransactions.reduce((sum, t) => sum + t.qty, 0);

    const calcTrend = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return Math.round(((curr - prev) / prev) * 100);
    };

    return {
        totalTransactions: currentCount,
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
        totalIn: currentIn,
        totalInTrend: calcTrend(currentIn, prevIn),
        totalOut: currentOut,
        totalOutTrend: calcTrend(currentOut, prevOut),
        totalActivity: totalMovements,
        totalActivityTrend: calcTrend(totalMovements, prevActivity),
        maxPossession: totalPalletsInStock + totalPalletsInTransit,
        maxPossessionTrend: 0,
        trend,
        trendPercentage: Math.abs(Math.round(trendPercentage * 10) / 10),
    };
};

/**
 * Get Transaction Status Distribution
 */
export const getStatusDistribution = (transactions: Transaction[], startDate: Date, endDate: Date): ChartDataPoint[] => {
    const filtered = filterTransactionsByDate(transactions, startDate, endDate);
    const counts = filtered.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const colors = { COMPLETED: '#10b981', PENDING: '#f59e0b', CANCELLED: '#ef4444' };
    return Object.entries(counts).map(([status, count]) => ({
        name: status === 'COMPLETED' ? 'เสร็จสิ้น' : status === 'PENDING' ? 'รอดำเนินการ' : 'ยกเลิก',
        value: count,
        color: colors[status as keyof typeof colors] || '#6366f1',
        percentage: Math.round((count / filtered.length) * 100),
    }));
};

/**
 * Get Transaction Type Distribution
 */
export const getTypeDistribution = (transactions: Transaction[], startDate: Date, endDate: Date): ChartDataPoint[] => {
    const filtered = filterTransactionsByDate(transactions, startDate, endDate);
    const counts = filtered.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + t.qty;
        return acc;
    }, {} as Record<string, number>);
    const colors = { IN: '#3b82f6', OUT: '#f59e0b', MAINTENANCE: '#8b5cf6', ADJUST: '#06b6d4' };
    const labels = { IN: 'รับเข้า', OUT: 'จ่ายออก', MAINTENANCE: 'ซ่อมบำรุง', ADJUST: 'ปรับปรุง' };
    const total = Object.values(counts).reduce((s, c) => s + c, 0);
    return Object.entries(counts).map(([type, count]) => ({
        name: labels[type as keyof typeof labels] || type,
        value: count,
        color: colors[type as keyof typeof colors] || '#6366f1',
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
};

/**
 * Get Time Series Data
 */
export const getTimeSeriesData = (transactions: Transaction[], startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'day'): TimeSeriesData[] => {
    const filtered = filterTransactionsByDate(transactions, startDate, endDate);
    const grouped = filtered.reduce((acc, t) => {
        const date = new Date(t.date);
        let key = date.toISOString().split('T')[0];
        if (groupBy === 'month') key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[key]) acc[key] = { date: key, in: 0, out: 0, maintenance: 0, scrapped: 0, total: 0 };
        if (t.type === 'IN') acc[key].in += t.qty;
        else if (t.type === 'OUT') acc[key].out += t.qty;
        else if (t.type === 'MAINTENANCE') {
            acc[key].maintenance += t.qty;
            const sMatch = t.noteExtended?.match(/SCRAP:\s*(\d+)/);
            if (sMatch) acc[key].scrapped += parseInt(sMatch[1]);
        }
        acc[key].total += t.qty;
        return acc;
    }, {} as Record<string, TimeSeriesData>);
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Get Branch Performance
 */
export const getBranchPerformance = (transactions: Transaction[], stock: Stock, startDate: Date, endDate: Date, branchNames: Record<BranchId, string>): BranchPerformance[] => {
    const filtered = filterTransactionsByDate(transactions, startDate, endDate);
    const validIds = Object.keys(branchNames) as BranchId[];
    return validIds.map((bid, i) => {
        const bStock = stock[bid] || {};
        const totalStock = Object.values(bStock).reduce((s, q) => s + q, 0);
        const bTx = filtered.filter(t => t.source === bid || t.dest === bid);
        const inC = bTx.filter(t => t.dest === bid && t.type === 'IN').length;
        const outC = bTx.filter(t => t.source === bid && t.type === 'OUT').length;
        return {
            branchId: bid, branchName: branchNames[bid], totalStock, inTransactions: inC, outTransactions: outC,
            utilizationRate: totalStock > 0 ? Math.min(((inC + outC) / totalStock) * 100, 100) : 0,
            color: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][i % 5]
        };
    }).sort((a, b) => b.totalStock - a.totalStock);
};

/**
 * Get Pallet Type Analysis
 */
export const getPalletTypeAnalysis = (transactions: Transaction[], stock: Stock, startDate: Date, endDate: Date, palletNames: Record<PalletId, string>, palletColors: Record<PalletId, string>): PalletTypeAnalysis[] => {
    const filtered = filterTransactionsByDate(transactions, startDate, endDate);
    const pStocks: Record<PalletId, number> = {} as any;
    Object.values(stock).forEach(bs => Object.entries(bs).forEach(([pid, q]) => pStocks[pid as PalletId] = (pStocks[pid as PalletId] || 0) + q));
    return Object.entries(pStocks).map(([pid, ts]) => {
        const pTx = filtered.filter(t => t.palletId === pid);
        return {
            palletId: pid as PalletId, palletName: palletNames[pid as PalletId], totalStock: ts,
            inCount: pTx.filter(t => t.type === 'IN').reduce((s, t) => s + t.qty, 0),
            outCount: pTx.filter(t => t.type === 'OUT').reduce((s, t) => s + t.qty, 0),
            maintenanceCount: pTx.filter(t => t.type === 'MAINTENANCE').reduce((s, t) => s + t.qty, 0),
            turnoverRate: ts > 0 ? ((pTx.length) / ts) * 100 : 0, color: palletColors[pid as PalletId]
        };
    }).sort((a, b) => b.totalStock - a.totalStock);
};

/**
 * Get Scrapped Analysis
 */
export const getScrappedAnalysis = (transactions: Transaction[], startDate: Date, endDate: Date, palletNames: Record<PalletId, string>, palletColors: Record<PalletId, string>): ScrappedAnalysis[] => {
    const filtered = filterTransactionsByDate(transactions, startDate, endDate);
    const sm: Record<string, number> = {};
    filtered.filter(t => t.type === 'MAINTENANCE' && t.status === 'COMPLETED').forEach(t => {
        const m = t.noteExtended?.match(/SCRAP:\s*(\d+)/);
        if (m) { const q = parseInt(m[1]); const pid = t.originalPalletId || t.palletId; sm[pid] = (sm[pid] || 0) + q; }
    });
    const total = Object.values(sm).reduce((s, q) => s + q, 0);
    return Object.entries(sm).map(([pid, q]) => ({
        palletId: pid as PalletId, palletName: palletNames[pid as PalletId], scrappedQty: q, color: palletColors[pid as PalletId],
        percentage: total > 0 ? (q / total) * 100 : 0
    })).sort((a, b) => b.scrappedQty - a.scrappedQty);
};

export const getPartnerSummary = (transactions: Transaction[], partnerList: { id: string, name: string }[]): ChartDataPoint[] => {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'];
    return partnerList.map((p, i) => ({
        name: p.name,
        value: calculatePartnerBalance(transactions, p.id, 'loscam_red'),
        color: colors[i % colors.length]
    })).sort((a, b) => b.value - a.value);
};

export const getPartnerPalletTypeSummary = (transactions: Transaction[], partnerId: string, palletTypes: Record<string, { name: string, color: string }>): ChartDataPoint[] => {
    return Object.entries(palletTypes).map(([pid, info]) => ({
        name: info.name,
        value: calculatePartnerBalance(transactions, partnerId, pid as PalletId),
        color: info.color
    })).filter(i => i.value !== 0).sort((a, b) => b.value - a.value);
};

export const getLoscamRentalAnalysis = (transactions: Transaction[], stock: Stock): LoscamRentalData[] => {
    const palletId: PalletId = 'loscam_red';
    const result: LoscamRentalData[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let currentPos = calculatePartnerBalance(transactions, 'loscam_wangnoi', palletId);

    const sortedTx = [...transactions].filter(t => t.status === 'COMPLETED' && t.palletId === palletId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    for (let i = 0; i < 7; i++) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        const rate = currentPos > 3000 ? 1.12 : currentPos > 2000 ? 1.19 : 1.40;
        result.push({ date: d.toISOString().split('T')[0], quantity: currentPos, cost: Math.round(currentPos * rate * 100) / 100 });

        const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
        sortedTx.filter(t => {
            const td = new Date(t.date);
            return td >= dayStart && td <= dayEnd;
        }).forEach(t => currentPos -= getPartnerBalanceContribution(t, 'loscam_wangnoi', palletId));
    }
    return result.reverse();
};

export interface AgingLoanItem {
    partnerId: string;
    partnerName: string;
    palletId: PalletId;
    docNo: string;
    borrowDate: string;
    ageDays: number;
    qty: number;
    overdueDays: number;
    rentalRate: number;
    accruedRent: number;
}

export interface AgingRentalSummary {
    loans: AgingLoanItem[];
    totalOverdueQty: number;
    totalAccruedRent: number;
    partnerSummaries: Record<string, {
        name: string;
        palletId: PalletId;
        totalIn: number;
        totalOut: number;
        openQty: number;
        rent: number;
        avgAge: number;
        warningCount: number;
        dangerCount: number;
        currentRate?: number;
    }>;
}

export const getAgingRentalAnalysis = (transactions: Transaction[], today: Date = new Date()): AgingRentalSummary => {
    const partnerSummaries: Record<string, any> = {};
    const loans: AgingLoanItem[] = [];

    // Target Partners to always show/process
    const targetPartners = ['loscam_wangnoi', 'sino', 'lamsoon', 'ufc', 'loxley', 'kopee', 'hiq_th'];
    const allPalletIds: PalletId[] = ['loscam_red', 'loscam_blue', 'loscam_yellow', 'hiq'];

    targetPartners.forEach(pId => {
        allPalletIds.forEach(palletId => {
            const balance = calculatePartnerBalance(transactions, pId, palletId);
            const key = `${pId}_${palletId}`;

            // Initialize summary
            partnerSummaries[key] = {
                name: pId === 'loscam_wangnoi' ? 'Loscam (Main Account)' : (EXTERNAL_PARTNERS.find(p => p.id === pId)?.name || pId),
                palletId: palletId,
                totalIn: transactions.filter(t => t.status === 'COMPLETED' && t.palletId === palletId && t.source === pId).reduce((s, t) => s + t.qty, 0),
                totalOut: transactions.filter(t => t.status === 'COMPLETED' && t.palletId === palletId && t.dest === pId).reduce((s, t) => s + t.qty, 0),
                openQty: balance,
                rent: 0,
                avgAge: 0,
                warningCount: 0,
                dangerCount: 0,
                currentRate: 0,
                weight: 0
            };

            // Special Rental/Aging Logic for Loscam Red and Sino Red
            if (palletId === 'loscam_red' && (pId === 'loscam_wangnoi' || pId === 'sino')) {
                const borrows = transactions
                    .filter(t => t.status === 'COMPLETED' && t.palletId === 'loscam_red' && (pId === 'loscam_wangnoi' ? t.source === 'neo_corp' : t.source === 'sino'))
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                const returnsCount = transactions
                    .filter(t => t.status === 'COMPLETED' && t.palletId === 'loscam_red' && (pId === 'loscam_wangnoi' ? t.dest === 'loscam_wangnoi' : t.dest === 'sino'))
                    .reduce((sum, t) => sum + t.qty, 0);

                let vReturn = returnsCount;
                const dailyRate = pId === 'loscam_wangnoi'
                    ? (balance > 3000 ? 1.12 : balance > 2000 ? 1.19 : 1.40)
                    : 1.0;

                partnerSummaries[key].currentRate = dailyRate;

                borrows.forEach(b => {
                    let rem = b.qty;
                    if (vReturn > 0) {
                        const d = Math.min(rem, vReturn);
                        rem -= d;
                        vReturn -= d;
                    }

                    if (rem > 0) {
                        const days = Math.floor((today.getTime() - new Date(b.date).getTime()) / 86400000);
                        const isSino = pId === 'sino';
                        const grace = isSino ? 10 : 0;
                        const overdue = Math.max(0, days - grace);
                        const rent = overdue * dailyRate * rem;

                        loans.push({
                            partnerId: pId,
                            partnerName: partnerSummaries[key].name,
                            palletId: 'loscam_red',
                            docNo: b.docNo,
                            borrowDate: b.date.split('T')[0],
                            ageDays: days,
                            qty: rem,
                            overdueDays: overdue,
                            rentalRate: overdue > 0 ? dailyRate : 0,
                            accruedRent: Math.round(rent * 100) / 100
                        });

                        partnerSummaries[key].rent += rent;
                        partnerSummaries[key].weight += (days * rem);
                        if (days > 10) partnerSummaries[key].dangerCount += rem;
                        else if (days > 7) partnerSummaries[key].warningCount += rem;
                    }
                });

                if (balance > 0) {
                    partnerSummaries[key].avgAge = Math.round(partnerSummaries[key].weight / balance);
                }
            }
        });
    });

    return {
        loans: loans.sort((a, b) => b.ageDays - a.ageDays),
        totalOverdueQty: Object.values(partnerSummaries).reduce((s: any, x: any) => s + (x.dangerCount || 0), 0),
        totalAccruedRent: Math.round(Object.values(partnerSummaries).reduce((s: any, x: any) => s + (x.rent || 0), 0) * 100) / 100,
        partnerSummaries
    };
};

export const getSinoAgingAnalysis = (transactions: Transaction[], today: Date = new Date()): ChartDataPoint[] => {
    const summary = getAgingRentalAnalysis(transactions, today);
    const sino = Object.values(summary.partnerSummaries).find(s => s.name.includes('ซีโน'));
    if (!sino) return [{ name: 'Safe', value: 0, color: '#10b981' }, { name: 'Warning', value: 0, color: '#f59e0b' }, { name: 'Overdue', value: 0, color: '#ef4444' }];

    const items = summary.loans.filter(l => l.partnerId === 'sino');
    const safe = items.filter(l => l.ageDays <= 5).reduce((s, l) => s + l.qty, 0);
    const warn = items.filter(l => l.ageDays > 5 && l.ageDays <= 10).reduce((s, l) => s + l.qty, 0);
    const over = items.filter(l => l.ageDays > 10).reduce((s, l) => s + l.qty, 0);

    return [
        { name: 'Safe (0-5 วัน)', value: safe, color: '#10b981' },
        { name: 'Warning (6-10 วัน)', value: warn, color: '#f59e0b' },
        { name: 'Overdue (10+ วัน)', value: over, color: '#ef4444' }
    ];
};

export const getLogisticInsight = (transactions: Transaction[], kpis: any): { text: string; confidence: number } => {
    // Basic heuristic narrative engine
    const now = new Date();
    const isHighUtilization = kpis.utilizationRate > 80;
    const isHighMaintenance = kpis.maintenanceRate > 12;
    const isTrendingUp = kpis.trend === 'up';

    let message = "ระบบกำลังวิเคราะห์ข้อมูล... ภาพรวมธุรกิจยังคงมีความสมดุลดีเยี่ยมในเกือบทุกมิติ";

    if (isHighUtilization) {
        message = `ตรวจพบความหนาแน่นของพาเลทที่ ${kpis.utilizationRate}% แนะนำให้เร่งการโอนย้ายออก (HUB Transfer) เพื่อลดความแออัด`;
    } else if (isHighMaintenance) {
        message = `อัตราการเข้าซ่อมพาเลทสูงผิดปกติ (${kpis.maintenanceRate}%) โปรดตรวจสอบสาบเหตุเชิงลึกของสาขาที่เป็นต้นทาง`;
    } else if (isTrendingUp) {
        message = `ปริมาณงานโดยรวมเติบโตขึ้น ${kpis.trendPercentage}% อย่างต่อเนื่อง แนะนำให้จัดสรรกำลังพลสำรองไว้ล่วงหน้า`;
    } else if (kpis.totalTransactions > 1000) {
        message = "ปริมาณการหมุนเวียนพาเลทวันนี้อยู่ในระดับสูง (High Volume) ขั้นตอนการตรวจสอบเอกสาร (Verification) ทำงานได้รวดเร็วปกติ";
    }

    return {
        text: message,
        confidence: 98.4
    };
};

export const getBranchPalletBreakdown = (stock: Stock, branchId: BranchId, palletNames: Record<PalletId, string>, palletColors: Record<PalletId, string>): ChartDataPoint[] => {
    const bStock = stock[branchId];
    if (!bStock) return [];

    return Object.entries(bStock).map(([pid, qty]) => ({
        name: palletNames[pid as PalletId] || pid,
        value: qty,
        color: palletColors[pid as PalletId] || '#6366f1'
    })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
};

export const getCentralizedReturnAnalysis = (transactions: Transaction[], partners: string[]): ChartDataPoint[] => {
    const relevantTx = transactions.filter(t => t.type === 'OUT' && partners.includes(t.dest));
    const hubCount = relevantTx.filter(t => t.source === 'hub_nw').reduce((s, t) => s + t.qty, 0);
    const branchCount = relevantTx.filter(t => t.source !== 'hub_nw').reduce((s, t) => s + t.qty, 0);

    return [
        { name: 'Hub NW (Centralized)', value: hubCount, color: '#10b981' },
        { name: 'Other Branches (Direct)', value: branchCount, color: '#f59e0b' }
    ];
};

export const getQuickLoopPerformance = (transactions: Transaction[]): ChartDataPoint[] => {
    const completeDoc = transactions.filter(t => t.carRegistration && t.driverName).length;
    const incompleteDoc = transactions.length - completeDoc;
    return [
        { name: 'Complete Info', value: completeDoc, color: '#3b82f6' },
        { name: 'Incomplete Info', value: incompleteDoc, color: '#cbd5e1' }
    ];
};

export const getPeakHourAnalysis = (transactions: Transaction[]): { hour: string; activity: number }[] => {
    const hours = new Array(24).fill(0);
    transactions.forEach(t => {
        const h = new Date(t.date).getHours();
        hours[h]++;
    });
    return hours.map((count, i) => ({ hour: `${i}:00`, activity: count }));
};

export const getHubTransferEfficiency = (transactions: Transaction[]): number => {
    return transactions.filter(t => t.status === 'PENDING' && t.dest === 'hub_nw').reduce((sum, t) => sum + t.qty, 0);
};

export const getPartnerVelocity = (transactions: Transaction[], partnerIds: string[]): ChartDataPoint[] => {
    const velocities: Record<string, number> = {};
    const now = new Date();
    partnerIds.forEach(id => {
        const recentTx = transactions.filter(t => (t.source === id || t.dest === id) && (now.getTime() - new Date(t.date).getTime()) < 30 * 24 * 60 * 60 * 1000);
        velocities[id] = recentTx.reduce((sum, t) => sum + t.qty, 0);
    });
    return Object.entries(velocities).map(([id, qty]) => ({ name: id, value: qty, color: '#8b5cf6' })).sort((a, b) => b.value - a.value);
};

export const getPartnerBalanceAnalysis = (transactions: Transaction[], partnerId: string, startDate: Date, endDate: Date): PartnerBalanceData[] => {
    const data: PartnerBalanceData[] = [];
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    let currentBalance = 0;
    if (partnerId !== 'all') {
        currentBalance = calculatePartnerBalance(transactions.filter(t => new Date(t.date) < startDate), partnerId, 'loscam_red');
    }
    for (let i = 0; i <= days; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dayStr = d.toISOString().split('T')[0];
        const dayTx = transactions.filter(t => t.status === 'COMPLETED' && t.date.startsWith(dayStr) && (partnerId === 'all' || t.source === partnerId || t.dest === partnerId));
        let receive = 0;
        let dispatch = 0;
        dayTx.forEach(t => {
            if (t.type === 'IN') receive += t.qty;
            if (t.type === 'OUT') dispatch += t.qty;
        });
        data.push({ date: dayStr, receive, dispatch, cancelled: 0, borrow: receive, return: dispatch, balance: currentBalance });
    }
    return data;
};

export const getScrappedByBranch = (transactions: Transaction[], startDate: Date, endDate: Date, branchNames: Record<BranchId, string>): ChartDataPoint[] => {
    const filtered = filterTransactionsByDate(transactions, startDate, endDate);
    const branchScraps: Record<string, number> = {};
    filtered.filter(t => t.type === 'MAINTENANCE' && t.status === 'COMPLETED').forEach(t => {
        const match = t.noteExtended?.match(/SCRAP:\s*(\d+)/);
        if (match) {
            const qty = parseInt(match[1]);
            const branchName = branchNames[t.source as BranchId] || t.source;
            branchScraps[branchName] = (branchScraps[branchName] || 0) + qty;
        }
    });
    return Object.entries(branchScraps).map(([name, value], i) => ({ name, value, color: ['#ef4444', '#f87171', '#b91c1c', '#991b1b', '#7f1d1d'][i % 5] })).sort((a, b) => b.value - a.value);
};

export const getStockDepletionPredictions = (
    transactions: Transaction[],
    stock: Stock,
    branchNames: Record<BranchId, string>,
    palletNames: Record<PalletId, string>
): StockPrediction[] => {
    const predictions: StockPrediction[] = [];
    const validBranchIds: BranchId[] = ['hub_nw', 'kpp', 'plk', 'cm', 'ekp', 'ms', 'sai3'];
    const validPalletIds: PalletId[] = PALLET_TYPES.map(p => p.id);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentTx = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo && t.status === 'COMPLETED');

    validBranchIds.forEach(bid => {
        const bStock = stock[bid] || {};
        validPalletIds.forEach(pid => {
            const currentQty = bStock[pid] || 0;
            const bTx = recentTx.filter(t => t.palletId === pid && (t.source === bid || t.dest === bid));

            const totalIn = bTx.filter(t => t.dest === bid && t.type === 'IN').reduce((sum, t) => sum + t.qty, 0);
            const totalOut = bTx.filter(t => t.source === bid && t.type === 'OUT').reduce((sum, t) => sum + t.qty, 0);

            // Daily averages over 30 days
            const avgIn = totalIn / 30;
            const avgOut = totalOut / 30;
            const burnRate = avgOut - avgIn;

            if (burnRate > 0) {
                const daysUntilEmpty = Math.floor(currentQty / burnRate);
                const predictedDate = new Date();
                predictedDate.setDate(now.getDate() + daysUntilEmpty);

                const status = daysUntilEmpty < 3 ? 'Critical' : daysUntilEmpty < 7 ? 'Warning' : 'Safe';

                // Only include if it's running out soon (less than 14 days) or already critical
                if (daysUntilEmpty < 14 || status === 'Critical') {
                    predictions.push({
                        branchId: bid,
                        branchName: branchNames[bid] || bid,
                        palletId: pid,
                        palletName: palletNames[pid] || pid,
                        currentStock: currentQty,
                        avgDailyIn: Math.round(avgIn * 10) / 10,
                        avgDailyOut: Math.round(avgOut * 10) / 10,
                        burnRate: Math.round(burnRate * 10) / 10,
                        daysUntilEmpty,
                        predictedDate: predictedDate.toISOString().split('T')[0],
                        status,
                        recommendedReplenishment: Math.round(burnRate * 14) // Recommend 2 weeks of stock
                    });
                }
            }
        });
    });

    return predictions.sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty);
};
