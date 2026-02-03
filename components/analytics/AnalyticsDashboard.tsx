import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Transaction, Stock, BranchId, PalletId } from '../../types';
// @ts-ignore
import Swal from 'sweetalert2';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { DateRangeSelector } from './DateRangeSelector';
import {
    RechartsBarChart,
    RechartsPieChart,
    RechartsLineChart,
    PartnerBalanceChart,
    LoscamRentalChart,
    WasteDamageAnalysis,
    RiskMatrixScatterChart,
    BranchHealthRadarChart
} from './RechartsComponents';
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
    KPIMetrics,
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
} from 'lucide-react';
import { BRANCHES, PALLET_TYPES, EXTERNAL_PARTNERS } from '../../constants';
import { subWeeks, subMonths, isWithinInterval } from 'date-fns';
import { hexToRgb } from '../../utils/helpers';
import { NeoAIBriefing } from './NeoAIBriefing';
import { GaugeChart } from './GaugeChart';
import { HeatmapCalendar } from './HeatmapCalendar';
import { WaterfallChart } from './WaterfallChart';
import { ComparisonCard } from './ComparisonCard';
import { EnhancedKPICard } from './EnhancedKPICard';
import { Slicers } from './Slicers';
import { SankeyDiagram } from './SankeyDiagram';
import { AnalyticsSkeleton } from './SkeletonLoader';
import { ForecastChart } from './ForecastChart';
import { WoWComparisonChart } from './WoWComparisonChart';
import { ActionableInsights } from './ActionableInsights';
import { ThemeEngine, THEMES } from './ThemeEngine';
import { DrillThroughModal } from './DrillThroughModal';
import { GlobalSpotlight } from './GlobalSpotlight';
import { AgingRentalReport } from './AgingRentalReport';
import { ExecutivePalletSummary } from './ExecutivePalletSummary';
import { PredictiveStockAlerts } from './PredictiveStockAlerts';
import { HealthScoreCockpit } from './HealthScoreCockpit';
import { AnalyticsSectionHeader } from './AnalyticsSectionHeader';
import { getAgingRentalAnalysis } from '../../services/analyticsService';
import { Layers } from 'lucide-react';

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
                <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[8px] font-black ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </div>
            )}
        </div>
        <div className="flex items-baseline gap-2 relative z-10">
            <h3 className={`text-5xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {value.toLocaleString()}
            </h3>
            <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-900 opacity-40'}`}>
                {suffix}
            </span>
        </div>
    </motion.div>
);

interface AnalyticsDashboardProps {
    transactions: Transaction[];
    stock: Stock;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ transactions, stock }) => {
    const {
        filters,
        updateFilters,
        toggleDarkMode,
        isDarkMode,
        themeColor,
        setThemeColor,
        activeTab,
        setActiveTab,
        drillStack,
        pushDrill,
        popDrill,
        resetDrill
    } = useAnalyticsStore();

    const [isSlicerOpen, setIsSlicerOpen] = useState(false);
    const [isThemeOpen, setIsThemeOpen] = useState(false);
    const [drillThroughOpen, setDrillThroughOpen] = useState(false);
    const [drillThroughData, setDrillThroughData] = useState<{ title: string; subtitle: string; transactions: Transaction[] }>({ title: '', subtitle: '', transactions: [] });
    const [activePartnerId, setActivePartnerId] = useState<string>('all');
    const [partnerRange, setPartnerRange] = useState<'7d' | 'all'>('7d');
    const [highlightedItem, setHighlightedItem] = useState<string | null>(null);

    const currentTheme = THEMES.find(t => t.id === themeColor) || THEMES[0];

    // Helper mappings for services
    const branchNamesMapping = useMemo(() => {
        const mapping: Record<string, string> = {};
        BRANCHES.forEach(b => { mapping[b.id] = b.name; });
        return mapping as Record<BranchId, string>;
    }, []);

    const palletNamesMapping = useMemo(() => {
        const mapping: Record<string, string> = {};
        PALLET_TYPES.forEach(p => { mapping[p.id] = p.name; });
        return mapping as Record<PalletId, string>;
    }, []);

    const palletColorsMapping = useMemo(() => {
        const mapping: Record<string, string> = {};
        PALLET_TYPES.forEach(p => {
            if (p.id === 'loscam_red') mapping[p.id] = '#ef4444';
            else if (p.id === 'loscam_blue') mapping[p.id] = '#3b82f6';
            else if (p.id === 'loscam_yellow') mapping[p.id] = '#eab308';
            else if (p.id === 'hiq') mapping[p.id] = '#8b5cf6';
            else mapping[p.id] = '#6366f1';
        });
        return mapping as Record<PalletId, string>;
    }, []);

    // Filter Logic
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const date = new Date(t.date);
            const inRange = isWithinInterval(date, { start: filters.startDate, end: filters.endDate });
            const inBranch = filters.selectedBranches.length === 0 || filters.selectedBranches.includes(t.source) || filters.selectedBranches.includes(t.dest);
            const inType = filters.selectedPalletTypes.length === 0 || filters.selectedPalletTypes.includes(t.palletId);
            return inRange && inBranch && inType;
        });
    }, [transactions, filters]);

    // Data Preparation
    const kpis: KPIMetrics = useMemo(() => calculateKPIs(transactions, stock, filters.startDate, filters.endDate), [transactions, stock, filters]);
    const statusData = useMemo(() => getStatusDistribution(transactions, filters.startDate, filters.endDate), [transactions, filters]);
    const sevenDayPerformanceData = useMemo(() => getTimeSeriesData(transactions, subWeeks(filters.endDate, 1), filters.endDate), [transactions, filters.endDate]);
    const branchPerformance = useMemo(() => getBranchPerformance(transactions, stock, filters.startDate, filters.endDate, branchNamesMapping), [transactions, stock, filters, branchNamesMapping]);
    const palletAnalysis = useMemo(() => getPalletTypeAnalysis(transactions, stock, filters.startDate, filters.endDate, palletNamesMapping, palletColorsMapping), [transactions, stock, filters, palletNamesMapping, palletColorsMapping]);
    const scrappedAnalysis = useMemo(() => getScrappedAnalysis(transactions, filters.startDate, filters.endDate, palletNamesMapping, palletColorsMapping), [transactions, filters, palletNamesMapping, palletColorsMapping]);
    const scrappedByBranchData = useMemo(() => getScrappedByBranch(transactions, filters.startDate, filters.endDate, branchNamesMapping), [transactions, filters, branchNamesMapping]);

    const partnerBalanceData = useMemo(() => {
        const startRange = partnerRange === '7d' ? subWeeks(new Date(), 1) : filters.startDate;
        return getPartnerBalanceAnalysis(transactions, activePartnerId, startRange, filters.endDate);
    }, [transactions, partnerRange, activePartnerId, filters]);

    const partnerSummaryData = useMemo(() => {
        if (activePartnerId === 'all') return getPartnerSummary(transactions, EXTERNAL_PARTNERS);
        const pTypes: Record<string, { name: string, color: string }> = {};
        PALLET_TYPES.forEach(pt => { pTypes[pt.id] = { name: pt.name, color: palletColorsMapping[pt.id] }; });
        return getPartnerPalletTypeSummary(transactions, activePartnerId, pTypes);
    }, [transactions, activePartnerId, palletColorsMapping]);

    const loscamRentalData = useMemo(() => getLoscamRentalAnalysis(transactions, stock), [transactions, stock]);
    const agingAnalysis = useMemo(() => getAgingRentalAnalysis(transactions), [transactions]);
    const centralizedReturnData = useMemo(() => getCentralizedReturnAnalysis(filteredTransactions, EXTERNAL_PARTNERS.map(p => p.id)), [filteredTransactions]);
    const sinoAgingData = useMemo(() => getSinoAgingAnalysis(filteredTransactions), [filteredTransactions]);
    const smartInsight = useMemo(() => getLogisticInsight(transactions, kpis), [transactions, kpis]);

    const quickLoopPerformance = useMemo(() => getQuickLoopPerformance(transactions), [transactions]);
    const peakHourData = useMemo(() => getPeakHourAnalysis(filteredTransactions), [filteredTransactions]);
    const stockDepletionPredictions = useMemo(() => getStockDepletionPredictions(transactions, stock, branchNamesMapping, palletNamesMapping), [transactions, stock, branchNamesMapping, palletNamesMapping]);

    const waterfallData = useMemo(() => ([
        { label: 'พาเลทต้นงวด', value: kpis.totalPalletsInStock - (kpis.totalIn - kpis.totalOut) },
        { label: 'รับเข้า (+)', value: kpis.totalIn },
        { label: 'จ่ายออก (-)', value: -kpis.totalOut },
        { label: 'ชำรุด (-)', value: -kpis.totalScrapped },
        { label: 'กำลังโอนย้าย', value: -kpis.totalPalletsInTransit },
    ]), [kpis]);

    const last7DaysIn = useMemo(() => sevenDayPerformanceData.map(d => d.in), [sevenDayPerformanceData]);
    const last7DaysOut = useMemo(() => sevenDayPerformanceData.map(d => d.out), [sevenDayPerformanceData]);
    const last7DaysData = useMemo(() => sevenDayPerformanceData.map(d => d.total), [sevenDayPerformanceData]);

    const heatmapData = useMemo(() => {
        const tsData = getTimeSeriesData(transactions, subMonths(new Date(), 12), new Date());
        return tsData.map(d => ({ date: new Date(d.date), value: d.total }));
    }, [transactions]);

    const palletColors: Record<string, string> = {
        'loscam_red': '#ef4444',
        'loscam_blue': '#3b82f6',
        'loscam_yellow': '#eab308',
        'hiq': '#8b5cf6',
    };

    const monthlyScrappedData = useMemo(() => {
        const analysis = getScrappedAnalysis(transactions, subMonths(new Date(), 1), new Date(), palletNamesMapping, palletColorsMapping);
        return analysis.map(a => ({
            name: a.palletName,
            value: a.scrappedQty,
            color: a.color,
            percentage: a.percentage
        }));
    }, [transactions, palletNamesMapping, palletColorsMapping]);
    const getScrapQty = (txs: Transaction[]) => txs.reduce((sum, t) => {
        const m = t.noteExtended?.match(/SCRAP:\s*(\d+)/);
        return sum + (m ? parseInt(m[1]) : 0);
    }, 0);

    const scrapped7Days = useMemo(() => getScrapQty(transactions.filter(t => t.type === 'MAINTENANCE' && t.status === 'COMPLETED' && isWithinInterval(new Date(t.date), { start: subWeeks(new Date(), 1), end: new Date() }))), [transactions]);
    const scrappedMTD = useMemo(() => getScrapQty(transactions.filter(t => t.type === 'MAINTENANCE' && t.status === 'COMPLETED' && new Date(t.date).getMonth() === new Date().getMonth())), [transactions]);
    const scrappedYTD = useMemo(() => getScrapQty(transactions.filter(t => t.type === 'MAINTENANCE' && t.status === 'COMPLETED' && new Date(t.date).getFullYear() === new Date().getFullYear())), [transactions]);

    const totalScrappedSelected = useMemo(() => kpis.totalScrapped, [kpis]);

    const wowData = useMemo(() => {
        const data = [];
        for (let i = 7; i >= 0; i--) {
            const start = subWeeks(new Date(), i);
            const end = subWeeks(new Date(), i - 1);
            const val = transactions.filter(t => {
                const d = new Date(t.date);
                return d >= start && d < end;
            }).length;
            data.push({
                weekLabel: `W${i === 0 ? ' (Now)' : i}`,
                weekStart: start.toISOString(),
                value: val
            });
        }
        return data;
    }, [transactions]);

    const previousMonthTransactions = useMemo(() => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const start = subMonths(new Date(), 2);
        const end = subMonths(new Date(), 1);
        return transactions.filter(t => {
            const d = new Date(t.date);
            return isWithinInterval(d, { start, end });
        }).length;
    }, [transactions]);

    const isLoading = false;

    const handleExportPDF = () => {
        window.print();
    };

    const handleExportExcel = async () => {
        const { handleExportToExcel } = await import('../../utils/excelExport');
        handleExportToExcel(transactions, 'ALL');
    };

    const handleChartClick = (data: any) => {
        const txs = filteredTransactions.filter(t => {
            if (data.branchName) return t.source === data.branchName || t.dest === data.branchName;
            if (data.name && PALLET_TYPES.some(p => p.name === data.name)) return t.palletId === PALLET_TYPES.find(p => p.name === data.name)?.id;
            return true;
        });
        setDrillThroughData({ title: data.name || data.branchName || 'Details', subtitle: 'Detailed Transaction Logs', transactions: txs });
        setDrillThroughOpen(true);
    };

    const handleDrillDown = (level: string) => {
        pushDrill(level);
    };

    const handleBreadcrumbClick = (index: number) => {
        if (index === -1) resetDrill();
        else popDrill();
    };

    const performanceData = useMemo(() => {
        const utilizationScore = (kpis.utilizationRate / 100) * 40;
        const lossRatio = kpis.totalScrapped / (kpis.totalTransactions || 1);
        const scrapScore = Math.max(0, (1 - lossRatio * 10) * 30);
        const transitRatio = kpis.totalPalletsInTransit / (kpis.totalPalletsInStock || 1);
        const transitScore = Math.max(0, 30 - (transitRatio * 100));
        const finalScore = Math.round(utilizationScore + scrapScore + transitScore);

        return {
            score: finalScore,
            utilization: Math.round(kpis.utilizationRate),
            lossRate: parseFloat((lossRatio * 100).toFixed(1)),
            transitHealth: Math.round(100 - (transitRatio * 100)),
            trend: kpis.trendPercentage
        };
    }, [kpis]);

    // Hybrid Chart Data
    const healthRadarData = useMemo(() => [
        { subject: 'Velocity', A: 85, fullMark: 100 },
        { subject: 'Accuracy', A: 98, fullMark: 100 },
        { subject: 'Cost Control', A: 70, fullMark: 100 },
        { subject: 'Efficiency', A: 90, fullMark: 100 },
        { subject: 'Maintenance', A: 65, fullMark: 100 },
        { subject: 'Asset Safety', A: 95, fullMark: 100 },
    ], []);

    const riskMatrixData = useMemo(() => {
        return EXTERNAL_PARTNERS.map((p) => ({
            name: p.name,
            x: Math.floor(Math.random() * 5000),
            y: Math.floor(Math.random() * 100),
            z: Math.floor(Math.random() * 1000)
        }));
    }, []);

    const sankeyData = useMemo(() => {
        return filteredTransactions.map(t => ({
            source: t.source,
            dest: t.dest,
            qty: t.qty
        }));
    }, [filteredTransactions]);

    return (
        <div id="analytics-dashboard-root" className={`min-h-screen p-4 lg:p-10 transition-colors duration-500 overflow-x-hidden ${isDarkMode ? 'bg-slate-950 text-white font-sans' : 'bg-slate-50 text-slate-900 font-sans'}`}>
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
            <div className="w-full space-y-10">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 sm:p-2 rounded-xl shadow-lg transition-all duration-500 theme-bg-primary theme-shadow-primary">
                                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            </div>
                            <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                Premium <span className="text-transparent bg-clip-text transition-all duration-500 theme-gradient-primary">Analytics</span>
                            </h1>
                        </div>
                        <p className={`text-[10px] sm:text-xs lg:text-sm font-bold pl-[3.25rem] sm:pl-14 ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>Enterprise Logistics Intelligence & Data Visualization Center</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-900/5 dark:bg-white/5 rounded-2xl backdrop-blur-md border border-black/5 dark:border-white/10">
                        <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-full sm:w-auto">
                            <button onClick={() => setActiveTab('overview')} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}>Overview</button>
                            <button onClick={() => setActiveTab('aging')} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === 'aging' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}>Aging</button>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
                            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} onClick={handleExportPDF} className={`flex-1 sm:flex-none px-3 py-2 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all ${isDarkMode ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-white text-slate-600 shadow-sm hover:shadow-md'}`}>PDF</motion.button>
                            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} onClick={handleExportExcel} className={`flex-1 sm:flex-none px-3 py-2 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all ${isDarkMode ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-white text-slate-600 shadow-sm hover:shadow-md'}`}>Excel</motion.button>
                            <div className="hidden sm:block w-px h-6 bg-slate-500/20 mx-1" />
                            <motion.button whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsSlicerOpen(true)} className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all shadow-lg text-white theme-bg-primary theme-shadow-primary flex-1 sm:flex-none">
                                <Filter className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Filter
                            </motion.button>
                            <motion.button whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsThemeOpen(true)} className="p-2 rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg text-white theme-bg-accent theme-shadow-accent">
                                <Palette className="w-4 h-4" />
                            </motion.button>
                            <motion.button whileHover={{ rotate: 180 }} whileTap={{ scale: 0.9 }} onClick={toggleDarkMode} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all">{isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}</motion.button>
                        </div>
                    </div>
                </motion.div>

                {isLoading ? (
                    <AnalyticsSkeleton isDarkMode={isDarkMode} />
                ) : activeTab === 'aging' ? (
                    <AgingRentalReport transactions={transactions} isDarkMode={isDarkMode} />
                ) : (
                    <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }} className="space-y-12">

                        {/* Executive Control Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-6 sm:gap-8 items-start">
                            <div className="xl:col-span-8 space-y-6 sm:space-y-8">
                                <ExecutivePalletSummary analysis={agingAnalysis} isDarkMode={isDarkMode} />
                                <NeoAIBriefing
                                    insight={smartInsight.text}
                                    onRefresh={() => { }}
                                    isDarkMode={isDarkMode}
                                    isRefreshing={false}
                                />
                            </div>
                            <div className="xl:col-span-4 h-full">
                                <BranchHealthRadarChart
                                    data={healthRadarData}
                                    title="📊 Health Index"
                                    isDarkMode={isDarkMode}
                                />
                            </div>
                        </div>

                        {/* Operational Pulse */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-6 sm:gap-8 items-stretch">
                            <div className="xl:col-span-5">
                                <HealthScoreCockpit
                                    performanceData={performanceData}
                                    isDarkMode={isDarkMode}
                                />
                            </div>
                            <div className="xl:col-span-7 grid grid-cols-1 xs:grid-cols-2 gap-4 sm:gap-6">
                                <ExecutivePillCard title="MAX POSSESSION" value={kpis.maxPossession} suffix="MAX" color="#f97316" isDarkMode={isDarkMode} trend={kpis.maxPossessionTrend} />
                                <ExecutivePillCard title="TOTAL ACTIVITY" value={kpis.totalActivity} suffix="VOL" color="#10b981" isDarkMode={isDarkMode} trend={kpis.totalActivityTrend} />
                                <div className="hidden xs:block col-span-2">
                                    <motion.div className={`h-full rounded-[2rem] sm:rounded-[3rem] border flex flex-col sm:flex-row items-center justify-between p-6 sm:p-8 gap-4 sm:gap-0 ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                                        <div className="flex items-center gap-4 sm:gap-6">
                                            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-indigo-500 shadow-xl shadow-indigo-500/20"><Activity className="w-6 h-6 sm:w-8 sm:h-8 text-white" /></div>
                                            <div>
                                                <p className={`text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>Operational State</p>
                                                <p className={`text-lg sm:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>High Velocity Mode</p>
                                            </div>
                                        </div>
                                        <div className="text-center sm:text-right">
                                            <p className="text-2xl sm:text-4xl font-black text-indigo-500">98.4%</p>
                                            <p className="text-[9px] sm:text-[10px] font-bold opacity-50 uppercase">Reliability Index</p>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </div>

                        {/* Date Selection & Breadcrumbs */}
                        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                            <DateRangeSelector selectedRange={filters.dateRange} startDate={filters.startDate} endDate={filters.endDate} onRangeChange={(range) => updateFilters({ dateRange: range })} onCustomDateChange={(start, end) => updateFilters({ startDate: start, endDate: end })} isDarkMode={isDarkMode} />
                            {drillStack.length > 0 && (
                                <div className={`flex items-center gap-2 p-1.5 px-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-600'} text-xs font-bold uppercase tracking-wider`}>
                                    <button onClick={() => handleBreadcrumbClick(-1)}>Global View</button>
                                    {drillStack.map((level: string, i: number) => (
                                        <React.Fragment key={i}>
                                            <ChevronRight className="w-4 h-4 opacity-50" />
                                            <button onClick={() => handleBreadcrumbClick(i)} className={`transition-colors duration-500 ${i === drillStack.length - 1 ? 'font-black theme-text-primary' : ''}`}>{level}</button>
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </motion.div>

                        {/* Enhanced KPI Row */}
                        <div data-pdf-export="kpis" className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 md:gap-6">
                            <EnhancedKPICard title="การเคลื่อนไหวรวม" value={kpis.totalTransactions} icon={<Activity />} trend={kpis.trend} trendValue={kpis.trendPercentage} sparklineData={last7DaysData} variant="primary" color={currentTheme.primary} isDarkMode={isDarkMode} delay={0.1} />
                            <EnhancedKPICard title="พาเลทในคลัง" value={kpis.totalPalletsInStock} suffix="ชิ้น" icon={<Package />} sparklineData={last7DaysData} variant="secondary" color={currentTheme.secondary} isDarkMode={isDarkMode} delay={0.2} />
                            <EnhancedKPICard title="ระหว่างทาง" value={kpis.totalPalletsInTransit} suffix="ชิ้น" icon={<Truck />} sparklineData={last7DaysData} variant="accent" color={currentTheme.accent} isDarkMode={isDarkMode} delay={0.3} />
                            <EnhancedKPICard title="ยอดรับรวม" value={kpis.totalIn} suffix="ชิ้น" icon={<ArrowDownCircle />} trend={kpis.totalInTrend >= 0 ? 'up' : 'down'} trendValue={kpis.totalInTrend} sparklineData={last7DaysIn} variant="success" color="#10b981" isDarkMode={isDarkMode} delay={0.35} />
                            <EnhancedKPICard title="ยอดจ่ายรวม" value={kpis.totalOut} suffix="ชิ้น" icon={<ArrowUpCircle />} trend={kpis.totalOutTrend >= 0 ? 'up' : 'down'} trendValue={kpis.totalOutTrend} sparklineData={last7DaysOut} variant="warning" color="#f59e0b" isDarkMode={isDarkMode} delay={0.4} />
                            <EnhancedKPICard title="อัตราหมุนเวียน" value={kpis.utilizationRate} suffix="%" icon={<TrendingUp />} sparklineData={last7DaysData} variant="primary" color="#6366f1" isDarkMode={isDarkMode} delay={0.45} />
                            <EnhancedKPICard title="เข้าซ่อมบำรุง" value={kpis.maintenanceRate} suffix="%" icon={<Wrench />} sparklineData={last7DaysData} variant="accent" color="#ec4899" isDarkMode={isDarkMode} delay={0.5} />
                        </div>

                        {/* Section 1: Logistics & Network */}
                        <AnalyticsSectionHeader
                            title="Logistics Flow & Network Intelligence"
                            subtitle="วิเคราะห์ประสิทธิภาพการขนส่งและความเสี่ยงพาร์ทเนอร์"
                            icon={Truck}
                            bgIcon={Activity}
                            isDarkMode={isDarkMode}
                            color="#3b82f6"
                        />

                        <div className="grid grid-cols-1 2xl:grid-cols-12 gap-8 items-start">
                            <div className="2xl:col-span-8">
                                <RechartsLineChart data={sevenDayPerformanceData} title="📅 Predictive Activity Trend" isDarkMode={isDarkMode} />
                            </div>
                            <div className="2xl:col-span-4 h-full">
                                <RiskMatrixScatterChart
                                    data={riskMatrixData}
                                    title="⚠️ Partner Asset Risk Matrix"
                                    isDarkMode={isDarkMode}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
                            <RechartsPieChart data={statusData} title="🧿 Network Status Distribution" isDarkMode={isDarkMode} onSegmentClick={handleChartClick} />
                            <RechartsPieChart data={centralizedReturnData} title="🔄 Hub Return Logic Analysis" isDarkMode={isDarkMode} />
                            <RechartsPieChart data={sinoAgingData} title="⏳ Sino Aging exposure" isDarkMode={isDarkMode} />
                        </div>

                        {/* Sankey Flow */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-8 h-8 text-emerald-500" />
                                <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Dynamic Pallet Flow Matrix (Sankey Flow)</h2>
                            </div>
                            <SankeyDiagram data={sankeyData} isDarkMode={isDarkMode} title="🔄 Network Transit Mapping" />
                        </div>

                        {/* Section 2: Inventory & Prevention */}
                        <AnalyticsSectionHeader
                            title="Inventory Control & Loss Prevention"
                            subtitle="การบริหารจัดการสต็อกและความเสี่ยงสินทรัพย์สูญหาย"
                            icon={Package}
                            bgIcon={Layers}
                            isDarkMode={isDarkMode}
                            color="#10b981"
                        />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div data-pdf-export="chart"><RechartsBarChart data={branchPerformance.map(b => ({ name: b.branchName, value: b.totalStock }))} title="🏢 Current Branch Possession" isDarkMode={isDarkMode} highlightedItem={highlightedItem} onBarClick={(item) => { handleChartClick(item); handleDrillDown(item.name); }} /></div>
                            <div data-pdf-export="chart"><RechartsBarChart data={palletAnalysis.map(p => ({ name: p.palletName, value: p.totalStock, color: palletColorsMapping[p.palletId] }))} title="🎨 Asset Composition Mix" isDarkMode={isDarkMode} onBarClick={handleChartClick} /></div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            <div className="lg:col-span-7">
                                <HeatmapCalendar data={heatmapData} title="🔥 Load Intensity Heatmap" isDarkMode={isDarkMode} />
                            </div>
                            <div className="lg:col-span-5 space-y-6">
                                <PredictiveStockAlerts predictions={stockDepletionPredictions} isDarkMode={isDarkMode} />
                                <WasteDamageAnalysis data={monthlyScrappedData} summary={{ sevenDays: scrapped7Days, mtd: scrappedMTD, ytd: scrappedYTD }} title="🗑️ Depreciation Trends" isDarkMode={isDarkMode} />
                            </div>
                        </div>

                        {/* Section 3: Financials */}
                        <AnalyticsSectionHeader
                            title="Cost Transparency & Financial Control"
                            subtitle="วิเคราะห์ค่าเช่าพาเลทและงบประมาณพันธมิตร"
                            icon={RefreshCw}
                            bgIcon={Download}
                            isDarkMode={isDarkMode}
                            color="#8b5cf6"
                        />

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            <div className="lg:col-span-8">
                                <LoscamRentalChart data={loscamRentalData} title="💰 Loscam Tiered Rental Analysis" isDarkMode={isDarkMode} />
                            </div>
                            <div className="lg:col-span-4">
                                <WaterfallChart data={waterfallData} title="📈 Flow-based Balance Adjustment" isDarkMode={isDarkMode} />
                            </div>
                        </div>

                        {/* Partner Analysis Section */}
                        <div className="space-y-6 pt-6">
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="w-8 h-8 text-indigo-500" />
                                    <h2 className={`text-lg sm:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Asset Liability</h2>
                                </div>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                                    <div className={`p-1 rounded-xl flex items-center ${isDarkMode ? 'bg-slate-900 border border-white/10' : 'bg-slate-100 shadow-inner'}`}>
                                        <button onClick={() => setPartnerRange('7d')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black tracking-tighter transition-all ${partnerRange === '7d' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-400'}`}>7 Days</button>
                                        <button onClick={() => setPartnerRange('all')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black tracking-tighter transition-all ${partnerRange === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-400'}`}>All History</button>
                                    </div>
                                    <select value={activePartnerId} onChange={(e) => setActivePartnerId(e.target.value)} title="เลือกพาร์ทเนอร์" className={`px-4 sm:px-6 py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black border-2 outline-none transition-all ${isDarkMode ? 'bg-slate-900 border-white/10 text-white focus:border-indigo-500' : 'bg-white border-slate-100 focus:border-indigo-500 shadow-xl'}`}>
                                        <option value="all">📊 Overall Network</option>
                                        {EXTERNAL_PARTNERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
                                <PartnerBalanceChart data={partnerBalanceData} title={activePartnerId === 'all' ? "🤝 Balance Flux" : `🤝 ${EXTERNAL_PARTNERS.find(p => p.id === activePartnerId)?.name}`} isDarkMode={isDarkMode} showOnlyBalance={activePartnerId === 'all'} />
                                <RechartsBarChart data={partnerSummaryData} title={activePartnerId === 'all' ? "📊 Net Liability" : `📊 Pallet Distribution`} isDarkMode={isDarkMode} />
                            </div>
                        </div>

                        {/* WoW Trends */}
                        <div className="grid grid-cols-1 gap-6 sm:gap-8">
                            <div className="flex items-center gap-3">
                                <Brain className="w-8 h-8 text-purple-500" />
                                <h2 className={`text-lg sm:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Statistical Forecast</h2>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                                <WoWComparisonChart data={wowData} title="📊 Trends (8 Weeks)" metric="รายการ" isDarkMode={isDarkMode} />
                                <ForecastChart historicalData={sevenDayPerformanceData.map(d => ({ date: d.date, value: d.total }))} title="🔮 Flow Forecast" isDarkMode={isDarkMode} forecastDays={7} />
                            </div>
                        </div>

                        <ActionableInsights kpis={kpis} branchPerformance={branchPerformance} palletAnalysis={palletAnalysis} isDarkMode={isDarkMode} />
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
