import React from 'react';
import { motion } from 'framer-motion';
import { Sparkline } from './Sparkline';

interface EnhancedKPICardProps {
    title: string;
    value: number | string;
    suffix?: string;
    icon: React.ReactNode;
    trend?: 'up' | 'down' | 'stable';
    trendValue?: number;
    sparklineData?: number[];
    color: string;
    isDarkMode: boolean;
    delay?: number;
    onClick?: () => void;
}

export const EnhancedKPICard: React.FC<EnhancedKPICardProps> = ({
    title,
    value,
    suffix,
    icon,
    trend,
    trendValue,
    sparklineData,
    color,
    isDarkMode,
    delay = 0,
    onClick,
}) => {
    const getTrendIcon = () => {
        if (trend === 'up') return '↑';
        if (trend === 'down') return '↓';
        return '→';
    };

    const getTrendColor = () => {
        if (trend === 'up') return isDarkMode ? '#10b981' : '#059669';
        if (trend === 'down') return isDarkMode ? '#ef4444' : '#dc2626';
        return isDarkMode ? '#64748b' : '#94a3b8';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            whileHover={{ scale: 1.02, y: -4 }}
            onClick={onClick}
            className={`
                relative p-6 rounded-xl overflow-hidden cursor-pointer
                ${isDarkMode
                    ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50'
                    : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
                }
                backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all
            `}
        >
            {/* Background Glow */}
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    background: `radial-gradient(circle at top right, ${color}, transparent 70%)`,
                } as React.CSSProperties}
            />

            {/* Header */}
            <div className="relative flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {title}
                    </h3>
                </div>
                <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className="p-3 rounded-lg"
                    style={{
                        backgroundColor: `${color}20`,
                        color,
                        boxShadow: `0 0 20px ${color}30`,
                    } as React.CSSProperties}
                >
                    {icon}
                </motion.div>
            </div>

            {/* Value */}
            <div className="relative mb-3">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: delay + 0.2, type: 'spring' }}
                    className="flex items-baseline gap-2"
                >
                    <span className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </span>
                    {suffix && (
                        <span className={`text-lg ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                            {suffix}
                        </span>
                    )}
                </motion.div>
            </div>

            {/* Sparkline */}
            {sparklineData && sparklineData.length > 0 && (
                <div className="relative mb-3 h-10">
                    <Sparkline
                        data={sparklineData}
                        color={color}
                        height={40}
                        isDarkMode={isDarkMode}
                    />
                </div>
            )}

            {/* Trend */}
            {trend && trendValue !== undefined && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: delay + 0.4 }}
                    className="relative flex items-center gap-2"
                >
                    <div
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                        style={{
                            backgroundColor: `${getTrendColor()}20`,
                            color: getTrendColor(),
                        } as React.CSSProperties}
                    >
                        <span>{getTrendIcon()}</span>
                        <span>{Math.abs(trendValue)}%</span>
                    </div>
                    <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                        vs last period
                    </span>
                </motion.div>
            )}

            {/* Glow Effect on Hover */}
            <div
                className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                    background: `radial-gradient(circle at center, ${color}10, transparent 70%)`,
                } as React.CSSProperties}
            />
        </motion.div>
    );
};
