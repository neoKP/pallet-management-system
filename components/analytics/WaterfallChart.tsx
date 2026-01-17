import React from 'react';
import { motion } from 'framer-motion';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { THEMES } from './ThemeEngine';

interface WaterfallDataPoint {
    label: string;
    value: number;
    isTotal?: boolean;
}

interface WaterfallChartProps {
    data: WaterfallDataPoint[];
    title: string;
    isDarkMode: boolean;
}

export const WaterfallChart: React.FC<WaterfallChartProps> = ({
    data,
    title,
    isDarkMode,
}) => {
    const { themeColor } = useAnalyticsStore();
    const currentTheme = THEMES.find(t => t.id === themeColor) || THEMES[0];

    // Calculate cumulative values
    let cumulative = 0;
    const chartData = data.map((item, index) => {
        const start = cumulative;
        cumulative += item.value;
        const end = cumulative;

        return {
            ...item,
            start,
            end,
            isPositive: item.value >= 0,
        };
    });

    const maxValue = Math.max(...chartData.map(d => Math.max(Math.abs(d.start), Math.abs(d.end))));
    const chartHeight = 300;
    const barWidth = 60;
    const gap = 20;

    const getY = (value: number) => {
        return chartHeight - ((value + maxValue) / (maxValue * 2)) * chartHeight;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`
                p-6 rounded-xl
                ${isDarkMode
                    ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50'
                    : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
                }
                backdrop-blur-sm shadow-lg
            `}
        >
            {/* Title */}
            <h3 className={`text-lg font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {title}
            </h3>

            {/* Chart */}
            <div className="overflow-x-auto">
                <svg
                    width={data.length * (barWidth + gap) + gap}
                    height={chartHeight + 60}
                    className="mx-auto"
                >
                    {/* Zero Line */}
                    <line
                        x1="0"
                        y1={getY(0)}
                        x2={data.length * (barWidth + gap) + gap}
                        y2={getY(0)}
                        stroke={isDarkMode ? '#475569' : '#cbd5e1'}
                        strokeWidth="1"
                        strokeDasharray="4 4"
                    />

                    {chartData.map((item, index) => {
                        const x = gap + index * (barWidth + gap);
                        const barStart = Math.min(item.start, item.end);
                        const barEnd = Math.max(item.start, item.end);
                        const barHeight = Math.abs(getY(barEnd) - getY(barStart));
                        const barY = getY(barEnd);

                        const color = item.isTotal
                            ? currentTheme.primary
                            : item.isPositive
                                ? isDarkMode ? '#10b981' : '#059669'
                                : isDarkMode ? '#ef4444' : '#dc2626';

                        return (
                            <g key={index}>
                                {/* Connector Line */}
                                {index > 0 && !item.isTotal && (
                                    <motion.line
                                        x1={x - gap}
                                        y1={getY(chartData[index - 1].end)}
                                        x2={x}
                                        y2={getY(item.start)}
                                        stroke={isDarkMode ? '#64748b' : '#94a3b8'}
                                        strokeWidth="2"
                                        strokeDasharray="4 4"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ delay: index * 0.1, duration: 0.3 }}
                                    />
                                )}

                                {/* Bar */}
                                <motion.rect
                                    x={x}
                                    y={barY}
                                    width={barWidth}
                                    height={barHeight}
                                    fill={color}
                                    rx="6"
                                    initial={{ scaleY: 0, opacity: 0 }}
                                    animate={{ scaleY: 1, opacity: 1 }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 100,
                                        damping: 15,
                                        delay: index * 0.1
                                    }}
                                    whileHover={{
                                        scale: 1.05,
                                        filter: `drop-shadow(0 0 12px ${color}) brightness(1.2)`,
                                    }}
                                    style={{
                                        transformOrigin: `${x + barWidth / 2}px ${getY(item.start)}px`,
                                        cursor: 'pointer'
                                    }}
                                />

                                {/* Value Label */}
                                <motion.text
                                    x={x + barWidth / 2}
                                    y={barY - 12}
                                    textAnchor="middle"
                                    className={`text-xs font-bold ${isDarkMode ? 'fill-white' : 'fill-gray-900'}`}
                                    initial={{ opacity: 0, y: barY }}
                                    animate={{ opacity: 1, y: barY - 12 }}
                                    transition={{ delay: index * 0.1 + 0.4 }}
                                >
                                    {item.value > 0 ? '+' : ''}{item.value.toLocaleString()}
                                </motion.text>

                                {/* Label */}
                                <text
                                    x={x + barWidth / 2}
                                    y={chartHeight + 25}
                                    textAnchor="middle"
                                    className={`text-[10px] font-medium uppercase tracking-wider ${isDarkMode ? 'fill-gray-400' : 'fill-gray-600'}`}
                                >
                                    {item.label}
                                </text>

                                {/* Total Value (for total bars) */}
                                {item.isTotal && (
                                    <motion.text
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.1 + 0.5 }}
                                        x={x + barWidth / 2}
                                        y={chartHeight + 45}
                                        textAnchor="middle"
                                        className={`text-sm font-black ${isDarkMode ? 'fill-purple-400' : 'fill-purple-600'}`}
                                    >
                                        {item.end.toLocaleString()}
                                    </motion.text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500" />
                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Increase
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500" />
                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Decrease
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-purple-500" />
                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Total
                    </span>
                </div>
            </div>
        </motion.div>
    );
};
