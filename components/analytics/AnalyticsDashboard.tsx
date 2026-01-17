import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Transaction, Stock, BranchId, PalletId } from '../../types';
// @ts-ignore
import Swal from 'sweetalert2';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { DateRangeSelector } from './DateRangeSelector';
import { RechartsBarChart, RechartsPieChart, RechartsLineChart } from './RechartsComponents';
import {
    calculateKPIs,
    getStatusDistribution,
    getTypeDistribution,
    getTimeSeriesData,
    getBranchPerformance,
    getPalletTypeAnalysis,
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
} from 'lucide-react';
import { BRANCHES, PALLET_TYPES } from '../../constants';
import { isSameDay, startOfWeek, endOfWeek, subWeeks, format, isWithinInterval } from 'date-fns';
import { th } from 'date-fns/locale';
import { hexToRgb } from '../../utils/helpers';

// Premium Analytics Components
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
import { Filter as FilterIcon, Brain, Palette } from 'lucide-react';
import { GlobalSpotlight } from './GlobalSpotlight';

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

    // Simulate initial data loading for Phase 4 Aesthetics
    React.useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1500);
        return () => clearTimeout(timer);
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

    // Premium Analytics Data - 7-Day Performance (Real Data Only)
    const last7DaysData = useMemo(() => {
        const days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date;
        });

        return days.map(date =>
            transactions.filter((t: Transaction) =>
                isSameDay(new Date(t.date), date)
            ).length
        );
    }, [transactions]);

    // 7-Day Performance Focus - Detailed Time Series (Real Data)
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

            const dateLabel = `${date.getDate()} ${thaiMonths[date.getMonth()]}`;

            return {
                date: dateLabel,
                in: inQty,
                out: outQty,
                maintenance: maintenanceQty,
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

    // Forecast Data - Historical daily transactions for prediction
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

    // Real YoY Data - Calculate from actual transactions grouped by year
    const yoyData = useMemo(() => {
        const yearCounts: Record<number, number> = {};

        // Group transactions by year (using all transactions, not just filtered by date range)
        transactions.forEach(t => {
            const year = new Date(t.date).getFullYear();
            yearCounts[year] = (yearCounts[year] || 0) + 1;
        });

        // Get years with data and sort
        const years = Object.keys(yearCounts).map(Number).sort((a, b) => a - b);

        // Create color gradient for years
        const colors = ['#64748b', '#94a3b8', '#6366f1', '#8b5cf6', '#a855f7'];

        return years.map((year, index) => ({
            year,
            value: yearCounts[year],
            color: colors[Math.min(index, colors.length - 1)] || '#6366f1',
        }));
    }, [transactions]);

    // Real WoW Data - Calculate from actual transactions grouped by week (last 8 weeks)
    const wowData = useMemo(() => {
        const weeksToShow = 8;
        const now = new Date();
        const weekData: { weekLabel: string; weekStart: string; value: number }[] = [];

        for (let i = weeksToShow - 1; i >= 0; i--) {
            const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 }); // Monday start
            const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });

            // Count transactions in this week from ALL transactions (not filtered by date range)
            const weekTransactions = transactions.filter(t => {
                const txDate = new Date(t.date);
                return isWithinInterval(txDate, { start: weekStart, end: weekEnd });
            });

            const weekLabel = i === 0
                ? 'สัปดาห์นี้'
                : i === 1
                    ? 'สัปดาห์ที่แล้ว'
                    : format(weekStart, 'd MMM', { locale: th });

            weekData.push({
                weekLabel,
                weekStart: format(weekStart, 'yyyy-MM-dd'),
                value: weekTransactions.length,
            });
        }

        return weekData;
    }, [transactions]);

    const [highlightedItem, setHighlightedItem] = useState<string | null>(null);

    // Simulated "AI Insight" generation logic
    const smartInsight = useMemo(() => {
        const topBranch = branchPerformance[0];
        const topPallet = palletAnalysis[0];
        const trendDirection = kpis.trend === 'up' ? 'เพิ่มขึ้น' : 'ลดลง';

        return {
            text: `สาขา ${topBranch?.branchName || '-'} มีพาเลทในคลังสูงสุดที่ ${topBranch?.totalStock.toLocaleString()} ชิ้น พาเลทประเภท ${topPallet?.palletName || '-'} ถูกใช้งานมากที่สุด คิดเป็น ${(topPallet?.percentage || 0).toFixed(1)}% การหมุนเวียนสัปดาห์นี้${trendDirection} ${kpis.trendPercentage}% เมื่อเทียบกับช่วงก่อน ควรติดตามการกระจายพาเลทระหว่างสาขาให้สมดุล`,
            status: kpis.utilizationRate > 80 ? 'Optimal' : 'Checking'
        };
    }, [branchPerformance, palletAnalysis, kpis]);

    // Handlers
    const handleDrillDown = (level: string) => {
        setDrillStack(prev => [...prev, level]);
        const branch = BRANCHES.find(b => b.name === level);
        if (branch) {
            updateFilters({ selectedBranches: [branch.id] });
        }
    };

    const handleBreadcrumbClick = (index: number) => {
        if (index === -1) {
            setDrillStack([]);
            updateFilters({ selectedBranches: [] });
        } else {
            const newStack = drillStack.slice(0, index + 1);
            setDrillStack(newStack);
            const branch = BRANCHES.find(b => b.name === newStack[newStack.length - 1]);
            if (branch) {
                updateFilters({ selectedBranches: [branch.id] });
            }
        }
    };

    const handleChartClick = (item: ChartDataPoint) => {
        if (highlightedItem === item.name) {
            setHighlightedItem(null);
            return;
        }
        setHighlightedItem(item.name);

        // Open Drill-Through Modal with filtered transactions
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
            Swal.fire({ title: 'กำลัง Export PDF...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const { exportAnalyticsToPDF } = await import('../../utils/analyticsExport');
            await exportAnalyticsToPDF(kpis, filters.dateRange, filters.startDate, filters.endDate, isDarkMode);
            Swal.fire({ icon: 'success', title: 'Export สำเร็จ!', timer: 3000 });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถ Export PDF ได้' });
        }
    };

    const handleExportExcel = async () => {
        try {
            Swal.fire({ title: 'กำลัง Export Excel...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const { exportAnalyticsToExcel } = await import('../../utils/analyticsExport');
            exportAnalyticsToExcel(kpis, statusData, typeData, timeSeriesData, branchPerformance, palletAnalysis, filters.dateRange, filters.startDate, filters.endDate);
            Swal.fire({ icon: 'success', title: 'Export สำเร็จ!', timer: 4000 });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถ Export Excel ได้' });
        }
    };

    return (
        <div
            id="analytics-dashboard-root"
            className={`min-h-screen p-4 md:p-8 transition-colors duration-500 ${isDarkMode ? 'bg-slate-950 text-white font-sans' : 'bg-slate-50 text-slate-900 font-sans'}`}
        >
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
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
                >
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl shadow-lg transition-all duration-500 theme-bg-primary theme-shadow-primary">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h1 className={`text-4xl font-extrabold tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                Premium <span className="text-transparent bg-clip-text transition-all duration-500 theme-gradient-primary">
                                    Analytics
                                </span>
                            </h1>
                        </div>
                        <p className={`text-sm font-medium pl-14 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Enterprise Logistics Intelligence & Data Visualization Center
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-900/5 dark:bg-white/5 rounded-2xl backdrop-blur-md border border-black/5 dark:border-white/10">
                        <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} onClick={handleExportPDF} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${isDarkMode ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-white text-slate-600 shadow-sm hover:shadow-md'}`}>PDF</motion.button>
                        <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} onClick={handleExportExcel} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${isDarkMode ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-white text-slate-600 shadow-sm hover:shadow-md'}`}>Excel</motion.button>
                        <div className="w-px h-6 bg-slate-500/20 mx-1" />
                        <motion.button
                            whileHover={{ y: -2, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsSlicerOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg text-white theme-bg-primary theme-shadow-primary"
                        >
                            <Filter className="w-3.5 h-3.5" />
                            Filters
                        </motion.button>
                        <motion.button
                            whileHover={{ y: -2, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsThemeOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg text-white theme-bg-accent theme-shadow-accent"
                        >
                            <Palette className="w-3.5 h-3.5" />
                            Theme
                        </motion.button>
                        <motion.button whileHover={{ rotate: 180 }} whileTap={{ scale: 0.9 }} onClick={toggleDarkMode} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all">{isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}</motion.button>
                    </div>
                </motion.div>

                {isLoading ? (
                    <AnalyticsSkeleton isDarkMode={isDarkMode} />
                ) : (
                    <motion.div
                        initial="hidden"
                        animate="show"
                        variants={{
                            hidden: { opacity: 0 },
                            show: { opacity: 1, transition: { staggerChildren: 0.07 } }
                        }}
                        className="space-y-8"
                    >
                        {/* Smart Narrative Insight Overlay */}
                        <motion.div
                            variants={{ hidden: { opacity: 0, scale: 0.98 }, show: { opacity: 1, scale: 1 } }}
                            className={`p-6 rounded-3xl border transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm'} relative overflow-hidden`}
                        >
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none theme-gradient-primary" />
                            <div className="absolute top-0 right-0 p-4">
                                <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white theme-bg-primary">
                                    AI Insight
                                </span>
                            </div>
                            <div className="flex gap-4 items-start">
                                <div className="p-3 rounded-2xl text-white shadow-lg theme-bg-primary theme-shadow-primary">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div className="space-y-1 pr-20">
                                    <h4 className={`text-sm font-black transition-colors duration-500 theme-text-primary`}>Smart Narrative</h4>
                                    <p className={`text-base font-medium leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        {smartInsight.text}
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Control Bar */}
                        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                            <DateRangeSelector
                                selectedRange={filters.dateRange}
                                startDate={filters.startDate}
                                endDate={filters.endDate}
                                onRangeChange={(range) => updateFilters({ dateRange: range })}
                                onCustomDateChange={(start, end) => updateFilters({ startDate: start, endDate: end })}
                                isDarkMode={isDarkMode}
                            />
                            {drillStack.length > 0 && (
                                <div className={`flex items-center gap-2 p-1.5 px-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-600'} text-xs font-bold uppercase tracking-wider`}>
                                    <button onClick={() => handleBreadcrumbClick(-1)}>Global View</button>
                                    {drillStack.map((level, i) => (
                                        <React.Fragment key={i}>
                                            <ChevronRight className="w-4 h-4 opacity-50" />
                                            <button
                                                onClick={() => handleBreadcrumbClick(i)}
                                                className={`transition-colors duration-500 ${i === drillStack.length - 1 ? 'font-black theme-text-primary' : ''}`}
                                            >
                                                {level}
                                            </button>
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </motion.div>

                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                            <EnhancedKPICard title="รายการรวม" value={kpis.totalTransactions} icon={<Activity />} trend={kpis.trend} trendValue={kpis.trendPercentage} sparklineData={last7DaysData} variant="primary" color={currentTheme.primary} isDarkMode={isDarkMode} delay={0.1} />
                            <EnhancedKPICard title="สต็อกปัจจุบัน" value={kpis.totalPalletsInStock} suffix="ชิ้น" icon={<Package />} sparklineData={last7DaysData} variant="secondary" color={currentTheme.secondary} isDarkMode={isDarkMode} delay={0.2} />
                            <EnhancedKPICard title="ระหว่างขนส่ง" value={kpis.totalPalletsInTransit} suffix="ชิ้น" icon={<Truck />} sparklineData={last7DaysData} variant="accent" color={currentTheme.accent} isDarkMode={isDarkMode} delay={0.3} />
                            <EnhancedKPICard title="การใช้สอย" value={kpis.utilizationRate} suffix="%" icon={<TrendingUp />} sparklineData={last7DaysData} variant="success" color="#10b981" isDarkMode={isDarkMode} delay={0.4} />
                            <EnhancedKPICard title="ซ่อมบำรุง" value={kpis.maintenanceRate} suffix="%" icon={<Wrench />} sparklineData={last7DaysData} variant="warning" color="#f59e0b" isDarkMode={isDarkMode} delay={0.5} />
                        </div>

                        {/* Main Interaction Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <RechartsLineChart data={sevenDayPerformanceData} title="📅 7-Day Performance Focus (Real Data)" isDarkMode={isDarkMode} />
                            <RechartsPieChart data={statusData} title="🧿 Status Distribution (Interactive)" isDarkMode={isDarkMode} onSegmentClick={handleChartClick} />
                            <RechartsBarChart
                                data={branchPerformance.map(b => ({ name: b.branchName, value: b.totalStock }))}
                                title="🏢 Branch Stock Ranking"
                                isDarkMode={isDarkMode}
                                highlightedItem={highlightedItem}
                                onBarClick={(item) => { handleChartClick(item); handleDrillDown(item.name); }}
                            />
                            <RechartsBarChart
                                data={palletAnalysis.map(p => ({ name: p.palletName, value: p.totalStock, color: palletColors[p.palletId] }))}
                                title="🎨 Inventory by Pallet Type"
                                isDarkMode={isDarkMode}
                                highlightedItem={highlightedItem}
                                onBarClick={handleChartClick}
                            />
                        </div>

                        {/* Deep Insights */}
                        <div className="grid grid-cols-1 gap-8">
                            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="w-8 h-8 text-indigo-500" />
                                    <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Operational Flow Insights</h2>
                                </div>
                                <SankeyDiagram data={sankeyData} isDarkMode={isDarkMode} title="🔄 Network Logistics Flow (Sankey Matrix)" />

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <GaugeChart value={kpis.utilizationRate} max={100} title="Resource Efficiency" isDarkMode={isDarkMode} />
                                    <GaugeChart value={kpis.totalPalletsInStock} max={2000} title="Stock Capacity" color="#8b5cf6" isDarkMode={isDarkMode} />
                                    <ComparisonCard title="Monthly Throughput" currentValue={kpis.totalTransactions} previousValue={previousMonthTransactions} icon={<Activity />} color="#6366f1" isDarkMode={isDarkMode} />
                                </div>

                                {/* AI-Powered Forecast Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Brain className="w-8 h-8 text-purple-500" />
                                        <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Predictive Intelligence</h2>
                                    </div>
                                    <ForecastChart
                                        historicalData={forecastHistoricalData}
                                        title="🔮 Transaction Forecast (AI-Powered Prediction)"
                                        isDarkMode={isDarkMode}
                                        forecastDays={7}
                                    />
                                </div>

                                {/* YoY & WoW Comparison Charts - Real Data Only */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Year-over-Year - Shows if we have data from multiple years */}
                                    {yoyData.length > 1 ? (
                                        <YoYComparisonChart
                                            data={yoyData}
                                            title="📈 Year-over-Year Transaction Growth"
                                            metric="รายการ"
                                            isDarkMode={isDarkMode}
                                        />
                                    ) : (
                                        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white border-gray-200'}`}>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                                                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                                                </div>
                                                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                    📈 Year-over-Year (YoY)
                                                </h3>
                                            </div>
                                            <div className="flex items-center justify-center py-8">
                                                <p className={`text-sm text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    📊 ข้อมูลปัจจุบันมีเฉพาะปี {new Date().getFullYear()}<br />
                                                    จะแสดง YoY เมื่อมีข้อมูลมากกว่า 1 ปี
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Week-over-Week - More immediately useful */}
                                    <WoWComparisonChart
                                        data={wowData}
                                        title="📊 Week-over-Week Trend (8 สัปดาห์)"
                                        metric="รายการ"
                                        isDarkMode={isDarkMode}
                                    />
                                </div>

                                {/* Actionable AI Insights */}
                                <ActionableInsights
                                    kpis={kpis}
                                    branchPerformance={branchPerformance}
                                    palletAnalysis={palletAnalysis}
                                    isDarkMode={isDarkMode}
                                />

                                <WaterfallChart data={waterfallData} title="Incremental Stock Flow Analysis" isDarkMode={isDarkMode} />
                                <HeatmapCalendar data={heatmapData} title="Tactical Activity Density (Yearly View)" isDarkMode={isDarkMode} />
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </div>

            <Slicers
                isOpen={isSlicerOpen}
                onClose={() => setIsSlicerOpen(false)}
                filters={{ branches: filters.selectedBranches as BranchId[], palletTypes: filters.selectedPalletTypes as PalletId[], years: filters.selectedYears }}
                onFilterChange={(type, value) => {
                    if (type === 'branches') updateFilters({ selectedBranches: value });
                    if (type === 'palletTypes') updateFilters({ selectedPalletTypes: value });
                    if (type === 'years') updateFilters({ selectedYears: value });
                }}
                isDarkMode={isDarkMode}
            />

            <ThemeEngine
                isOpen={isThemeOpen}
                onClose={() => setIsThemeOpen(false)}
                currentTheme={themeColor}
                isDarkMode={isDarkMode}
                onThemeChange={setThemeColor}
                onDarkModeToggle={toggleDarkMode}
            />

            <DrillThroughModal
                isOpen={drillThroughOpen}
                onClose={() => setDrillThroughOpen(false)}
                title={drillThroughData.title}
                subtitle={drillThroughData.subtitle}
                transactions={drillThroughData.transactions}
                isDarkMode={isDarkMode}
            />
        </div>
    );
};
