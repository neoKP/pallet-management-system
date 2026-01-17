import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TiltCard } from './MotionWrappers';

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
    const [isHovering, setIsHovering] = useState(false);
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

    // Get status info
    const getStatusInfo = () => {
        if (percentage >= 90) return { emoji: '🎯', text: 'Excellent', tip: 'Outstanding performance!' };
        if (percentage >= 70) return { emoji: '✅', text: 'Good', tip: 'Keep up the good work!' };
        if (percentage >= 50) return { emoji: '⚠️', text: 'Fair', tip: 'Room for improvement' };
        return { emoji: '❌', text: 'Poor', tip: 'Needs attention!' };
    };

    const statusInfo = getStatusInfo();

    return (
        <div onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} className="h-full">
            <TiltCard
                isDarkMode={isDarkMode}
                className={`
                    relative p-6 rounded-xl overflow-hidden transition-all duration-500 group h-full flex flex-col justify-between
                    ${isDarkMode
                        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50'
                        : 'bg-gradient-to-br from-white via-gray-50 to-white border border-gray-200'
                    }
                    backdrop-blur-sm shadow-lg
                `}
                glareColor={gaugeColor}
            >
                {/* Animated background glow on hover */}
                <AnimatePresence>
                    {isHovering && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                background: `radial-gradient(circle at 50% 60%, ${gaugeColor}15 0%, transparent 60%)`
                            }}
                        />
                    )}
                </AnimatePresence>

                {/* Title with interactive badge */}
                <div className="text-center mb-2 relative z-10">
                    <div className="flex items-center justify-center gap-2">
                        <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
                                        backgroundColor: `${gaugeColor}20`,
                                        color: gaugeColor
                                    }}
                                >
                                    Live
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                    {subtitle && (
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Gauge Area */}
                <div className="flex-1 flex flex-col items-center justify-center min-h-[160px]">
                    {/* Gauge SVG */}
                    <div className="relative w-full aspect-[2/1] max-w-[200px] mx-auto mb-2">
                        <svg viewBox="0 0 200 110" className="w-full h-full" style={{ overflow: 'visible' }}>
                            <defs>
                                <filter id={`gaugeGlow-${title.replace(/\s/g, '')}`}>
                                    <feGaussianBlur stdDeviation={isHovering ? "4" : "2"} result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                                <linearGradient id={`arcGradient-${title.replace(/\s/g, '')}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={gaugeColor} stopOpacity={0.6} />
                                    <stop offset="100%" stopColor={gaugeColor} stopOpacity={1} />
                                </linearGradient>
                            </defs>

                            {/* Background Arc */}
                            <path
                                d="M 20 100 A 80 80 0 0 1 180 100"
                                fill="none"
                                stroke={isDarkMode ? '#334155' : '#e5e7eb'}
                                strokeWidth={isHovering ? "14" : "12"}
                                strokeLinecap="round"
                                style={{ transition: 'stroke-width 0.3s ease' }}
                            />

                            {/* Progress Arc */}
                            <motion.path
                                d="M 20 100 A 80 80 0 0 1 180 100"
                                fill="none"
                                stroke={`url(#arcGradient-${title.replace(/\s/g, '')})`}
                                strokeWidth={isHovering ? "14" : "12"}
                                strokeLinecap="round"
                                strokeDasharray="251.2"
                                initial={{ strokeDashoffset: 251.2 }}
                                animate={{ strokeDashoffset: 251.2 - (251.2 * percentage) / 100 }}
                                transition={{ duration: 1.5, ease: 'easeOut' }}
                                filter={`url(#gaugeGlow-${title.replace(/\s/g, '')})`}
                                style={{ transition: 'stroke-width 0.3s ease' }}
                            />

                            {/* Needle */}
                            <motion.g
                                initial={{ rotate: -90 }}
                                animate={{ rotate: angle }}
                                transition={{ duration: 1.5, ease: 'backOut' }}
                                style={{ transformOrigin: '100px 100px' }}
                            >
                                <line
                                    x1="100"
                                    y1="100"
                                    x2="100"
                                    y2={isHovering ? "50" : "55"}
                                    stroke={gaugeColor}
                                    strokeWidth={isHovering ? "4" : "3"}
                                    strokeLinecap="round"
                                    style={{ transition: 'all 0.3s ease' }}
                                />
                                {/* Spark at Tip */}
                                <motion.circle
                                    cx="100"
                                    cy={isHovering ? "50" : "55"}
                                    r={isHovering ? "3" : "2"}
                                    fill="#fff"
                                    animate={{
                                        opacity: [0.6, 1, 0.6],
                                        scale: [1, 1.2, 1],
                                        filter: [`drop-shadow(0 0 2px ${gaugeColor})`, `drop-shadow(0 0 8px ${gaugeColor})`, `drop-shadow(0 0 2px ${gaugeColor})`]
                                    }}
                                    transition={{ duration: 0.5, repeat: Infinity }}
                                />
                                <circle
                                    cx="100"
                                    cy="100"
                                    r={isHovering ? "8" : "6"}
                                    fill={gaugeColor}
                                    style={{ transition: 'r 0.3s ease' }}
                                />
                            </motion.g>
                        </svg>

                        {/* 0% and 100% Labels positioned absolutely relative to container */}
                        <div className="absolute bottom-0 left-0 text-[10px] text-gray-500 transform -translate-x-2">0%</div>
                        <div className="absolute bottom-0 right-0 text-[10px] text-gray-500 transform translate-x-2">100%</div>
                    </div>

                    {/* Value Data - Moved Below Graph */}
                    <div className="text-center relative z-10 mt-2">
                        <motion.div
                            className={`text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                            animate={{ scale: isHovering ? 1.1 : 1 }}
                            transition={{ duration: 0.3, type: "spring" }}
                        >
                            {Math.round(percentage)}%
                        </motion.div>
                        <div className={`text-xs font-medium mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {value.toLocaleString()} / {max.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Status Badge */}
                <div className="mt-4 text-center relative z-10">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className={`
                            inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold cursor-pointer
                            transition-all duration-300
                            ${percentage >= 90 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : percentage >= 70 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : percentage >= 50 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}
                        `}
                        style={{
                            boxShadow: isHovering ? `0 0 15px ${gaugeColor}20` : 'none'
                        }}
                    >
                        <span>{statusInfo.emoji}</span>
                        <span>{statusInfo.text}</span>
                    </motion.div>
                </div>
            </TiltCard>
        </div>
    );
};
