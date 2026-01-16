import { Transaction, Stock, BranchId, PalletId } from '../types';

export interface KPIMetrics {
    totalTransactions: number;
    totalPalletsInStock: number;
    totalMovements: number;
    utilizationRate: number;
    maintenanceRate: number;
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
    total: number;
}

export interface BranchPerformance {
    branchId: BranchId;
    branchName: string;
    totalStock: number;
    inTransactions: number;
    outTransactions: number;
    utilizationRate: number;
    color: string;
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

    // Total Pallets in Stock
    const totalPalletsInStock = Object.values(stock).reduce((sum, branchStock) => {
        return sum + Object.values(branchStock).reduce((branchSum, qty) => branchSum + qty, 0);
    }, 0);

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
        totalMovements,
        utilizationRate: Math.round(utilizationRate * 10) / 10,
        maintenanceRate: Math.round(maintenanceRate * 10) / 10,
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
            acc[key] = { date: key, in: 0, out: 0, maintenance: 0, total: 0 };
        }

        if (t.type === 'IN') acc[key].in += t.qty;
        else if (t.type === 'OUT') acc[key].out += t.qty;
        else if (t.type === 'MAINTENANCE') acc[key].maintenance += t.qty;

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

    return Object.entries(stock).map(([branchId, branchStock], index) => {
        const totalStock = Object.values(branchStock).reduce((sum, qty) => sum + qty, 0);

        const branchTransactions = filtered.filter(
            t => t.source === branchId || t.dest === branchId
        );

        const inTransactions = branchTransactions.filter(t => t.dest === branchId && t.type === 'IN').length;
        const outTransactions = branchTransactions.filter(t => t.source === branchId && t.type === 'OUT').length;

        const utilizationRate = totalStock > 0
            ? Math.min(((inTransactions + outTransactions) / totalStock) * 100, 100)
            : 0;

        return {
            branchId: branchId as BranchId,
            branchName: branchNames[branchId as BranchId] || branchId,
            totalStock,
            inTransactions,
            outTransactions,
            utilizationRate: Math.round(utilizationRate * 10) / 10,
            color: branchColors[index % branchColors.length],
        };
    }).sort((a, b) => b.totalStock - a.totalStock);
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
            acc[palletId] = (acc[palletId] || 0) + qty;
        });
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(palletStocks).map(([palletId, totalStock]) => {
        const palletTransactions = filtered.filter(t => t.palletId === palletId);

        const inCount = palletTransactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.qty, 0);
        const outCount = palletTransactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.qty, 0);
        const maintenanceCount = palletTransactions.filter(t => t.type === 'MAINTENANCE').reduce((sum, t) => sum + t.qty, 0);

        const turnoverRate = totalStock > 0 ? ((inCount + outCount) / totalStock) * 100 : 0;

        return {
            palletId: palletId as PalletId,
            palletName: palletNames[palletId as PalletId] || palletId,
            totalStock,
            inCount,
            outCount,
            maintenanceCount,
            turnoverRate: Math.round(turnoverRate * 10) / 10,
            color: palletColors[palletId as PalletId] || '#6366f1',
        };
    }).sort((a, b) => b.totalStock - a.totalStock);
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
