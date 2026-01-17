import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3, ArrowRight } from 'lucide-react';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { THEMES } from './ThemeEngine';

interface WoWDataPoint {
    weekLabel: string;
    weekStart: string;
    value: number;
    color?: string;
}

interface WoWComparisonChartProps {
    data: WoWDataPoint[];
    title: string;
    metric?: string;
    isDarkMode: boolean;
}

export const WoWComparisonChart: React.FC<WoWComparisonChartProps> = ({
    data,
    title,
    metric = 'รายการ',
    isDarkMode,
}) => {
    // Calculate insights from real data
    const insights = useMemo(() => {
        if (data.length < 2) return null;

        const currentWeek = data[data.length - 1];
        const lastWeek = data[data.length - 2];

        const absoluteChange = currentWeek.value - lastWeek.value;
        const percentChange = lastWeek.value > 0
            ? ((absoluteChange / lastWeek.value) * 100)
            : 0;

        // Calculate average across all weeks
        const totalValue = data.reduce((sum, d) => sum + d.value, 0);
        const average = totalValue / data.length;

        // Find best and worst weeks
        const maxWeek = data.reduce((max, d) => d.value > max.value ? d : max, data[0]);
        const minWeek = data.reduce((min, d) => d.value < min.value ? d : min, data[0]);

        return {
            currentWeek: currentWeek.value,
            lastWeek: lastWeek.value,
            absoluteChange,
            percentChange,
            average: Math.round(average),
            maxWeek,
            minWeek,
            trend: absoluteChange > 0 ? 'up' : absoluteChange < 0 ? 'down' : 'neutral',
        };
    }, [data]);

    const { themeColor } = useAnalyticsStore();
    const currentTheme = THEMES.find(t => t.id === themeColor) || THEMES[0];
    const maxValue = Math.max(...data.map(d => d.value), 1);

    // Get week color based on position
    const getWeekColor = (index: number, total: number) => {
        const colors = [
            '#64748b', // oldest - gray
            '#6b7280',
            '#78716c',
            '#84cc16', // middle - lime
            '#22c55e',
            '#14b8a6', // teal
            '#06b6d4', // cyan
            currentTheme.primary, // newest - theme primary
        ];
        const colorIndex = Math.min(index, colors.length - 1);
        return colors[colorIndex] || currentTheme.primary;
    };

    if (data.length < 2) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white border-gray-200'}`}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-cyan-500/20' : 'bg-cyan-100'}`}>
                        <Calendar className="w-5 h-5 text-cyan-500" />
                    </div>
                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {title}
                    </h3>
                </div>
                <div className="flex items-center justify-center py-8">
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        📊 ต้องมีข้อมูลอย่างน้อย 2 สัปดาห์เพื่อแสดง Week-over-Week
                    </p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-2xl border relative overflow-hidden ${isDarkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white border-gray-200'}`}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-cyan-500/20' : 'bg-cyan-100'}`}>
                        <BarChart3 className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div>
                        <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {title}
                        </h3>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {data.length} สัปดาห์ล่าสุด • ข้อมูลจริง
                        </p>
                    </div>
                </div>

                {/* WoW Change Badge */}
                {insights && (
                    <div className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold
                        ${insights.trend === 'up'
                            ? 'bg-green-500/20 text-green-500'
                            : insights.trend === 'down'
                                ? 'bg-red-500/20 text-red-500'
                                : 'bg-gray-500/20 text-gray-500'
                        }
                    `}>
                        {insights.trend === 'up' ? <TrendingUp className="w-4 h-4" /> :
                            insights.trend === 'down' ? <TrendingDown className="w-4 h-4" /> :
                                <Minus className="w-4 h-4" />}
                        <span>
                            {insights.percentChange > 0 ? '+' : ''}{insights.percentChange.toFixed(1)}%
                        </span>
                    </div>
                )}
            </div>

            {/* Chart - Vertical List with Hover Effects */}
            <div className="space-y-3 mb-6">
                {data.map((week, index) => {
                    const isCurrentWeek = index === data.length - 1;
                    const prevWeekValue = index > 0 ? data[index - 1].value : 0;
                    const change = index > 0 ? week.value - prevWeekValue : 0;
                    const percentChange = index > 0 && prevWeekValue > 0 ? (change / prevWeekValue) * 100 : 0;

                    const barWidth = (week.value / maxValue) * 100;
                    const color = week.color || getWeekColor(index, data.length);

                    return (
                        <motion.div
                            key={week.weekLabel}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover="hover"
                            className="relative"
                        >
                            <motion.div
                                layout
                                variants={{
                                    hover: {
                                        scale: 1.02,
                                        x: 10,
                                        backgroundColor: isDarkMode ? "rgba(30, 41, 59, 0.9)" : "rgba(255, 255, 255, 0.9)",
                                        borderColor: color,
                                    }
                                }}
                                className={`
                                    flex flex-col p-3 rounded-xl border border-transparent transition-colors duration-200 cursor-pointer overflow-hidden
                                    ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}
                                `}
                                style={{
                                    // @ts-ignore
                                    '--neon-color': color
                                }}
                            >
                                {/* Neon Border Glow on Hover */}
                                <motion.div
                                    className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 pointer-events-none"
                                    variants={{ hover: { opacity: 1 } }}
                                    style={{
                                        boxShadow: `inset 0 0 10px ${color}40, 0 0 15px ${color}20`
                                    }}
                                />

                                <div className="flex items-center gap-4 relative z-10 w-full">
                                    {/* Week Label */}
                                    <div className="w-24 flex-shrink-0">
                                        <span className={`
                                            text-sm font-bold transition-colors duration-300
                                            ${isCurrentWeek
                                                ? 'text-cyan-500'
                                                : isDarkMode ? 'text-slate-400' : 'text-slate-600'
                                            }
                                        `}>
                                            {week.weekLabel}
                                            {isCurrentWeek && (
                                                <motion.span
                                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                                    transition={{ repeat: Infinity, duration: 2 }}
                                                    className="ml-1 text-[10px] bg-cyan-500/20 text-cyan-500 px-1.5 py-0.5 rounded-full"
                                                >
                                                    Live
                                                </motion.span>
                                            )}
                                        </span>
                                    </div>

                                    {/* Bar Section */}
                                    <div className="flex-1">
                                        <div className={`h-10 rounded-xl overflow-hidden ${isDarkMode ? 'bg-black/20' : 'bg-gray-200/50'} relative`}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${barWidth}%` }}
                                                transition={{ duration: 0.8, delay: index * 0.05, type: 'spring' }}
                                                className="h-full rounded-xl relative shadow-lg flex items-center justify-end pr-3"
                                                style={{
                                                    backgroundColor: color,
                                                    boxShadow: isCurrentWeek ? `0 0 15px ${color}60` : 'none'
                                                }}
                                            >
                                                {/* Animated Scanline inside bar */}
                                                <motion.div
                                                    className="absolute inset-0 bg-white/20"
                                                    animate={{ x: ['-100%', '100%'] }}
                                                    transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatDelay: 1 }}
                                                />

                                                {/* Value inside bar if wide enough */}
                                                {barWidth > 20 && (
                                                    <span className="text-white text-xs font-black drop-shadow-md z-10">
                                                        {week.value.toLocaleString()}
                                                    </span>
                                                )}
                                            </motion.div>
                                        </div>
                                    </div>

                                    {/* Value outside if bar is small */}
                                    {barWidth <= 20 && (
                                        <span className={`w-12 text-right text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {week.value.toLocaleString()}
                                        </span>
                                    )}
                                </div>

                                {/* Hover Reveal Section: Extra Details */}
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    variants={{
                                        hover: { height: 'auto', opacity: 1, marginTop: 12 }
                                    }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex items-center justify-between text-xs pt-2 border-t border-dashed border-gray-500/30">
                                        <div className="flex items-center gap-2">
                                            <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>vs Prev Week:</span>
                                            <span className={`font-bold flex items-center gap-1 ${change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                                {change > 0 ? <TrendingUp size={12} /> : change < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                                                {change > 0 ? '+' : ''}{percentChange.toFixed(1)}% ({change > 0 ? '+' : ''}{change})
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-cyan-500 cursor-pointer hover:underline">
                                            <span>View Report</span>
                                            <ArrowRight size={12} />
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Insights Footer */}
            {insights && (
                <div className={`
                    grid grid-cols-4 gap-4 pt-4 border-t
                    ${isDarkMode ? 'border-white/10' : 'border-gray-200'}
                `}>
                    <div className="text-center">
                        <p className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {insights.currentWeek.toLocaleString()}
                        </p>
                        <p className={`text-[10px] font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            สัปดาห์นี้
                        </p>
                    </div>
                    <div className="text-center">
                        <p className={`text-lg font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {insights.lastWeek.toLocaleString()}
                        </p>
                        <p className={`text-[10px] font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            สัปดาห์ที่แล้ว
                        </p>
                    </div>
                    <div className="text-center">
                        <p className={`text-lg font-black ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                            {insights.average.toLocaleString()}
                        </p>
                        <p className={`text-[10px] font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            เฉลี่ย/สัปดาห์
                        </p>
                    </div>
                    <div className="text-center">
                        <p className={`text-lg font-black ${insights.absoluteChange > 0 ? 'text-green-500' :
                            insights.absoluteChange < 0 ? 'text-red-500' : 'text-gray-500'
                            }`}>
                            {insights.absoluteChange > 0 ? '+' : ''}{insights.absoluteChange.toLocaleString()}
                        </p>
                        <p className={`text-[10px] font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            เปลี่ยนแปลง
                        </p>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default WoWComparisonChart;
