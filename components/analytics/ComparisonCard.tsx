import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComparisonCardProps {
    title: string;
    currentValue: number;
    previousValue: number;
    currentLabel?: string;
    previousLabel?: string;
    suffix?: string;
    icon?: React.ReactNode;
    color?: string;
    isDarkMode: boolean;
}

export const ComparisonCard: React.FC<ComparisonCardProps> = ({
    title,
    currentValue,
    previousValue,
    currentLabel = 'Current',
    previousLabel = 'Previous',
    suffix = '',
    icon,
    color = '#6366f1',
    isDarkMode,
}) => {
    const difference = currentValue - previousValue;
    const percentageChange = previousValue !== 0
        ? ((difference / previousValue) * 100)
        : 0;

    const isPositive = difference > 0;
    const isNeutral = difference === 0;

    const getTrendIcon = () => {
        if (isNeutral) return <Minus className="w-4 h-4" />;
        return isPositive
            ? <TrendingUp className="w-4 h-4" />
            : <TrendingDown className="w-4 h-4" />;
    };

    const getTrendColor = () => {
        if (isNeutral) return isDarkMode ? '#64748b' : '#94a3b8';
        return isPositive
            ? isDarkMode ? '#10b981' : '#059669'
            : isDarkMode ? '#ef4444' : '#dc2626';
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className={`
                relative p-6 rounded-xl overflow-hidden
                ${isDarkMode
                    ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50'
                    : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
                }
                backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow
            `}
        >
            {/* Background Gradient */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    background: `radial-gradient(circle at top right, ${color}, transparent)`,
                } as React.CSSProperties}
            />

            {/* Header */}
            <div className="relative flex items-start justify-between mb-4">
                <div>
                    <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {title}
                    </h3>
                </div>
                {icon && (
                    <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${color}20`, color } as React.CSSProperties}
                    >
                        {icon}
                    </div>
                )}
            </div>

            {/* Current Value */}
            <div className="relative mb-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-baseline gap-2"
                >
                    <span className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {currentValue.toLocaleString()}
                    </span>
                    {suffix && (
                        <span className={`text-lg ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                            {suffix}
                        </span>
                    )}
                </motion.div>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                    {currentLabel}
                </p>
            </div>

            {/* Comparison */}
            <div className="relative space-y-3">
                {/* Previous Value */}
                <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {previousLabel}
                    </span>
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {previousValue.toLocaleString()} {suffix}
                    </span>
                </div>

                {/* Divider */}
                <div className={`h-px ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`} />

                {/* Change */}
                <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Change
                    </span>
                    <div className="flex items-center gap-2">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.4, type: 'spring' }}
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                            style={{
                                backgroundColor: `${getTrendColor()}20`,
                                color: getTrendColor(),
                            } as React.CSSProperties}
                        >
                            {getTrendIcon()}
                            <span>
                                {difference > 0 ? '+' : ''}{difference.toLocaleString()} {suffix}
                            </span>
                        </motion.div>
                    </div>
                </div>

                {/* Percentage */}
                <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Percentage
                    </span>
                    <span
                        className="text-sm font-bold"
                        style={{ color: getTrendColor() } as React.CSSProperties}
                    >
                        {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                    </span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="relative mt-4">
                <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                    <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color } as React.CSSProperties}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((currentValue / (currentValue + previousValue)) * 100, 100)}%` }}
                        transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
                    />
                </div>
                <div className="flex justify-between mt-1 text-xs">
                    <span className={isDarkMode ? 'text-gray-500' : 'text-gray-600'}>
                        0
                    </span>
                    <span className={isDarkMode ? 'text-gray-500' : 'text-gray-600'}>
                        {(currentValue + previousValue).toLocaleString()}
                    </span>
                </div>
            </div>
        </motion.div>
    );
};
