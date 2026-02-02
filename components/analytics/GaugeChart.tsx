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
    const isOver = value > max;
    const actualPercentage = Math.round((value / max) * 100);
    const displayPercentage = Math.min(actualPercentage, 100);
    // Allow needle to go slightly beyond 100% (up to 115%) to show "breaking the limit"
    const needlePercentage = Math.min(actualPercentage, 115);
    const angle = (needlePercentage / 100) * 180 - 90;

    // Color based on percentage and capacity
    const getColor = () => {
        if (isOver) return '#ef4444'; // Red for Over Capacity
        if (actualPercentage >= 90) return '#f59e0b'; // Amber for Almost Full
        if (actualPercentage >= 40) return '#10b981'; // Green for Normal/Optimal
        return '#3b82f6'; // Blue for Low Stock
    };

    const gaugeColor = isOver ? '#ef4444' : (color || getColor());

    // Get status info
    const getStatusInfo = () => {
        if (isOver) return { emoji: '🚨', text: 'Over Capacity', tip: 'Stock exceeds storage limit!' };
        if (actualPercentage >= 90) return { emoji: '⚠️', text: 'Near Full', tip: 'Storage is almost at limit' };
        if (actualPercentage >= 40) return { emoji: '✅', text: 'Optimal', tip: 'Stock levels are healthy' };
        return { emoji: '📦', text: 'Low Stock', tip: 'Consider replenishing stock' };
    };

    const statusInfo = getStatusInfo();

    return (
        <div onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => { setIsHovering(false); }} className="h-full">
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
                    {(isHovering || isOver) && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                background: isOver
                                    ? 'radial-gradient(circle at 50% 60%, #ef444420 0%, transparent 70%)'
                                    : `radial-gradient(circle at 50% 60%, ${gaugeColor}15 0%, transparent 60%)`
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
                            {(isHovering || isOver) && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    className={`text-xs px-2 py-0.5 rounded-full ${isOver ? 'animate-pulse' : ''}`}
                                    style={{
                                        backgroundColor: isOver ? '#ef444420' : `${gaugeColor}20`,
                                        color: isOver ? '#ef4444' : gaugeColor
                                    }}
                                >
                                    {isOver ? 'Alert' : 'Live'}
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
                        <svg viewBox="0 0 200 110" className="w-full h-full overflow-visible">
                            <defs>
                                <filter id={`gaugeGlow-${title.replace(/\s/g, '')}`}>
                                    <feGaussianBlur stdDeviation={(isHovering || isOver) ? "4" : "2"} result="coloredBlur" />
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
                                strokeWidth={(isHovering || isOver) ? "14" : "12"}
                                strokeLinecap="round"
                                className="transition-[stroke-width] duration-300"
                            />

                            {/* Progress Arc with Ignition Sequence */}
                            <motion.path
                                d="M 20 100 A 80 80 0 0 1 180 100"
                                fill="none"
                                stroke={`url(#arcGradient-${title.replace(/\s/g, '')})`}
                                strokeWidth={(isHovering || isOver) ? "14" : "12"}
                                strokeLinecap="round"
                                strokeDasharray="251.2"
                                initial={{ strokeDashoffset: 251.2 }}
                                animate={{
                                    strokeDashoffset: [
                                        251.2,           // Start at 0%
                                        0,               // Sweep to 100% (ignition)
                                        251.2 - (251.2 * displayPercentage) / 100  // Settle at max 100% visual
                                    ]
                                }}
                                transition={{
                                    duration: 2.5,
                                    times: [0, 0.4, 1],
                                    ease: ['easeOut', 'easeInOut']
                                }}
                                filter={`url(#gaugeGlow-${title.replace(/\s/g, '')})`}
                            />

                            {/* Needle with Ignition & Over-Capacity Shaking */}
                            <motion.g
                                initial={{ rotate: -90 }}
                                animate={{
                                    rotate: [-90, 90, angle],
                                    x: isOver ? [0, -1, 1, -1, 0] : 0,
                                    y: isOver ? [0, 1, -1, 1, 0] : 0
                                }}
                                transition={{
                                    rotate: {
                                        duration: 2.5,
                                        times: [0, 0.4, 1],
                                        ease: ['easeOut', 'backOut']
                                    },
                                    x: { duration: 0.1, repeat: isOver ? Infinity : 0 },
                                    y: { duration: 0.1, repeat: isOver ? Infinity : 0 }
                                }}
                                style={{ transformOrigin: '100px 100px' }}
                            >
                                <motion.line
                                    x1="100"
                                    y1="100"
                                    x2="100"
                                    y2={(isHovering || isOver) ? "50" : "55"}
                                    stroke={gaugeColor}
                                    strokeWidth={(isHovering || isOver) ? "4" : "3"}
                                    strokeLinecap="round"
                                    className="transition-all duration-300"
                                />

                                {/* Explosion / Spark Particles for Over-Capacity */}
                                {isOver && (
                                    <g>
                                        <motion.circle
                                            cx="100"
                                            cy="50"
                                            r="4"
                                            fill="#ef4444"
                                            animate={{
                                                scale: [1, 4],
                                                opacity: [0.8, 0],
                                            }}
                                            transition={{ duration: 0.8, repeat: Infinity, ease: "easeOut" }}
                                        />
                                        <motion.circle
                                            cx="100"
                                            cy="50"
                                            r="2"
                                            fill="#f97316"
                                            animate={{
                                                scale: [1, 6],
                                                opacity: [1, 0],
                                            }}
                                            transition={{ duration: 0.6, repeat: Infinity, ease: "easeOut", delay: 0.1 }}
                                        />
                                        <motion.circle
                                            cx="100"
                                            cy="50"
                                            r="1"
                                            fill="#fbbf24"
                                            animate={{
                                                scale: [1, 8],
                                                opacity: [1, 0],
                                            }}
                                            transition={{ duration: 0.4, repeat: Infinity, ease: "easeOut", delay: 0.2 }}
                                        />
                                    </g>
                                )}

                                {/* Core Tip Spark */}
                                <motion.circle
                                    cx="100"
                                    cy={(isHovering || isOver) ? "50" : "55"}
                                    r={(isHovering || isOver) ? "3" : "2"}
                                    fill="#fff"
                                    animate={{
                                        opacity: [0.6, 1, 0.6],
                                        scale: isOver ? [1, 2, 1] : [1, 1.2, 1],
                                        filter: [`drop-shadow(0 0 2px ${gaugeColor})`, `drop-shadow(0 0 12px ${gaugeColor})`, `drop-shadow(0 0 2px ${gaugeColor})`]
                                    }}
                                    transition={{ duration: 0.5, repeat: Infinity }}
                                />
                                <motion.circle
                                    cx="100"
                                    cy="100"
                                    r={(isHovering || isOver) ? "8" : "6"}
                                    fill={gaugeColor}
                                    className="transition-[r] duration-300"
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
                            className={`text-4xl font-black tracking-tight ${isOver ? 'text-red-500' : (isDarkMode ? 'text-white' : 'text-gray-900')}`}
                            animate={{ scale: (isHovering || isOver) ? 1.1 : 1 }}
                            transition={{ duration: 0.3, type: "spring" }}
                        >
                            {actualPercentage}%
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
                            ${actualPercentage >= 100 ? 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' :
                                actualPercentage >= 90 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]' :
                                    actualPercentage >= 40 ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]' :
                                        'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]'}
                        `}
                    >
                        <span>{statusInfo.emoji}</span>
                        <span>{statusInfo.text}</span>
                    </motion.div>
                </div>
            </TiltCard>
        </div>
    );
};
