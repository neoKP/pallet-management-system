import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Transaction, Stock, BranchId, PalletId } from '../../types';
// @ts-ignore
import Swal from 'sweetalert2';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { DateRangeSelector } from './DateRangeSelector';
import { RechartsBarChart, RechartsPieChart, RechartsLineChart, PartnerBalanceChart, LoscamRentalChart, WasteDamageAnalysis } from './RechartsComponents';
import {
    calculateKPIs,
    getStatusDistribution,
    getTypeDistribution,
    getTimeSeriesData,
    getBranchPerformance,
    getPalletTypeAnalysis,
    getScrappedAnalysis,
    getScrappedByBranch,
    getPartnerBalanceAnalysis,
    getPartnerSummary,
    getPartnerPalletTypeSummary,
    getLoscamRentalAnalysis,
    getCentralizedReturnAnalysis,
    getSinoAgingAnalysis,
    getLogisticInsight,
    getQuickLoopPerformance,
    getPeakHourAnalysis,
    getHubTransferEfficiency,
    getBranchPalletBreakdown,
    getPartnerVelocity,
    getStockDepletionPredictions,
    ChartDataPoint,
    HeatmapData,
    WaterfallDataPoint,
} from '../../services/analyticsService';
import {
    Package,
    TrendingUp,
    Activity,
    Wrench,
    Moon,
    Sun,
    Download,
    RefreshCw,
    Sparkles,
    Truck,
    ChevronRight,
    Filter,
    ArrowDownCircle,
    ArrowUpCircle,
    ShieldCheck,
    Brain,
    Palette,
    Bot,
    Search,
    FilterX,
} from 'lucide-react';
import { BRANCHES, PALLET_TYPES, EXTERNAL_PARTNERS } from '../../constants';
import { isSameDay, startOfWeek, endOfWeek, subWeeks, format, isWithinInterval } from 'date-fns';
import { th } from 'date-fns/locale';
import { hexToRgb } from '../../utils/helpers';
import { NeoAIBriefing } from './NeoAIBriefing';
import { GaugeChart } from './GaugeChart';
import { Sparkline } from './Sparkline';
import { HeatmapCalendar } from './HeatmapCalendar';
import { WaterfallChart } from './WaterfallChart';
import { ComparisonCard } from './ComparisonCard';
import { EnhancedKPICard } from './EnhancedKPICard';
import { Slicers } from './Slicers';
import { SankeyDiagram } from './SankeyDiagram';
import { AnalyticsSkeleton } from './SkeletonLoader';
import { ForecastChart } from './ForecastChart';
import { YoYComparisonChart } from './YoYComparisonChart';
import { WoWComparisonChart } from './WoWComparisonChart';
import { ActionableInsights } from './ActionableInsights';
import { ThemeEngine, THEMES } from './ThemeEngine';
import { DrillThroughModal } from './DrillThroughModal';
import { GlobalSpotlight } from './GlobalSpotlight';
import { AgingRentalReport } from './AgingRentalReport';
import { ExecutivePalletSummary } from './ExecutivePalletSummary';
import { PredictiveStockAlerts } from './PredictiveStockAlerts';
import * as TelegramService from '../../services/telegramService';
import { getAgingRentalAnalysis } from '../../services/analyticsService';

const ExecutivePillCard = ({ title, value, suffix, color, trend, isDarkMode }: any) => (
    <motion.div
        whileHover={{ scale: 1.02 }}
        className={`p-6 rounded-[2.5rem] border flex flex-col items-center justify-center text-center gap-1 relative overflow-hidden transition-all duration-500 h-32 ${isDarkMode ? 'bg-slate-900/60 border-white/10 shadow-2xl' : 'bg-white border-slate-100 shadow-xl'
            }`}
        style={{ '--pill-color': color } as React.CSSProperties}
    >
        <div
            className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(circle_at_center,var(--pill-color),transparent)]"
        />
        <div className="flex items-center gap-2 relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-[var(--pill-color)]">
                {title}
            </p>
            {trend !== undefined && (
                <span className={`text-[10px] font-bold ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </span>
            )}
        </div>
        <div className="flex items-baseline gap-2 relative z-10">
            <h3 className={`text-5xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {value.toLocaleString()}
            </h3>
            <span className={`text-xs font-black uppercase tracking-widest opacity-40 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {suffix}
            </span>
        </div>
    </motion.div>
);

interface AnalyticsDashboardProps {
    transactions: Transaction[];
    stock: Stock;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
    transactions,
    stock,
}) => {
    const { filters, updateFilters, resetFilters, isDarkMode, toggleDarkMode, themeColor, setThemeColor } = useAnalyticsStore();
    const currentTheme = useMemo(() => THEMES.find(t => t.id === themeColor) || THEMES[0], [themeColor]);

    const [isSlicerOpen, setIsSlicerOpen] = useState(false);
    const [isThemeOpen, setIsThemeOpen] = useState(false);
    const [drillThroughOpen, setDrillThroughOpen] = useState(false);
    const [drillThroughData, setDrillThroughData] = useState<{
        title: string;
        subtitle?: string;
        transactions: Transaction[];
    }>({ title: '', transactions: [] });
    const [drillStack, setDrillStack] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'aging'>('overview');
    const [activePartnerId, setActivePartnerId] = useState<string>('all');
    const [partnerRange, setPartnerRange] = useState<'7d' | 'all'>('7d');

    // Initial loading state handle
    React.useEffect(() => {
        setIsLoading(false); // Data is already in state
    }, []);

    // Create lookup maps
    const branchNames = useMemo(() => {
        return BRANCHES.reduce((acc, branch) => {
            acc[branch.id] = branch.name;
            return acc;
        }, {} as Record<BranchId, string>);
    }, []);

    const palletNames = useMemo(() => {
        return PALLET_TYPES.reduce((acc, pallet) => {
            acc[pallet.id] = pallet.name;
            return acc;
        }, {} as Record<PalletId, string>);
    }, []);

    const palletColors = useMemo(() => {
        const colorMap: Record<string, string> = {
            'loscam_red': '#dc2626',
            'loscam_yellow': '#facc15',
            'loscam_blue': '#60a5fa',
            'hiq': '#f97316',
            'general': '#9ca3af',
            'plastic_circular': '#14b8a6',
        };
        return colorMap as Record<PalletId, string>;
    }, []);

    // Slicer-only Filtered Transactions (ignores global date range)
    const slicerFilteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            // 1. Branch Multi-select
            if (filters.selectedBranches.length > 0) {
                if (!filters.selectedBranches.includes(t.source) && !filters.selectedBranches.includes(t.dest)) {
                    return false;
                }
            }

            // 2. Pallet Type Multi-select
            if (filters.selectedPalletTypes.length > 0) {
                if (!filters.selectedPalletTypes.includes(t.palletId)) return false;
            }

            // 3. Year Multi-select
            if (filters.selectedYears.length > 0) {
                const date = new Date(t.date);
                if (!filters.selectedYears.includes(date.getFullYear())) return false;
            }

            return true;
        });
    }, [transactions, filters.selectedBranches, filters.selectedPalletTypes, filters.selectedYears]);

    // Base Filtered Transactions (respects EVERY filter including Date Range)
    const filteredTransactions = useMemo(() => {
        return slicerFilteredTransactions.filter(t => {
            const date = new Date(t.date);
            return date >= filters.startDate && date <= filters.endDate;
        });
    }, [slicerFilteredTransactions, filters.startDate, filters.endDate]);

    // Calculate analytics data - Use filteredTransactions
    const kpis = useMemo(() =>
        calculateKPIs(filteredTransactions, stock, filters.startDate, filters.endDate),
        [filteredTransactions, stock, filters.startDate, filters.endDate]
    );

    const statusData = useMemo(() =>
        getStatusDistribution(filteredTransactions, filters.startDate, filters.endDate),
        [filteredTransactions, filters.startDate, filters.endDate]
    );

    const typeData = useMemo(() =>
        getTypeDistribution(filteredTransactions, filters.startDate, filters.endDate),
        [filteredTransactions, filters.startDate, filters.endDate]
    );

    const timeSeriesData = useMemo(() => {
        const groupBy = filters.dateRange === 'day' ? 'day' : filters.dateRange === 'week' ? 'week' : 'month';
        return getTimeSeriesData(filteredTransactions, filters.startDate, filters.endDate, groupBy);
    }, [filteredTransactions, filters.startDate, filters.endDate, filters.dateRange]);

    const branchPerformance = useMemo(() =>
        getBranchPerformance(filteredTransactions, stock, filters.startDate, filters.endDate, branchNames),
        [filteredTransactions, stock, filters.startDate, filters.endDate, branchNames]
    );

    const palletAnalysis = useMemo(() =>
        getPalletTypeAnalysis(filteredTransactions, stock, filters.startDate, filters.endDate, palletNames, palletColors),
        [filteredTransactions, stock, filters.startDate, filters.endDate, palletNames, palletColors]
    );

    const scrappedAnalysis = useMemo(() =>
        getScrappedAnalysis(filteredTransactions, filters.startDate, filters.endDate, palletNames, palletColors),
        [filteredTransactions, filters.startDate, filters.endDate, palletNames, palletColors]
    );

    const partnerBalanceData = useMemo(() => {
        let start = filters.startDate;
        if (partnerRange === '7d') {
            start = new Date();
            start.setDate(start.getDate() - 7);
            start.setHours(0, 0, 0, 0);
        }
        return getPartnerBalanceAnalysis(transactions, activePartnerId, start, filters.endDate);
    }, [transactions, activePartnerId, filters.startDate, filters.endDate, partnerRange]);

    const partnerSummaryData = useMemo(() => {
        if (activePartnerId === 'all') {
            return getPartnerSummary(transactions, EXTERNAL_PARTNERS);
        } else {
            const palletInfo: Record<string, { name: string, color: string }> = {};
            PALLET_TYPES.forEach(pt => {
                const hexColor = pt.color.includes('bg-') ?
                    (pt.color.includes('red') ? '#ef4444' :
                        pt.color.includes('yellow') ? '#facc15' :
                            pt.color.includes('blue') ? '#3b82f6' :
                                pt.color.includes('orange') ? '#f97316' :
                                    pt.color.includes('gray') ? '#94a3b8' :
                                        pt.color.includes('teal') ? '#14b8a6' : '#6366f1') : '#6366f1';
                palletInfo[pt.id] = { name: pt.name, color: hexColor };
            });
            return getPartnerPalletTypeSummary(transactions, activePartnerId, palletInfo);
        }
    }, [transactions, activePartnerId]);

    const scrappedByBranchData = useMemo(() =>
        getScrappedByBranch(transactions, filters.startDate, filters.endDate, branchNames),
        [transactions, filters.startDate, filters.endDate, branchNames]
    );

    const totalScrappedSelected = useMemo(() =>
        scrappedByBranchData.reduce((sum, item) => sum + item.value, 0),
        [scrappedByBranchData]
    );

    const loscamRentalData = useMemo(() =>
        getLoscamRentalAnalysis(transactions, stock),
        [transactions, stock]
    );

    const centralizedReturnData = useMemo(() =>
        getCentralizedReturnAnalysis(transactions, ['sino', 'neo_corp', 'loscam_wangnoi']),
        [transactions]
    );

    const sinoAgingData = useMemo(() =>
        getSinoAgingAnalysis(transactions),
        [transactions]
    );

    const smartInsight = useMemo(() =>
        getLogisticInsight(filteredTransactions, kpis),
        [filteredTransactions, kpis]
    );

    const quickLoopPerformance = useMemo(() =>
        getQuickLoopPerformance(filteredTransactions),
        [filteredTransactions]
    );

    const peakHourData = useMemo(() =>
        getPeakHourAnalysis(filteredTransactions),
        [filteredTransactions]
    );

    const sai3StockBreakdown = useMemo(() =>
        getBranchPalletBreakdown(stock, 'sai3', palletNames, palletColors),
        [stock, palletNames, palletColors]
    );

    const sai3PartnerVelocity = useMemo(() =>
        getPartnerVelocity(transactions, ['lamsoon', 'ufc', 'loxley', 'kopee']),
        [transactions]
    );

    const sai3PendingTransfer = useMemo(() =>
        getHubTransferEfficiency(transactions),
        [transactions]
    );

    const { last7DaysData, last7DaysIn, last7DaysOut } = useMemo(() => {
        const days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date;
        });

        const counts = days.map(date =>
            transactions.filter((t: Transaction) =>
                isSameDay(new Date(t.date), date)
            ).length
        );

        const inQtys = days.map(date =>
            transactions.filter((t: Transaction) =>
                t.type === 'IN' && isSameDay(new Date(t.date), date)
            ).reduce((sum, t) => sum + t.qty, 0)
        );

        const outQtys = days.map(date =>
            transactions.filter((t: Transaction) =>
                t.type === 'OUT' && isSameDay(new Date(t.date), date)
            ).reduce((sum, t) => sum + t.qty, 0)
        );

        return { last7DaysData: counts, last7DaysIn: inQtys, last7DaysOut: outQtys };
    }, [transactions]);

    const sevenDayPerformanceData = useMemo(() => {
        const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

        const days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date;
        });

        return days.map(date => {
            const dayTransactions = transactions.filter((t: Transaction) =>
                isSameDay(new Date(t.date), date)
            );

            const inQty = dayTransactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.qty, 0);
            const outQty = dayTransactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.qty, 0);
            const maintenanceQty = dayTransactions.filter(t => t.type === 'MAINTENANCE').reduce((sum, t) => sum + t.qty, 0);
            const scrappedQty = dayTransactions
                .filter(t => t.type === 'MAINTENANCE')
                .reduce((sum, t) => {
                    const match = t.noteExtended?.match(/SCRAP:\s*(\d+)/);
                    return sum + (match ? parseInt(match[1]) : 0);
                }, 0);

            const dateLabel = `${date.getDate()} ${thaiMonths[date.getMonth()]}`;

            return {
                date: dateLabel,
                in: inQty,
                out: outQty,
                maintenance: maintenanceQty,
                scrapped: scrappedQty,
                total: inQty + outQty + maintenanceQty,
            };
        });
    }, [transactions]);

    const heatmapData: HeatmapData[] = useMemo(() => {
        const data: HeatmapData[] = [];
        for (let i = 0; i < 84; i++) { // 12 weeks * 7 days
            const date = new Date();
            date.setDate(date.getDate() - i);
            const count = slicerFilteredTransactions.filter((t: Transaction) =>
                isSameDay(new Date(t.date), date)
            ).length;
            data.push({ date, value: count });
        }
        return data;
    }, [slicerFilteredTransactions]);

    const waterfallData: WaterfallDataPoint[] = useMemo(() => {
        const inQty = filteredTransactions
            .filter((t: Transaction) => t.type === 'IN')
            .reduce((sum: number, t: Transaction) => sum + t.qty, 0);
        const outQty = filteredTransactions
            .filter((t: Transaction) => t.type === 'OUT')
            .reduce((sum: number, t: Transaction) => sum + t.qty, 0);
        const maintenanceQty = filteredTransactions
            .filter((t: Transaction) => t.type === 'MAINTENANCE')
            .reduce((sum: number, t: Transaction) => sum + t.qty, 0);

        const startValue = kpis.totalPalletsInStock - inQty + outQty + maintenanceQty;

        return [
            { label: 'Start', value: startValue, isTotal: true },
            { label: 'In', value: inQty },
            { label: 'Out', value: -outQty },
            { label: 'Maintenance', value: -maintenanceQty },
            { label: 'End', value: kpis.totalPalletsInStock, isTotal: true },
        ];
    }, [filteredTransactions, kpis]);

    const previousMonthTransactions = useMemo(() => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return slicerFilteredTransactions.filter((t: Transaction) => {
            const date = new Date(t.date);
            return date.getMonth() === lastMonth.getMonth() &&
                date.getFullYear() === lastMonth.getFullYear();
        }).length;
    }, [slicerFilteredTransactions]);

    const sankeyData = useMemo(() => {
        const flowMap: Record<string, number> = {};
        filteredTransactions.forEach(t => {
            if (t.source !== t.dest) {
                const key = `${t.source}|${t.dest}`;
                flowMap[key] = (flowMap[key] || 0) + t.qty;
            }
        });
        return Object.entries(flowMap).map(([key, qty]) => {
            const [source, dest] = key.split('|');
            return { source, dest, qty };
        });
    }, [filteredTransactions]);

    const forecastHistoricalData = useMemo(() => {
        const last30Days: { date: string; value: number }[] = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const count = slicerFilteredTransactions.filter((t: Transaction) =>
                isSameDay(new Date(t.date), date)
            ).length;
            last30Days.push({ date: dateStr, value: count });
        }
        return last30Days;
    }, [slicerFilteredTransactions]);

    const yoyData = useMemo(() => {
        const yearCounts: Record<number, number> = {};
        transactions.forEach(t => {
            const year = new Date(t.date).getFullYear();
            yearCounts[year] = (yearCounts[year] || 0) + 1;
        });
        const years = Object.keys(yearCounts).map(Number).sort((a, b) => a - b);
        const colors = ['#64748b', '#94a3b8', '#6366f1', '#8b5cf6', '#a855f7'];
        return years.map((year, index) => ({
            year,
            value: yearCounts[year],
            color: colors[Math.min(index, colors.length - 1)] || '#6366f1',
        }));
    }, [transactions]);

    const wowData = useMemo(() => {
        const weeksToShow = 8;
        const now = new Date();
        const weekData: { weekLabel: string; weekStart: string; value: number }[] = [];
        for (let i = weeksToShow - 1; i >= 0; i--) {
            const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
            const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
            const weekTransactions = transactions.filter(t => {
                const txDate = new Date(t.date);
                return isWithinInterval(txDate, { start: weekStart, end: weekEnd });
            });
            const weekLabel = i === 0 ? 'สัปดาห์นี้' : i === 1 ? 'สัปดาห์ที่แล้ว' : format(weekStart, 'd MMM', { locale: th });
            weekData.push({
                weekLabel,
                weekStart: format(weekStart, 'yyyy-MM-dd'),
                value: weekTransactions.length,
            });
        }
        return weekData;
    }, [transactions]);

    const { scrapped7Days, scrappedMTD, scrappedYTD } = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const getScrap = (tx: Transaction) => {
            if (tx.type !== 'MAINTENANCE' || tx.status !== 'COMPLETED') return 0;
            const match = tx.noteExtended?.match(/SCRAP:\s*(\d+)/);
            return match ? parseInt(match[1]) : 0;
        };
        const s7d = transactions.filter(t => new Date(t.date) >= sevenDaysAgo).reduce((sum, t) => sum + getScrap(t), 0);
        const mtd = transactions.filter(t => new Date(t.date) >= startOfMonth).reduce((sum, t) => sum + getScrap(t), 0);
        const ytd = transactions.filter(t => new Date(t.date) >= startOfYear).reduce((sum, t) => sum + getScrap(t), 0);
        return { scrapped7Days: s7d, scrappedMTD: mtd, scrappedYTD: ytd };
    }, [transactions]);

    const monthlyScrappedData = useMemo(() => {
        const thisYear = new Date().getFullYear();
        const MONTH_LABELS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const data = MONTH_LABELS.map(name => ({ name, value: 0 }));
        transactions.forEach(t => {
            const date = new Date(t.date);
            if (date.getFullYear() === thisYear && t.type === 'MAINTENANCE' && t.status === 'COMPLETED') {
                const match = t.noteExtended?.match(/SCRAP:\s*(\d+)/);
                if (match) data[date.getMonth()].value += parseInt(match[1]);
            }
        });
        return data;
    }, [transactions]);

    const stockDepletionPredictions = useMemo(() => {
        const branchNamesMap: any = {};
        BRANCHES.forEach(b => branchNamesMap[b.id] = b.name);
        const palletNamesMap: any = {};
        PALLET_TYPES.forEach(p => palletNamesMap[p.id] = p.name);
        return getStockDepletionPredictions(transactions, stock, branchNamesMap, palletNamesMap);
    }, [transactions, stock]);

    const [highlightedItem, setHighlightedItem] = useState<string | null>(null);

    // smartInsight is now calculated at line 296 using getLogisticInsight

    const handleDrillDown = (level: string) => {
        setDrillStack(prev => [...prev, level]);
        const branch = BRANCHES.find(b => b.name === level);
        if (branch) updateFilters({ selectedBranches: [branch.id] });
    };

    const handleBreadcrumbClick = (index: number) => {
        if (index === -1) {
            setDrillStack([]);
            updateFilters({ selectedBranches: [] });
        } else {
            const newStack = drillStack.slice(0, index + 1);
            setDrillStack(newStack);
            const branch = BRANCHES.find(b => b.name === newStack[newStack.length - 1]);
            if (branch) updateFilters({ selectedBranches: [branch.id] });
        }
    };

    const handleChartClick = (item: ChartDataPoint) => {
        if (highlightedItem === item.name) {
            setHighlightedItem(null);
            return;
        }
        setHighlightedItem(item.name);
        const branch = BRANCHES.find(b => b.name === item.name);
        const palletType = PALLET_TYPES.find(p => p.name === item.name);
        let filteredTx = filteredTransactions;
        let title = '';
        let subtitle = '';
        if (branch) {
            filteredTx = filteredTransactions.filter(t => t.source === branch.id || t.dest === branch.id);
            title = `📊 รายละเอียดสาขา: ${branch.name}`;
            subtitle = `${filteredTx.length} รายการในช่วงเวลาที่เลือก`;
        } else if (palletType) {
            filteredTx = filteredTransactions.filter(t => t.palletId === palletType.id);
            title = `📦 รายละเอียดประเภท: ${palletType.name}`;
            subtitle = `${filteredTx.length} รายการในช่วงเวลาที่เลือก`;
        } else if (item.name === 'IN' || item.name === 'OUT' || item.name === 'MAINTENANCE') {
            filteredTx = filteredTransactions.filter(t => t.type === item.name);
            const typeLabels: Record<string, string> = { IN: 'รับเข้า', OUT: 'จ่ายออก', MAINTENANCE: 'ซ่อมบำรุง' };
            title = `📋 รายการ: ${typeLabels[item.name]}`;
            subtitle = `${filteredTx.length} รายการในช่วงเวลาที่เลือก`;
        } else {
            title = `📊 รายละเอียด: ${item.name}`;
            subtitle = `${filteredTransactions.length} รายการทั้งหมด`;
            filteredTx = filteredTransactions;
        }
        setDrillThroughData({ title, subtitle, transactions: filteredTx });
        setDrillThroughOpen(true);
    };

    const handleExportPDF = async () => {
        try {
            Swal.fire({
                title: 'NEO AI REPORT ENGINE',
                html: '<p style="font-size: 14px; font-weight: 700; color: #6366f1; letter-spacing: 0.1em;">PREPARING EXECUTIVE BRIEFING...</p>',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            const { exportAnalyticsToPDF } = await import('../../utils/analyticsExport');
            await exportAnalyticsToPDF(kpis, filters.dateRange, filters.startDate, filters.endDate, isDarkMode);
            Swal.fire({ icon: 'success', title: 'Intelligence Report Exported', timer: 3000 });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Export Failed', text: 'System encountered a processing error.' });
        }
    };

    const handleAIBriefingRefresh = async () => {
        setIsLoading(true);
        // Simulate AI thinking
        await new Promise(resolve => setTimeout(resolve, 1200));
        setIsLoading(false);
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'info',
            title: 'Briefing Synchronized',
            showConfirmButton: false,
            timer: 3000,
            background: isDarkMode ? '#0f172a' : '#ffffff',
            color: isDarkMode ? '#ffffff' : '#0f172a'
        });
    };

    const handleExportExcel = async () => {
        try {
            Swal.fire({ title: 'กำลัง Export Excel...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const { exportAnalyticsToExcel } = await import('../../utils/analyticsExport');
            exportAnalyticsToExcel(kpis, statusData, typeData, timeSeriesData, branchPerformance, palletAnalysis, filters.dateRange, filters.startDate, filters.endDate, filteredTransactions);
            Swal.fire({ icon: 'success', title: 'Export สำเร็จ!', timer: 4000 });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถ Export Excel ได้' });
        }
    };

    const agingAnalysis = useMemo(() => getAgingRentalAnalysis(transactions), [transactions]);

    return (
        <div id="analytics-dashboard-root" className={`min-h-screen p-4 md:p-8 transition-colors duration-500 ${isDarkMode ? 'bg-slate-950 text-white font-sans' : 'bg-slate-50 text-slate-900 font-sans'}`}>
            <GlobalSpotlight />
            <style dangerouslySetInnerHTML={{
                __html: `
                #analytics-dashboard-root {
                    --theme-primary: ${currentTheme.primary};
                    --theme-secondary: ${currentTheme.secondary};
                    --theme-accent: ${currentTheme.accent || '#ec4899'};
                    --theme-primary-rgb: ${hexToRgb(currentTheme.primary)};
                    --theme-secondary-rgb: ${hexToRgb(currentTheme.secondary)};
                }
            `}} />
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl shadow-lg transition-all duration-500 theme-bg-primary theme-shadow-primary">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h1 className={`text-4xl font-extrabold tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                Premium <span className="text-transparent bg-clip-text transition-all duration-500 theme-gradient-primary">Analytics</span>
                            </h1>
                        </div>
                        <p className={`text-sm font-medium pl-14 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Enterprise Logistics Intelligence & Data Visualization Center</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-900/5 dark:bg-white/5 rounded-2xl backdrop-blur-md border border-black/5 dark:border-white/10">
                        <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl mr-2">
                            <button onClick={() => setActiveTab('overview')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}>Overview</button>
                            <button onClick={() => setActiveTab('aging')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === 'aging' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}>Aging & Rental</button>
                        </div>
                        <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} onClick={handleExportPDF} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${isDarkMode ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-white text-slate-600 shadow-sm hover:shadow-md'}`}>PDF</motion.button>
                        <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} onClick={handleExportExcel} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${isDarkMode ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-white text-slate-600 shadow-sm hover:shadow-md'}`}>Excel</motion.button>
                        <div className="w-px h-6 bg-slate-500/20 mx-1" />
                        <motion.button whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsSlicerOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg text-white theme-bg-primary theme-shadow-primary">
                            <Filter className="w-3.5 h-3.5" /> Filters
                        </motion.button>
                        <motion.button whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsThemeOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg text-white theme-bg-accent theme-shadow-accent">
                            <Palette className="w-3.5 h-3.5" /> Theme
                        </motion.button>
                        <motion.button whileHover={{ rotate: 180 }} whileTap={{ scale: 0.9 }} onClick={toggleDarkMode} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all">{isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}</motion.button>
                    </div>
                </motion.div>

                {isLoading ? (
                    <AnalyticsSkeleton isDarkMode={isDarkMode} />
                ) : activeTab === 'aging' ? (
                    <AgingRentalReport transactions={transactions} isDarkMode={isDarkMode} />
                ) : (
                    <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }} className="space-y-8">
                        <div data-pdf-export="summary">
                            <ExecutivePalletSummary analysis={agingAnalysis} />
                        </div>

                        <NeoAIBriefing
                            insight={smartInsight.text}
                            onRefresh={handleAIBriefingRefresh}
                            isDarkMode={isDarkMode}
                            isRefreshing={isLoading}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ExecutivePillCard title="MAX POSSESSION" value={kpis.maxPossession} suffix="MAX" color="#f97316" isDarkMode={isDarkMode} trend={kpis.maxPossessionTrend} />
                            <ExecutivePillCard title="TOTAL ACTIVITY" value={kpis.totalActivity} suffix="VOL" color="#10b981" isDarkMode={isDarkMode} trend={kpis.totalActivityTrend} />
                        </div>

                        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                            <DateRangeSelector selectedRange={filters.dateRange} startDate={filters.startDate} endDate={filters.endDate} onRangeChange={(range) => updateFilters({ dateRange: range })} onCustomDateChange={(start, end) => updateFilters({ startDate: start, endDate: end })} isDarkMode={isDarkMode} />
                            {drillStack.length > 0 && (
                                <div className={`flex items-center gap-2 p-1.5 px-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-600'} text-xs font-bold uppercase tracking-wider`}>
                                    <button onClick={() => handleBreadcrumbClick(-1)}>Global View</button>
                                    {drillStack.map((level, i) => (
                                        <React.Fragment key={i}>
                                            <ChevronRight className="w-4 h-4 opacity-50" />
                                            <button onClick={() => handleBreadcrumbClick(i)} className={`transition-colors duration-500 ${i === drillStack.length - 1 ? 'font-black theme-text-primary' : ''}`}>{level}</button>
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </motion.div>

                        <div data-pdf-export="kpis" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
                            <EnhancedKPICard title="การเคลื่อนไหวรวม" value={kpis.totalTransactions} icon={<Activity />} trend={kpis.trend} trendValue={kpis.trendPercentage} sparklineData={last7DaysData} variant="primary" color={currentTheme.primary} isDarkMode={isDarkMode} delay={0.1} />
                            <EnhancedKPICard title="พาเลทในคลัง" value={kpis.totalPalletsInStock} suffix="ชิ้น" icon={<Package />} sparklineData={last7DaysData} variant="secondary" color={currentTheme.secondary} isDarkMode={isDarkMode} delay={0.2} />
                            <EnhancedKPICard title="ระหว่างทาง" value={kpis.totalPalletsInTransit} suffix="ชิ้น" icon={<Truck />} sparklineData={last7DaysData} variant="accent" color={currentTheme.accent} isDarkMode={isDarkMode} delay={0.3} />
                            <EnhancedKPICard title="ยอดรับรวม" value={kpis.totalIn} suffix="ชิ้น" icon={<ArrowDownCircle />} trend={kpis.totalInTrend >= 0 ? 'up' : 'down'} trendValue={kpis.totalInTrend} sparklineData={last7DaysIn} variant="success" color="#10b981" isDarkMode={isDarkMode} delay={0.35} />
                            <EnhancedKPICard title="ยอดจ่ายรวม" value={kpis.totalOut} suffix="ชิ้น" icon={<ArrowUpCircle />} trend={kpis.totalOutTrend >= 0 ? 'up' : 'down'} trendValue={kpis.totalOutTrend} sparklineData={last7DaysOut} variant="warning" color="#f59e0b" isDarkMode={isDarkMode} delay={0.4} />
                            <EnhancedKPICard title="อัตราหมุนเวียน" value={kpis.utilizationRate} suffix="%" icon={<TrendingUp />} sparklineData={last7DaysData} variant="primary" color="#6366f1" isDarkMode={isDarkMode} delay={0.45} />
                            <EnhancedKPICard title="เข้าซ่อมบำรุง" value={kpis.maintenanceRate} suffix="%" icon={<Wrench />} sparklineData={last7DaysData} variant="accent" color="#ec4899" isDarkMode={isDarkMode} delay={0.5} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div data-pdf-export="chart"><RechartsLineChart data={sevenDayPerformanceData} title="📅 การเคลื่อนไหวพาเลท 7 วันล่าสุด" isDarkMode={isDarkMode} /></div>
                            <div data-pdf-export="chart"><RechartsPieChart data={statusData} title="🧿 สัดส่วนสถานะการเคลื่อนไหว" isDarkMode={isDarkMode} onSegmentClick={handleChartClick} /></div>
                            <div data-pdf-export="chart"><RechartsBarChart data={branchPerformance.map(b => ({ name: b.branchName, value: b.totalStock }))} title="🏢 พาเลทในคลังแยกตามสาขา" isDarkMode={isDarkMode} highlightedItem={highlightedItem} onBarClick={(item) => { handleChartClick(item); handleDrillDown(item.name); }} /></div>
                            <div data-pdf-export="chart"><RechartsBarChart data={palletAnalysis.map(p => ({ name: p.palletName, value: p.totalStock, color: palletColors[p.palletId] }))} title="🎨 สัดส่วนพาเลทแยกตามประเภท" isDarkMode={isDarkMode} onBarClick={handleChartClick} /></div>
                        </div>

                        {/* Hub NW Intelligence */}
                        <div className="space-y-6" data-pdf-export="group">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-blue-500 text-white shadow-lg"><Truck className="w-5 h-5" /></div>
                                <h2 className="text-xl font-black tracking-tight">Hub NW & Logistics Intelligence</h2>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <RechartsPieChart data={centralizedReturnData} title="🔄 การรวมศูนย์การคืน (Hub NW vs สาขา)" isDarkMode={isDarkMode} />
                                <RechartsPieChart data={sinoAgingData} title="⏳ Sino Aging Status (Grace Period)" isDarkMode={isDarkMode} />
                                <RechartsBarChart data={centralizedReturnData} title="🚛 วิเคราะห์การคืนพาเลทรวมศูนย์" isDarkMode={isDarkMode} />
                            </div>
                        </div>

                        {/* Sai 3 Operational Analytics */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-emerald-500 text-white shadow-lg"><Activity className="w-5 h-5" /></div>
                                <h2 className="text-xl font-black tracking-tight">Sai 3 Performance & Partner Velocity</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <EnhancedKPICard title="โอนย้ายรอส่ง Hub" value={sai3PendingTransfer} suffix="ชิ้น" icon={<Truck />} variant="warning" color="#f59e0b" isDarkMode={isDarkMode} />
                                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <RechartsBarChart data={sai3PartnerVelocity} title="⚡ ความเร็วพาร์ทเนอร์สาย 3" isDarkMode={isDarkMode} />
                                    <RechartsPieChart data={sai3StockBreakdown} title="🎨 สต็อกสีพาเลทสาย 3" isDarkMode={isDarkMode} />
                                    <RechartsLineChart data={peakHourData.map(h => ({ date: h.hour, total: h.activity, in: 0, out: 0, maintenance: 0, scrapped: 0 }))} title="⏱️ ช่วงเวลาลงรายการหนาแน่น" isDarkMode={isDarkMode} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <RechartsPieChart data={quickLoopPerformance} title="⚡ ประสิทธิภาพ Quick Loop" isDarkMode={isDarkMode} />
                            <LoscamRentalChart data={loscamRentalData} title="💰 วิเคราะห์ต้นทุนเช่าพาเลท (Loscam)" isDarkMode={isDarkMode} />
                        </div>

                        {/* Scrapped Summary */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <motion.div whileHover={{ y: -5 }} className={`p-8 rounded-[2rem] border flex flex-col items-center justify-center text-center gap-6 relative overflow-hidden ${isDarkMode ? 'bg-slate-900/40 border-red-500/20 shadow-2xl' : 'bg-white border-red-100 shadow-xl'}`}>
                                <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 blur-[80px] rounded-full" />
                                <div className={`p-6 rounded-3xl ${isDarkMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50'}`}><Wrench className="w-12 h-12 text-red-500 animate-pulse" /></div>
                                <div>
                                    <p className={`text-xs font-black uppercase tracking-[0.2em] mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>สรุปยอดพาเลทที่เสีย/ทิ้งรวม</p>
                                    <h3 className={`text-7xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalScrappedSelected.toLocaleString()}<span className="text-3xl ml-3 text-red-500/50 font-bold uppercase">QTY</span></h3>
                                </div>
                                <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>Total Damage Analysis</div>
                            </motion.div>
                            <RechartsBarChart data={scrappedByBranchData} title="🏛️ พาเลทเสียแยกตามสาขา" isDarkMode={isDarkMode} onBarClick={handleChartClick} />
                        </div>

                        <WasteDamageAnalysis data={monthlyScrappedData} summary={{ sevenDays: scrapped7Days, mtd: scrappedMTD, ytd: scrappedYTD }} title="🗑️ วิเคราะห์พาเลทเสีย/ทิ้ง (Loss Analytics)" isDarkMode={isDarkMode} />

                        {/* Partner Analysis */}
                        <div className="space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <RefreshCw className="w-8 h-8 text-blue-500" />
                                    <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Partner Borrow-Return</h2>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className={`p-1 rounded-xl flex items-center ${isDarkMode ? 'bg-slate-900 border border-white/10' : 'bg-slate-100'}`}>
                                        <button onClick={() => setPartnerRange('7d')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-tighter transition-all ${partnerRange === '7d' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>7 วันล่าสุด</button>
                                        <button onClick={() => setPartnerRange('all')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-tighter transition-all ${partnerRange === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>ตามที่เลือก</button>
                                    </div>
                                    <select value={activePartnerId} onChange={(e) => setActivePartnerId(e.target.value)} className={`px-4 py-2 rounded-xl text-sm font-bold border outline-none transition-all ${isDarkMode ? 'bg-slate-900 border-white/10 text-white focus:border-blue-500' : 'bg-white border-slate-200 focus:border-blue-500 shadow-sm'}`} title="เลือกคู่ค้าภายนอก">
                                        <option value="all">📊 สรุปยอดรวม (ทุกเจ้า)</option>
                                        {EXTERNAL_PARTNERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <PartnerBalanceChart data={partnerBalanceData} title={activePartnerId === 'all' ? "🤝 แนวโน้มยอดรวมพาเลทสะสม (Market Balance)" : `🤝 สรุปยอดยืม–คืน: ${EXTERNAL_PARTNERS.find(p => p.id === activePartnerId)?.name}`} isDarkMode={isDarkMode} showOnlyBalance={activePartnerId === 'all'} />
                                <RechartsBarChart data={partnerSummaryData} title={activePartnerId === 'all' ? "📊 ยอดรวมพาเลทคงค้างแยกตามเจ้า (Net Balance)" : `📊 ยอดคงค้างแยกตามประเภท: ${EXTERNAL_PARTNERS.find(p => p.id === activePartnerId)?.name}`} isDarkMode={isDarkMode} />
                            </div>
                        </div>

                        <div className="space-y-4 pt-6">
                            <div className="flex items-center gap-3">
                                <Activity className="w-8 h-8 text-rose-500" /><h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Loscam Rental Analysis</h2>
                            </div>
                            <LoscamRentalChart data={loscamRentalData} title="📊 วิเคราะห์ค่าเช่าพาเลท Loscam (รายวัน/7 วันล่าสุด)" isDarkMode={isDarkMode} />
                        </div>

                        {/* Deep Insights */}
                        <div className="grid grid-cols-1 gap-8">
                            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="w-8 h-8 text-indigo-500" />
                                    <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Operational Flow Insights</h2>
                                </div>
                                <SankeyDiagram data={sankeyData} isDarkMode={isDarkMode} title="🔄 การไหลของพาเลทระหว่างสาขา" />
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <GaugeChart value={kpis.utilizationRate} max={100} title="ประสิทธิภาพการหมุนเวียน" isDarkMode={isDarkMode} />
                                    <GaugeChart value={kpis.totalPalletsInStock} max={2000} title="ปริมาณสต็อกปัจจุบัน" color="#8b5cf6" isDarkMode={isDarkMode} />
                                    <ComparisonCard title="การเคลื่อนไหวประจำเดือน" currentValue={kpis.totalTransactions} previousValue={previousMonthTransactions} icon={<Activity />} color="#6366f1" isDarkMode={isDarkMode} />
                                </div>

                                {/* Predictive Stock Alerts */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500"><ShieldCheck className="w-4 h-4" /></div>
                                        <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Inventory Depletion Intelligence (AI พยากรณ์สต็อกขาด)</h3>
                                    </div>
                                    <PredictiveStockAlerts predictions={stockDepletionPredictions} isDarkMode={isDarkMode} />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Brain className="w-8 h-8 text-purple-500" />
                                        <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Statistical Forecast Intelligence</h2>
                                    </div>
                                    <ForecastChart historicalData={forecastHistoricalData} title="🔮 พยากรณ์การหมุนเวียนพาเลท (Statistical Flow)" isDarkMode={isDarkMode} forecastDays={7} />
                                </div>
                            </motion.div>
                        </div>

                        {/* YoY & WoW */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {yoyData.length > 1 ? (
                                <YoYComparisonChart data={yoyData} title="📈 เปรียบเทียบการหมุนเวียนรายปี" metric="รายการ" isDarkMode={isDarkMode} />
                            ) : (
                                <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white border-gray-200'}`}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}><TrendingUp className="w-5 h-5 text-indigo-500" /></div>
                                        <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>📈 Year-over-Year (YoY)</h3>
                                    </div>
                                    <div className="flex items-center justify-center py-8">
                                        <p className={`text-sm text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>📊 ข้อมูลปัจจุบันมีเฉพาะปี {new Date().getFullYear()}<br />จะแสดง YoY เมื่อมีข้อมูลมากกว่า 1 ปี</p>
                                    </div>
                                </div>
                            )}
                            <WoWComparisonChart data={wowData} title="📊 แนวโน้มการหมุนเวียน 8 สัปดาห์" metric="รายการ" isDarkMode={isDarkMode} />
                        </div>

                        <ActionableInsights kpis={kpis} branchPerformance={branchPerformance} palletAnalysis={palletAnalysis} isDarkMode={isDarkMode} />
                        <WaterfallChart data={waterfallData} title="การเปลี่ยนแปลงสต็อกพาเลท" isDarkMode={isDarkMode} />
                        <HeatmapCalendar data={heatmapData} title="ความหนาแน่นการหมุนเวียน (รายปี)" isDarkMode={isDarkMode} />
                    </motion.div>
                )}
            </div>

            <Slicers isOpen={isSlicerOpen} onClose={() => setIsSlicerOpen(false)} filters={{ branches: filters.selectedBranches as BranchId[], palletTypes: filters.selectedPalletTypes as PalletId[], years: filters.selectedYears }} onFilterChange={(type, value) => {
                if (type === 'branches') updateFilters({ selectedBranches: value });
                if (type === 'palletTypes') updateFilters({ selectedPalletTypes: value });
                if (type === 'years') updateFilters({ selectedYears: value });
            }} isDarkMode={isDarkMode} />

            <ThemeEngine isOpen={isThemeOpen} onClose={() => setIsThemeOpen(false)} currentTheme={themeColor} isDarkMode={isDarkMode} onThemeChange={setThemeColor} onDarkModeToggle={toggleDarkMode} />

            <DrillThroughModal isOpen={drillThroughOpen} onClose={() => setDrillThroughOpen(false)} title={drillThroughData.title} subtitle={drillThroughData.subtitle} transactions={drillThroughData.transactions} isDarkMode={isDarkMode} />
        </div>
    );
};
