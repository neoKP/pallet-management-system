import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LabelList,
} from 'recharts';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { THEMES } from './ThemeEngine';

interface YoYData {
    year: number;
    value: number;
    color?: string;
}

interface YoYComparisonChartProps {
    data: YoYData[];
    title: string;
    metric: string;
    isDarkMode: boolean;
}

export const YoYComparisonChart: React.FC<YoYComparisonChartProps> = ({
    data,
    title,
    metric,
    isDarkMode,
}) => {
    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => a.year - b.year);
    }, [data]);

    const growthAnalysis = useMemo(() => {
        if (sortedData.length < 2) return null;

        const currentYear = sortedData[sortedData.length - 1];
        const previousYear = sortedData[sortedData.length - 2];

        const absoluteChange = currentYear.value - previousYear.value;
        const percentageChange = previousYear.value !== 0
            ? ((absoluteChange / previousYear.value) * 100)
            : 0;

        const trend: 'up' | 'down' | 'stable' =
            percentageChange > 2 ? 'up' :
                percentageChange < -2 ? 'down' : 'stable';

        // Calculate CAGR for multi-year data
        let cagr = 0;
        if (sortedData.length >= 2) {
            const firstYear = sortedData[0];
            const lastYear = sortedData[sortedData.length - 1];
            const years = lastYear.year - firstYear.year;
            if (years > 0 && firstYear.value > 0) {
                cagr = (Math.pow(lastYear.value / firstYear.value, 1 / years) - 1) * 100;
            }
        }

        return {
            currentYear: currentYear.year,
            previousYear: previousYear.year,
            currentValue: currentYear.value,
            previousValue: previousYear.value,
            absoluteChange,
            percentageChange,
            trend,
            cagr,
        };
    }, [sortedData]);

    const { themeColor } = useAnalyticsStore();
    const currentTheme = THEMES.find(t => t.id === themeColor) || THEMES[0];
    const maxValue = Math.max(...sortedData.map(d => d.value));

    const getBarColor = (index: number) => {
        const colors = ['#64748b', '#94a3b8', currentTheme.primary, currentTheme.secondary];
        return sortedData[index]?.color || colors[index % colors.length];
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`
                        px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md
                        ${isDarkMode ? 'bg-slate-900/95 border-white/20' : 'bg-white/95 border-gray-200'}
                    `}
                >
                    <p className={`font-black text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {data.year}
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {metric}: <span className="font-bold text-indigo-500">{data.value.toLocaleString()}</span>
                    </p>
                </motion.div>
            );
        }
        return null;
    };

    const getTrendIcon = () => {
        if (!growthAnalysis) return null;
        switch (growthAnalysis.trend) {
            case 'up':
                return <TrendingUp className="w-5 h-5 text-green-500" />;
            case 'down':
                return <TrendingDown className="w-5 h-5 text-red-500" />;
            default:
                return <Minus className="w-5 h-5 text-yellow-500" />;
        }
    };

    const getTrendColor = () => {
        if (!growthAnalysis) return 'text-gray-500';
        switch (growthAnalysis.trend) {
            case 'up':
                return 'text-green-500';
            case 'down':
                return 'text-red-500';
            default:
                return 'text-yellow-500';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                rounded-2xl p-6 relative overflow-hidden
                ${isDarkMode
                    ? 'bg-gradient-to-br from-slate-900/60 to-indigo-950/30 border border-indigo-500/20'
                    : 'bg-gradient-to-br from-white to-indigo-50 border border-indigo-200 shadow-lg'
                }
            `}
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                        <Calendar className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                        <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {title}
                        </h3>
                        <p className={`text-xs ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                            📊 เปรียบเทียบ {sortedData.length} ปี
                        </p>
                    </div>
                </div>

                {/* Growth Badge */}
                {growthAnalysis && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className={`
                            flex items-center gap-4 px-4 py-2 rounded-xl
                            ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-indigo-50 border border-indigo-100'}
                        `}
                    >
                        <div className="flex items-center gap-2">
                            {getTrendIcon()}
                            <div>
                                <p className={`text-[10px] font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                    YoY Growth
                                </p>
                                <p className={`text-lg font-black ${getTrendColor()}`}>
                                    {growthAnalysis.percentageChange > 0 ? '+' : ''}
                                    {growthAnalysis.percentageChange.toFixed(1)}%
                                </p>
                            </div>
                        </div>
                        <div className={`w-px h-10 ${isDarkMode ? 'bg-white/10' : 'bg-indigo-200'}`} />
                        <div>
                            <p className={`text-[10px] font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                CAGR
                            </p>
                            <p className={`text-lg font-black ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                {growthAnalysis.cagr > 0 ? '+' : ''}{growthAnalysis.cagr.toFixed(1)}%
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={280}>
                <BarChart
                    data={sortedData}
                    layout="vertical"
                    margin={{ top: 10, right: 60, left: 20, bottom: 10 }}
                >
                    <CartesianGrid
                        horizontal={false}
                        strokeDasharray="3 3"
                        stroke={isDarkMode ? '#ffffff08' : '#00000008'}
                    />
                    <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        stroke={isDarkMode ? '#64748b' : '#94a3b8'}
                        tick={{ fill: isDarkMode ? '#64748b' : '#64748b', fontSize: 11 }}
                        domain={[0, maxValue * 1.2]}
                    />
                    <YAxis
                        type="category"
                        dataKey="year"
                        axisLine={false}
                        tickLine={false}
                        stroke={isDarkMode ? '#64748b' : '#94a3b8'}
                        tick={{ fill: isDarkMode ? '#a5b4fc' : '#4f46e5', fontSize: 14, fontWeight: 'bold' }}
                        width={50}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: isDarkMode ? 'white' : 'black', fillOpacity: 0.03 }} />
                    <Bar
                        dataKey="value"
                        radius={[0, 12, 12, 0]}
                        animationDuration={1500}
                        animationEasing="ease-out"
                    >
                        {sortedData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={getBarColor(index)}
                                className="transition-all duration-300 hover:opacity-80 hover:brightness-125 cursor-pointer"
                                style={{
                                    filter: `drop-shadow(0 4px 6px ${getBarColor(index)}40)`
                                }}
                            />
                        ))}
                        <LabelList
                            dataKey="value"
                            position="right"
                            fontSize={12}
                            fontWeight={900}
                            formatter={(val: any) => val ? val.toLocaleString() : ''}
                            fill={isDarkMode ? '#e2e8f0' : '#334155'}
                            className="drop-shadow-sm"
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Comparison Summary */}
            {growthAnalysis && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className={`
                        mt-4 p-4 rounded-xl grid grid-cols-3 gap-4
                        ${isDarkMode ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-100'}
                    `}
                >
                    <div className="text-center">
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            ปี {growthAnalysis.previousYear}
                        </p>
                        <p className={`text-xl font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {growthAnalysis.previousValue.toLocaleString()}
                        </p>
                    </div>
                    <div className="text-center flex flex-col items-center justify-center">
                        <div className={`
                            flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold
                            ${growthAnalysis.trend === 'up'
                                ? 'bg-green-500/20 text-green-500'
                                : growthAnalysis.trend === 'down'
                                    ? 'bg-red-500/20 text-red-500'
                                    : 'bg-yellow-500/20 text-yellow-500'
                            }
                        `}>
                            {growthAnalysis.absoluteChange > 0 ? '+' : ''}
                            {growthAnalysis.absoluteChange.toLocaleString()}
                        </div>
                    </div>
                    <div className="text-center">
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            ปี {growthAnalysis.currentYear}
                        </p>
                        <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {growthAnalysis.currentValue.toLocaleString()}
                        </p>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default YoYComparisonChart;
