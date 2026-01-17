import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';

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
    const [isHovering, setIsHovering] = useState(false);

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

    // Get performance insight
    const getInsight = () => {
        if (isNeutral) return { emoji: '➡️', text: 'ไม่เปลี่ยนแปลง' };
        if (percentageChange > 20) return { emoji: '🚀', text: 'เติบโตมาก!' };
        if (percentageChange > 0) return { emoji: '📈', text: 'เติบโตดี' };
        if (percentageChange > -10) return { emoji: '📉', text: 'ลดลงเล็กน้อย' };
        return { emoji: '⚠️', text: 'ต้องปรับปรุง' };
    };

    const insight = getInsight();

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className={`
                relative p-6 rounded-xl overflow-hidden transition-all duration-500
                ${isDarkMode
                    ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50'
                    : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
                }
                backdrop-blur-sm shadow-lg
                ${isHovering ? 'shadow-2xl scale-[1.02]' : ''}
            `}
            style={{
                boxShadow: isHovering ? `0 20px 40px ${color}20` : undefined
            }}
        >
            {/* Animated Background Gradient */}
            <motion.div
                className="absolute inset-0 opacity-5"
                animate={{
                    background: isHovering
                        ? `radial-gradient(circle at 80% 20%, ${color}, transparent 50%)`
                        : `radial-gradient(circle at top right, ${color}, transparent)`
                }}
                transition={{ duration: 0.5 }}
            />

            {/* Sparkle effect on hover */}
            <AnimatePresence>
                {isHovering && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-4 right-4"
                    >
                        <Sparkles className="w-4 h-4" style={{ color }} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header with enhanced icon */}
            <div className="relative flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {title}
                        </h3>
                        <AnimatePresence>
                            {isHovering && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    className="text-xs px-2 py-0.5 rounded-full"
                                    style={{
                                        backgroundColor: `${color}20`,
                                        color
                                    }}
                                >
                                    Realtime
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                {icon && (
                    <motion.div
                        animate={{
                            scale: isHovering ? 1.1 : 1,
                            rotate: isHovering ? 5 : 0
                        }}
                        transition={{ duration: 0.3 }}
                        className="p-2 rounded-lg transition-all duration-300"
                        style={{
                            backgroundColor: `${color}${isHovering ? '30' : '20'}`,
                            color,
                            boxShadow: isHovering ? `0 0 20px ${color}40` : 'none'
                        }}
                    >
                        {icon}
                    </motion.div>
                )}
            </div>

            {/* Current Value with animation */}
            <div className="relative mb-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-baseline gap-2"
                >
                    <motion.span
                        className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                        animate={{ fontSize: isHovering ? '2.25rem' : '1.875rem' }}
                        transition={{ duration: 0.3 }}
                    >
                        {currentValue.toLocaleString()}
                    </motion.span>
                    {suffix && (
                        <span className={`text-lg ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                            {suffix}
                        </span>
                    )}
                </motion.div>
                <div className="flex items-center gap-2">
                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                        {currentLabel}
                    </p>
                    {/* Quick insight on hover */}
                    <AnimatePresence>
                        {isHovering && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}
                            >
                                {insight.emoji} {insight.text}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Comparison with animations */}
            <div className="relative space-y-3">
                {/* Previous Value with hover highlight */}
                <motion.div
                    className={`flex items-center justify-between p-2 -mx-2 rounded-lg transition-all ${isHovering ? (isDarkMode ? 'bg-white/5' : 'bg-gray-50') : ''
                        }`}
                >
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {previousLabel}
                    </span>
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {previousValue.toLocaleString()} {suffix}
                    </span>
                </motion.div>

                {/* Divider with animation */}
                <motion.div
                    className={`h-px ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}
                    animate={{ scaleX: isHovering ? 1.05 : 1 }}
                    style={{ originX: 0 }}
                />

                {/* Change with enhanced badge */}
                <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Change
                    </span>
                    <div className="flex items-center gap-2">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                            transition={{ delay: 0.4, type: 'spring' }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
                            style={{
                                backgroundColor: `${getTrendColor()}20`,
                                color: getTrendColor(),
                                boxShadow: isHovering ? `0 0 15px ${getTrendColor()}30` : 'none'
                            }}
                        >
                            <motion.span
                                animate={{
                                    y: isHovering ? [0, -2, 0] : 0
                                }}
                                transition={{ duration: 0.5, repeat: isHovering ? Infinity : 0 }}
                            >
                                {getTrendIcon()}
                            </motion.span>
                            <span>
                                {difference > 0 ? '+' : ''}{difference.toLocaleString()} {suffix}
                            </span>
                        </motion.div>
                    </div>
                </div>

                {/* Percentage with animation */}
                <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Percentage
                    </span>
                    <motion.span
                        className="text-sm font-bold"
                        style={{ color: getTrendColor() }}
                        animate={{
                            scale: isHovering ? [1, 1.1, 1] : 1
                        }}
                        transition={{ duration: 0.5 }}
                    >
                        {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                    </motion.span>
                </div>
            </div>

            {/* Enhanced Progress Bar with glow */}
            <div className="relative mt-4">
                <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                    <motion.div
                        className="h-full rounded-full relative"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((currentValue / (currentValue + previousValue)) * 100, 100)}%` }}
                        transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
                    >
                        {/* Animated shimmer on hover */}
                        {isHovering && (
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                initial={{ x: '-100%' }}
                                animate={{ x: '200%' }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            />
                        )}
                    </motion.div>
                </div>
                <div className="flex justify-between mt-1 text-xs">
                    <span className={isDarkMode ? 'text-gray-500' : 'text-gray-600'}>
                        0
                    </span>
                    <AnimatePresence>
                        {isHovering && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{ color }}
                                className="font-bold"
                            >
                                {Math.round((currentValue / (currentValue + previousValue)) * 100)}% of total
                            </motion.span>
                        )}
                    </AnimatePresence>
                    <span className={isDarkMode ? 'text-gray-500' : 'text-gray-600'}>
                        {(currentValue + previousValue).toLocaleString()}
                    </span>
                </div>
            </div>
        </motion.div>
    );
};
