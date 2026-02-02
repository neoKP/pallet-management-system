import React from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';

interface TargetActualCardProps {
    title: string;
    target: number;
    actual: number;
    unit?: string;
    isDarkMode: boolean;
    showWarning?: boolean;
    delay?: number;
}

export const TargetActualCard: React.FC<TargetActualCardProps> = ({
    title,
    target,
    actual,
    unit = '',
    isDarkMode,
    showWarning = true,
    delay = 0,
}) => {
    const percentage = target > 0 ? (actual / target) * 100 : 0;
    const cappedPercentage = Math.min(percentage, 100);
    const difference = actual - target;
    const isAchieved = actual >= target;
    const isClose = percentage >= 80 && percentage < 100;
    const isWarning = percentage < 80;

    const getStatusColor = () => {
        if (isAchieved) return '#10b981'; // Green
        if (isClose) return '#f59e0b'; // Amber
        return '#ef4444'; // Red
    };

    const getStatusIcon = () => {
        if (isAchieved) return <CheckCircle2 className="w-5 h-5" />;
        if (isClose) return <Zap className="w-5 h-5" />;
        return <AlertTriangle className="w-5 h-5" />;
    };

    const getStatusText = () => {
        if (isAchieved) return 'เป้าหมายสำเร็จ! 🎉';
        if (isClose) return 'ใกล้ถึงเป้าหมายแล้ว!';
        return 'ต้องเร่งดำเนินการ';
    };

    const statusColor = getStatusColor();

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay }}
            className={`
                relative p-6 rounded-2xl overflow-hidden
                ${isDarkMode
                    ? 'bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50'
                    : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
                }
                backdrop-blur-sm shadow-lg hover:shadow-xl transition-all
            `}
            style={{
                '--status-color': statusColor,
                '--status-bg': `${statusColor}20`
            } as React.CSSProperties}
        >
            {/* Background Glow */}
            <div
                className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,var(--status-color),transparent_70%)]"
            />

            {/* Header */}
            <div className="relative flex items-start justify-between mb-4">
                <div>
                    <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {title}
                    </h3>
                </div>
                <div
                    className="p-2 rounded-lg bg-[var(--status-bg)] text-[var(--status-color)]"
                >
                    <Target className="w-5 h-5" />
                </div>
            </div>

            {/* Target vs Actual */}
            <div className="relative space-y-4">
                {/* Target Row */}
                <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        🎯 เป้าหมาย
                    </span>
                    <span className={`text-lg font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {target.toLocaleString()} {unit}
                    </span>
                </div>

                {/* Actual Row */}
                <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        ✅ ผลจริง
                    </span>
                    <motion.span
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: delay + 0.2 }}
                        className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                    >
                        {actual.toLocaleString()} {unit}
                    </motion.span>
                </div>

                {/* Progress Bar */}
                <div className="relative mt-4">
                    <div className={`h-4 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                        <motion.div
                            className="h-full rounded-full relative bg-[var(--status-color)]"
                            initial={{ width: '0%' }}
                            animate={{
                                width: ['0%', '100%', `${cappedPercentage}%`]  // Overshoot animation
                            }}
                            transition={{
                                delay: delay + 0.3,
                                duration: 1.5,
                                times: [0, 0.4, 1],
                                ease: ['easeOut', 'easeInOut']
                            }}
                        >
                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                        </motion.div>
                    </div>

                    {/* Percentage Label */}
                    <div className="flex justify-between mt-2">
                        <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                            0%
                        </span>
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: delay + 0.5 }}
                            className="text-sm font-bold text-[var(--status-color)]"
                        >
                            {percentage.toFixed(1)}%
                        </motion.span>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                            100%
                        </span>
                    </div>
                </div>

                {/* Difference Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: delay + 0.6 }}
                    className={`
                        flex items-center justify-between p-3 rounded-xl mt-4
                        ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}
                    `}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-[var(--status-color)]">
                            {getStatusIcon()}
                        </span>
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {getStatusText()}
                        </span>
                    </div>
                    <div
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold bg-[var(--status-bg)] text-[var(--status-color)]"
                    >
                        {isAchieved ? (
                            <TrendingUp className="w-4 h-4" />
                        ) : (
                            <TrendingDown className="w-4 h-4" />
                        )}
                        <span>
                            {difference > 0 ? '+' : ''}{difference.toLocaleString()} {unit}
                        </span>
                    </div>
                </motion.div>

                {/* Warning Message */}
                {showWarning && isWarning && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ delay: delay + 0.7 }}
                        className={`
                            p-3 rounded-xl border flex items-start gap-2
                            ${isDarkMode
                                ? 'bg-red-500/10 border-red-500/30'
                                : 'bg-red-50 border-red-200'
                            }
                        `}
                    >
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                        <div>
                            <p className={`text-xs font-medium ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                ⚠️ คำแนะนำ
                            </p>
                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                                ยังห่างเป้าหมายอีก {Math.abs(difference).toLocaleString()} {unit} ({(100 - percentage).toFixed(1)}%)
                                ควรเร่งดำเนินการเพื่อให้บรรลุเป้าหมาย
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

export default TargetActualCard;
