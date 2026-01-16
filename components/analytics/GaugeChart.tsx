import React from 'react';
import { motion } from 'framer-motion';

interface GaugeChartProps {
    value: number;
    max: number;
    title: string;
    subtitle?: string;
    color?: string;
    isDarkMode: boolean;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
    value,
    max,
    title,
    subtitle,
    color = '#6366f1',
    isDarkMode,
}) => {
    const percentage = Math.min((value / max) * 100, 100);
    const angle = (percentage / 100) * 180 - 90; // -90 to 90 degrees

    // Color based on percentage
    const getColor = () => {
        if (percentage >= 90) return '#10b981'; // Green
        if (percentage >= 70) return '#f59e0b'; // Amber
        if (percentage >= 50) return '#3b82f6'; // Blue
        return '#ef4444'; // Red
    };

    const gaugeColor = color || getColor();

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className={`
                relative p-6 rounded-xl
                ${isDarkMode
                    ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50'
                    : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
                }
                backdrop-blur-sm shadow-lg
            `}
        >
            {/* Title */}
            <div className="text-center mb-4">
                <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {title}
                </h3>
                {subtitle && (
                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Gauge SVG */}
            <div className="relative w-full aspect-square max-w-[200px] mx-auto">
                <svg viewBox="0 0 200 120" className="w-full h-full">
                    {/* Background Arc */}
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke={isDarkMode ? '#334155' : '#e5e7eb'}
                        strokeWidth="12"
                        strokeLinecap="round"
                    />

                    {/* Progress Arc */}
                    <motion.path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke={gaugeColor}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray="251.2"
                        initial={{ strokeDashoffset: 251.2 }}
                        animate={{ strokeDashoffset: 251.2 - (251.2 * percentage) / 100 }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                        style={{
                            filter: `drop-shadow(0 0 8px ${gaugeColor}40)`,
                        }}
                    />

                    {/* Center Circle */}
                    <circle
                        cx="100"
                        cy="100"
                        r="50"
                        fill={isDarkMode ? '#1e293b' : '#f8fafc'}
                        stroke={isDarkMode ? '#475569' : '#cbd5e1'}
                        strokeWidth="1"
                    />

                    {/* Needle */}
                    <motion.g
                        initial={{ rotate: -90 }}
                        animate={{ rotate: angle }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                        style={{ transformOrigin: '100px 100px' }}
                    >
                        <line
                            x1="100"
                            y1="100"
                            x2="100"
                            y2="55"
                            stroke={gaugeColor}
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                        <circle cx="100" cy="100" r="6" fill={gaugeColor} />
                    </motion.g>

                    {/* Value Text */}
                    <text
                        x="100"
                        y="90"
                        textAnchor="middle"
                        className={`text-3xl font-bold ${isDarkMode ? 'fill-white' : 'fill-gray-900'}`}
                    >
                        {Math.round(percentage)}%
                    </text>
                    <text
                        x="100"
                        y="105"
                        textAnchor="middle"
                        className={`text-xs ${isDarkMode ? 'fill-gray-400' : 'fill-gray-600'}`}
                    >
                        {value.toLocaleString()} / {max.toLocaleString()}
                    </text>
                </svg>
            </div>

            {/* Legend */}
            <div className="flex justify-between mt-4 text-xs">
                <span className={isDarkMode ? 'text-gray-500' : 'text-gray-600'}>0%</span>
                <span className={isDarkMode ? 'text-gray-500' : 'text-gray-600'}>50%</span>
                <span className={isDarkMode ? 'text-gray-500' : 'text-gray-600'}>100%</span>
            </div>

            {/* Status Badge */}
            <div className="mt-4 text-center">
                <span
                    className={`
                        inline-block px-3 py-1 rounded-full text-xs font-semibold
                        ${percentage >= 90
                            ? 'bg-green-500/20 text-green-400'
                            : percentage >= 70
                                ? 'bg-amber-500/20 text-amber-400'
                                : percentage >= 50
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-red-500/20 text-red-400'
                        }
                    `}
                >
                    {percentage >= 90
                        ? '🎯 Excellent'
                        : percentage >= 70
                            ? '✅ Good'
                            : percentage >= 50
                                ? '⚠️ Fair'
                                : '❌ Poor'
                    }
                </span>
            </div>
        </motion.div>
    );
};
