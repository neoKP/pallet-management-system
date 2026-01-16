import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Transaction, Stock, BranchId, PalletId } from '../../types';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { KPICard } from './KPICard';
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
} from 'lucide-react';
import { BRANCHES, PALLET_TYPES } from '../../constants';

interface AnalyticsDashboardProps {
    transactions: Transaction[];
    stock: Stock;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
    transactions,
    stock,
}) => {
    const { filters, updateFilters, resetFilters, isDarkMode, toggleDarkMode } = useAnalyticsStore();

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

    // Calculate analytics data
    const kpis = useMemo(() =>
        calculateKPIs(transactions, stock, filters.startDate, filters.endDate),
        [transactions, stock, filters.startDate, filters.endDate]
    );

    const statusData = useMemo(() =>
        getStatusDistribution(transactions, filters.startDate, filters.endDate),
        [transactions, filters.startDate, filters.endDate]
    );

    const typeData = useMemo(() =>
        getTypeDistribution(transactions, filters.startDate, filters.endDate),
        [transactions, filters.startDate, filters.endDate]
    );

    const timeSeriesData = useMemo(() => {
        const groupBy = filters.dateRange === 'day' ? 'day' : filters.dateRange === 'week' ? 'week' : 'month';
        return getTimeSeriesData(transactions, filters.startDate, filters.endDate, groupBy);
    }, [transactions, filters.startDate, filters.endDate, filters.dateRange]);

    const branchPerformance = useMemo(() =>
        getBranchPerformance(transactions, stock, filters.startDate, filters.endDate, branchNames),
        [transactions, stock, filters.startDate, filters.endDate, branchNames]
    );

    const palletAnalysis = useMemo(() =>
        getPalletTypeAnalysis(transactions, stock, filters.startDate, filters.endDate, palletNames, palletColors),
        [transactions, stock, filters.startDate, filters.endDate, palletNames, palletColors]
    );

    // Cross-filtering handlers
    const handleChartClick = (item: ChartDataPoint) => {
        console.log('Chart clicked:', item);
        // TODO: Implement full cross-filtering
    };

    const handleExportPDF = () => {
        alert('ฟีเจอร์ Export PDF กำลังพัฒนา...');
    };

    const handleExportExcel = () => {
        alert('ฟีเจอร์ Export Excel กำลังพัฒนา...');
    };

    return (
        <div
            className={`min-h-screen transition-colors duration-500 ${isDarkMode
                    ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
                    : 'bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50'
                }`}
        >
            <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                    <div>
                        <h1
                            className={`text-4xl font-black mb-2 flex items-center gap-3 ${isDarkMode
                                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400'
                                    : 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600'
                                }`}
                        >
                            <Sparkles className="w-10 h-10 text-indigo-500" />
                            Analytics Dashboard
                        </h1>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Business Intelligence สำหรับระบบจัดการพาเลท • Real-time Analytics
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Export Buttons */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleExportPDF}
                            className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                transition-all duration-300
                ${isDarkMode
                                    ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm'
                                }
              `}
                        >
                            <Download className="w-4 h-4" />
                            PDF
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleExportExcel}
                            className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                transition-all duration-300
                ${isDarkMode
                                    ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm'
                                }
              `}
                        >
                            <Download className="w-4 h-4" />
                            Excel
                        </motion.button>

                        {/* Reset Filters */}
                        <motion.button
                            whileHover={{ scale: 1.05, rotate: 180 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={resetFilters}
                            className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                transition-all duration-300
                ${isDarkMode
                                    ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm'
                                }
              `}
                        >
                            <RefreshCw className="w-4 h-4" />
                            รีเซ็ต
                        </motion.button>

                        {/* Dark/Light Mode Toggle */}
                        <motion.button
                            whileHover={{ scale: 1.1, rotate: 15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={toggleDarkMode}
                            className={`
                p-3 rounded-lg transition-all duration-300
                ${isDarkMode
                                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                    : 'bg-indigo-500/20 text-indigo-600 hover:bg-indigo-500/30'
                                }
              `}
                        >
                            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </motion.button>
                    </div>
                </motion.div>

                {/* Date Range Selector */}
                <DateRangeSelector
                    selectedRange={filters.dateRange}
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                    onRangeChange={(range) => updateFilters({ dateRange: range })}
                    onCustomDateChange={(start, end) => updateFilters({ startDate: start, endDate: end })}
                    isDarkMode={isDarkMode}
                />

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard
                        title="รายการทั้งหมด"
                        value={kpis.totalTransactions}
                        icon={<Activity className="w-6 h-6" />}
                        trend={kpis.trend}
                        trendValue={kpis.trendPercentage}
                        color="#6366f1"
                        isDarkMode={isDarkMode}
                        delay={0}
                    />
                    <KPICard
                        title="พาเลทในสต็อก"
                        value={kpis.totalPalletsInStock}
                        icon={<Package className="w-6 h-6" />}
                        suffix="ชิ้น"
                        color="#8b5cf6"
                        isDarkMode={isDarkMode}
                        delay={100}
                    />
                    <KPICard
                        title="อัตราการใช้งาน"
                        value={kpis.utilizationRate}
                        icon={<TrendingUp className="w-6 h-6" />}
                        suffix="%"
                        color="#10b981"
                        isDarkMode={isDarkMode}
                        delay={200}
                    />
                    <KPICard
                        title="อัตราซ่อมบำรุง"
                        value={kpis.maintenanceRate}
                        icon={<Wrench className="w-6 h-6" />}
                        suffix="%"
                        color="#f59e0b"
                        isDarkMode={isDarkMode}
                        delay={300}
                    />
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RechartsLineChart
                        data={timeSeriesData}
                        title="📈 แนวโน้มการเคลื่อนไหว"
                        isDarkMode={isDarkMode}
                    />
                    <RechartsPieChart
                        data={statusData}
                        title="📊 สถานะรายการ"
                        isDarkMode={isDarkMode}
                        onSegmentClick={handleChartClick}
                    />
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RechartsBarChart
                        data={typeData}
                        title="📦 ประเภทรายการ"
                        isDarkMode={isDarkMode}
                        onBarClick={handleChartClick}
                    />
                    <RechartsBarChart
                        data={branchPerformance.map(b => ({
                            name: b.branchName,
                            value: b.totalStock,
                            color: b.color,
                        }))}
                        title="🏢 สต็อกตามสาขา"
                        isDarkMode={isDarkMode}
                        onBarClick={handleChartClick}
                    />
                </div>

                {/* Charts Row 3 */}
                <div className="grid grid-cols-1 gap-6">
                    <RechartsBarChart
                        data={palletAnalysis.map(p => ({
                            name: p.palletName,
                            value: p.totalStock,
                            color: p.color,
                        }))}
                        title="🎨 สต็อกตามประเภทพาเลท"
                        isDarkMode={isDarkMode}
                        onBarClick={handleChartClick}
                    />
                </div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className={`text-center text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
                >
                    <p>Powered by Neo Siam Logistics • Real-time Analytics Dashboard v1.0</p>
                </motion.div>
            </div>
        </div>
    );
};
