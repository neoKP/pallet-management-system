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
import { isSameDay } from 'date-fns';

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
import { Filter as FilterIcon } from 'lucide-react';

interface AnalyticsDashboardProps {
    transactions: Transaction[];
    stock: Stock;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
    transactions,
    stock,
}) => {
    const { filters, updateFilters, resetFilters, isDarkMode, toggleDarkMode } = useAnalyticsStore();
    const [isSlicerOpen, setIsSlicerOpen] = useState(false);
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

    // Premium Analytics Data
    const last7DaysData = useMemo(() => {
        const days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date;
        });

        return days.map(date =>
            slicerFilteredTransactions.filter((t: Transaction) =>
                isSameDay(new Date(t.date), date)
            ).length
        );
    }, [slicerFilteredTransactions]);

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

    const [highlightedItem, setHighlightedItem] = useState<string | null>(null);

    // Simulated "AI Insight" generation logic
    const smartInsight = useMemo(() => {
        const topBranch = branchPerformance[0];
        const topPallet = palletAnalysis[0];
        const trendDirection = kpis.trend === 'up' ? 'เพิ่มขึ้น' : 'ลดลง';

        return {
            text: `ปัจจุบันสาขา ${topBranch?.branchName || '-'} มีสต็อกสูงสุดที่ ${topBranch?.totalStock.toLocaleString()} พาเลท โดยประเภท ${topPallet?.palletName || '-'} เป็นประเภทที่นิยมที่สุด คิดเป็น ${(topPallet?.percentage || 0).toFixed(1)}% ของทั้งหมด กราฟสัปดาห์นี้แสดงแนวโน้ม${trendDirection} ${kpis.trendPercentage}% เมื่อเทียบกับช่วงก่อนหน้า`,
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

        // Optional: Also auto-filter after a short delay for BI feel
        const branch = BRANCHES.find(b => b.name === item.name);
        if (branch) {
            // updateFilters({ selectedBranches: [branch.id] });
        }
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
        <div className={`min-h-screen p-4 md:p-8 transition-colors duration-500 ${isDarkMode ? 'bg-slate-950 text-white font-sans' : 'bg-slate-50 text-slate-900 font-sans'}`}>
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
                >
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h1 className={`text-4xl font-extrabold tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                Premium <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">Analytics</span>
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
                        <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} onClick={() => setIsSlicerOpen(true)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${isDarkMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-indigo-500 text-white shadow-md'}`}>
                            <Filter className="w-3.5 h-3.5" />
                            Filters
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
                            className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'} relative overflow-hidden`}
                        >
                            <div className="absolute top-0 right-0 p-4">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white'}`}>AI Insight</span>
                            </div>
                            <div className="flex gap-4 items-start">
                                <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-500 text-white'}`}>
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div className="space-y-1 pr-20">
                                    <h4 className={`text-sm font-black ${isDarkMode ? 'text-indigo-300' : 'text-indigo-900'}`}>Smart Narrative</h4>
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
                                <div className={`flex items-center gap-2 p-1.5 px-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'} text-xs font-bold uppercase tracking-wider`}>
                                    <button onClick={() => handleBreadcrumbClick(-1)}>Global View</button>
                                    {drillStack.map((level, i) => (
                                        <React.Fragment key={i}>
                                            <ChevronRight className="w-4 h-4 opacity-50" />
                                            <button onClick={() => handleBreadcrumbClick(i)} className={i === drillStack.length - 1 ? 'text-indigo-500 font-black' : ''}>{level}</button>
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </motion.div>

                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                            <EnhancedKPICard title="รายการรวม" value={kpis.totalTransactions} icon={<Activity />} trend={kpis.trend} trendValue={kpis.trendPercentage} sparklineData={last7DaysData} color="#6366f1" isDarkMode={isDarkMode} delay={0.1} />
                            <EnhancedKPICard title="สต็อกปัจจุบัน" value={kpis.totalPalletsInStock} suffix="ชิ้น" icon={<Package />} sparklineData={last7DaysData} color="#8b5cf6" isDarkMode={isDarkMode} delay={0.2} />
                            <EnhancedKPICard title="ระหว่างขนส่ง" value={kpis.totalPalletsInTransit} suffix="ชิ้น" icon={<Truck />} sparklineData={last7DaysData} color="#3b82f6" isDarkMode={isDarkMode} delay={0.3} />
                            <EnhancedKPICard title="การใช้สอย" value={kpis.utilizationRate} suffix="%" icon={<TrendingUp />} sparklineData={last7DaysData} color="#10b981" isDarkMode={isDarkMode} delay={0.4} />
                            <EnhancedKPICard title="ซ่อมบำรุง" value={kpis.maintenanceRate} suffix="%" icon={<Wrench />} sparklineData={last7DaysData} color="#f59e0b" isDarkMode={isDarkMode} delay={0.5} />
                        </div>

                        {/* Main Interaction Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <RechartsLineChart data={timeSeriesData} title="📅 7-Day Performance Focus" isDarkMode={isDarkMode} />
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
        </div>
    );
};
