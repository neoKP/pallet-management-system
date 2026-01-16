import React, { useState } from 'react';
import { ChartDataPoint } from '../../services/analyticsService';

interface SimpleBarChartProps {
    data: ChartDataPoint[];
    title: string;
    isDarkMode: boolean;
    onBarClick?: (item: ChartDataPoint) => void;
    height?: number;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
    data,
    title,
    isDarkMode,
    onBarClick,
    height = 300,
}) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
        <div
            className={`
        rounded-2xl p-6
        ${isDarkMode
                    ? 'bg-white/5 backdrop-blur-xl border border-white/10'
                    : 'bg-white/80 backdrop-blur-xl border border-gray-200 shadow-lg'
                }
      `}
        >
            <h3 className={`text-lg font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {title}
            </h3>

            <div className="relative" style={{ height: `${height}px` } as React.CSSProperties}>
                <div className="flex items-end justify-around h-full gap-4">
                    {data.map((item, index) => {
                        const barHeight = (item.value / maxValue) * 100;
                        const isHovered = hoveredIndex === index;
                        const color = item.color || '#6366f1';

                        return (
                            <div
                                key={index}
                                className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                onClick={() => onBarClick?.(item)}
                            >
                                {/* Value Label */}
                                <div
                                    className={`
                                        text-sm font-bold transition-all duration-300
                                        ${isHovered ? 'scale-110' : 'scale-100'}
                                        ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}
                                    `}
                                >
                                    {item.value.toLocaleString()}
                                    {item.percentage && (
                                        <span className="text-xs ml-1">({item.percentage}%)</span>
                                    )}
                                </div>

                                {/* Bar */}
                                <div className="w-full relative">
                                    <div
                                        className={`
                                            w-full rounded-t-lg transition-all duration-500 ease-out
                                            ${isHovered ? 'opacity-100 scale-105' : 'opacity-90'}
                                            relative overflow-hidden
                                        `}
                                        style={{
                                            height: `${barHeight}%`,
                                            backgroundColor: color,
                                            boxShadow: isHovered
                                                ? `0 8px 24px ${color}40`
                                                : `0 4px 12px ${color}20`,
                                        } as React.CSSProperties}
                                    >
                                        {/* Shine Effect */}
                                        <div
                                            className={`
                                                absolute inset-0 opacity-0 group-hover:opacity-100
                                                transition-opacity duration-700
                                            `}
                                        >
                                            <div className="absolute inset-0 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-1000 bg-gradient-to-b from-transparent via-white/30 to-transparent" />
                                        </div>
                                    </div>
                                </div>

                                {/* Label */}
                                <div
                                    className={`
                    text-xs font-medium text-center mt-2
                    ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}
                    ${isHovered ? 'font-bold' : ''}
                  `}
                                >
                                    {item.name}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

interface SimplePieChartProps {
    data: ChartDataPoint[];
    title: string;
    isDarkMode: boolean;
    onSegmentClick?: (item: ChartDataPoint) => void;
}

export const SimplePieChart: React.FC<SimplePieChartProps> = ({
    data,
    title,
    isDarkMode,
    onSegmentClick,
}) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <div
            className={`
        rounded-2xl p-6
        ${isDarkMode
                    ? 'bg-white/5 backdrop-blur-xl border border-white/10'
                    : 'bg-white/80 backdrop-blur-xl border border-gray-200 shadow-lg'
                }
      `}
        >
            <h3 className={`text-lg font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {title}
            </h3>

            <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Donut Chart */}
                <div className="relative w-48 h-48">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90">
                        {data.map((item, index) => {
                            const percentage = (item.value / total) * 100;
                            const previousPercentages = data
                                .slice(0, index)
                                .reduce((sum, d) => sum + (d.value / total) * 100, 0);

                            const circumference = 2 * Math.PI * 40;
                            const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                            const strokeDashoffset = -((previousPercentages / 100) * circumference);
                            const isHovered = hoveredIndex === index;

                            return (
                                <circle
                                    key={index}
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="none"
                                    stroke={item.color || '#6366f1'}
                                    strokeWidth={isHovered ? "22" : "20"}
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                    className="transition-all duration-300 cursor-pointer"
                                    style={{
                                        filter: isHovered ? `drop-shadow(0 0 8px ${item.color})` : 'none',
                                    } as React.CSSProperties}
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    onClick={() => onSegmentClick?.(item)}
                                />
                            );
                        })}
                    </svg>

                    {/* Center Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {total.toLocaleString()}
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            ทั้งหมด
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-3">
                    {data.map((item, index) => {
                        const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                        const isHovered = hoveredIndex === index;

                        return (
                            <div
                                key={index}
                                className={`
                  flex items-center justify-between p-3 rounded-lg
                  transition-all duration-300 cursor-pointer
                  ${isHovered
                                        ? isDarkMode ? 'bg-white/10' : 'bg-gray-100'
                                        : isDarkMode ? 'bg-white/5' : 'bg-gray-50'
                                    }
                `}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                onClick={() => onSegmentClick?.(item)}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-4 h-4 rounded-full transition-transform duration-300"
                                        style={{
                                            backgroundColor: item.color,
                                            transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                                        } as React.CSSProperties}
                                    />
                                    <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {item.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {item.value.toLocaleString()}
                                    </span>
                                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        ({percentage}%)
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
