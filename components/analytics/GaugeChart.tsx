import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
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
                boxShadow: isHovering ? `0 20px 40px ${gaugeColor}20` : undefined
            }}
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
            <div className="text-center mb-4 relative z-10">
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

            {/* Gauge SVG with enhanced effects */}
            <div className="relative w-full aspect-square max-w-[200px] mx-auto">
                <svg viewBox="0 0 200 120" className="w-full h-full">
                    <defs>
                        {/* Glow filter */}
                        <filter id={`gaugeGlow-${title.replace(/\s/g, '')}`}>
                            <feGaussianBlur stdDeviation={isHovering ? "4" : "2"} result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        {/* Gradient for arc */}
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

                    {/* Outer glow ring on hover */}
                    {isHovering && (
                        <motion.path
                            d="M 15 100 A 85 85 0 0 1 185 100"
                            fill="none"
                            stroke={gaugeColor}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray="267"
                            initial={{ strokeDashoffset: 267 }}
                            animate={{ strokeDashoffset: 267 - (267 * percentage) / 100 }}
                            opacity={0.3}
                        />
                    )}

                    {/* Progress Arc with glow */}
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

                    {/* Center Circle with pulsing effect */}
                    <circle
                        cx="100"
                        cy="100"
                        r={isHovering ? "52" : "50"}
                        fill={isDarkMode ? '#1e293b' : '#f8fafc'}
                        stroke={isHovering ? gaugeColor : (isDarkMode ? '#475569' : '#cbd5e1')}
                        strokeWidth={isHovering ? "2" : "1"}
                        style={{ transition: 'all 0.3s ease' }}
                    />

                    {/* Pulsing inner glow on hover */}
                    {isHovering && (
                        <circle cx="100" cy="100" r="45" fill={`${gaugeColor}10`}>
                            <animate attributeName="r" values="40;48;40" dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
                        </circle>
                    )}

                    {/* Needle with enhanced glow */}
                    <motion.g
                        initial={{ rotate: -90 }}
                        animate={{ rotate: angle }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                        style={{ transformOrigin: '100px 100px' }}
                    >
                        {/* Needle glow on hover */}
                        {isHovering && (
                            <line
                                x1="100"
                                y1="100"
                                x2="100"
                                y2="50"
                                stroke={gaugeColor}
                                strokeWidth="6"
                                strokeLinecap="round"
                                opacity={0.3}
                                filter={`url(#gaugeGlow-${title.replace(/\s/g, '')})`}
                            />
                        )}
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
                        <circle
                            cx="100"
                            cy="100"
                            r={isHovering ? "8" : "6"}
                            fill={gaugeColor}
                            style={{ transition: 'r 0.3s ease' }}
                        >
                            {isHovering && (
                                <animate attributeName="r" values="7;9;7" dur="1s" repeatCount="indefinite" />
                            )}
                        </circle>
                    </motion.g>

                    {/* Value Text with animation */}
                    <text
                        x="100"
                        y="90"
                        textAnchor="middle"
                        className={`font-bold ${isDarkMode ? 'fill-white' : 'fill-gray-900'}`}
                        style={{ fontSize: isHovering ? '32px' : '28px', transition: 'font-size 0.3s ease' }}
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

            {/* Legend with hover highlight */}
            <div className="flex justify-between mt-4 text-xs relative z-10">
                <span className={`transition-all ${isHovering ? 'font-bold' : ''} ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>0%</span>
                <span className={`transition-all ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>50%</span>
                <span className={`transition-all ${isHovering ? 'font-bold' : ''} ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>100%</span>
            </div>

            {/* Enhanced Status Badge with tip on hover */}
            <div className="mt-4 text-center relative z-10">
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    className={`
                        inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold cursor-pointer
                        transition-all duration-300
                        ${percentage >= 90
                            ? 'bg-green-500/20 text-green-400'
                            : percentage >= 70
                                ? 'bg-amber-500/20 text-amber-400'
                                : percentage >= 50
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-red-500/20 text-red-400'
                        }
                    `}
                    style={{
                        boxShadow: isHovering ? `0 0 20px ${gaugeColor}30` : 'none'
                    }}
                >
                    <span>{statusInfo.emoji}</span>
                    <span>{statusInfo.text}</span>
                    <AnimatePresence>
                        {isHovering && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="text-[10px] opacity-70 overflow-hidden whitespace-nowrap"
                            >
                                · {statusInfo.tip}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </motion.div>
    );
};
