import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { THEMES } from './ThemeEngine';
import { SpotlightCard } from './MotionWrappers';

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
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

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
    const chartHeight = 350;
    const barWidth = 60;
    const gap = 30; // Wider gap for cleaner look

    const getY = (value: number) => {
        // Add padding to top and bottom
        const padding = 40;
        const availableHeight = chartHeight - (padding * 2);
        return chartHeight - padding - ((value + maxValue / 4) / (maxValue * 1.5)) * availableHeight;
    };

    return (
        <SpotlightCard
            spotlightColor={isDarkMode ? `${currentTheme.primary}20` : 'rgba(168,85,247,0.1)'}
            className={`
                p-8 rounded-3xl relative overflow-hidden group cyber-glass-card
                ${isDarkMode
                    ? 'bg-slate-900/60 border border-indigo-500/30'
                    : 'bg-white/80 border border-indigo-200'
                }
                shadow-2xl transition-all duration-500
            `}
        >
            <div style={{
                position: 'absolute',
                inset: 0,
                boxShadow: isDarkMode ? `0 0 50px -10px ${currentTheme.primary}20` : '0 20px 40px -10px rgba(0,0,0,0.1)',
                pointerEvents: 'none'
            }} />

            {/* Title with Cyberpunk underline */}
            <div className="relative mb-8 inline-block">
                <h3 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {title}
                </h3>
                <motion.div
                    className="h-1 rounded-full mt-1"
                    style={{ background: `linear-gradient(90deg, ${currentTheme.primary}, transparent)` }}
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ delay: 0.5, duration: 1 }}
                />
            </div>

            {/* Chart */}
            <div className="overflow-x-auto overflow-y-hidden pb-4">
                <svg
                    width={data.length * (barWidth + gap) + gap}
                    height={chartHeight}
                    className="mx-auto"
                    style={{ overflow: 'visible' }}
                >
                    <defs>
                        {/* Advanced Glow Filter */}
                        <filter id="cyber-glow-focus" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>

                        {/* Scanline Pattern */}
                        <pattern id="scanlines" x="0" y="0" width="1" height="4" patternUnits="userSpaceOnUse">
                            <rect width="1" height="2" fill="black" fillOpacity="0.1" />
                        </pattern>
                    </defs>

                    {/* Zero Line */}
                    <line
                        x1="0"
                        y1={getY(0)}
                        x2={data.length * (barWidth + gap) + gap}
                        y2={getY(0)}
                        stroke={isDarkMode ? '#64748b' : '#94a3b8'}
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        opacity="0.3"
                    />

                    <AnimatePresence>
                        {chartData.map((item, index) => {
                            const x = gap + index * (barWidth + gap);
                            const barStart = Math.min(item.start, item.end);
                            const barEnd = Math.max(item.start, item.end);
                            const barHeight = Math.max(4, Math.abs(getY(barEnd) - getY(barStart))); // Min height 4px to be visible
                            const barY = getY(barEnd);
                            const isFocused = focusedIndex === null || focusedIndex === index;

                            const baseColor = item.isTotal
                                ? currentTheme.secondary || '#8b5cf6'
                                : item.isPositive
                                    ? '#10b981'
                                    : '#ef4444';

                            return (
                                <g
                                    key={index}
                                    onMouseEnter={() => setFocusedIndex(index)}
                                    onMouseLeave={() => setFocusedIndex(null)}
                                    style={{
                                        opacity: isFocused ? 1 : 0.3, // Dim non-focused elements
                                        transition: 'opacity 0.4s ease',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {/* Connector Beam with Particles */}
                                    {index > 0 && !item.isTotal && (
                                        <g>
                                            <line
                                                x1={x - gap}
                                                y1={getY(chartData[index - 1].end)}
                                                x2={x}
                                                y2={getY(item.start)}
                                                stroke={baseColor}
                                                strokeWidth="2"
                                                strokeOpacity="0.3"
                                            />
                                            {/* Moving Particle */}
                                            <motion.circle
                                                r="3"
                                                fill="#fff"
                                                filter={`url(#cyber-glow-focus)`}
                                                initial={{ offsetDistance: '0%' }}
                                                animate={{
                                                    cx: [x - gap, x],
                                                    cy: [getY(chartData[index - 1].end), getY(item.start)],
                                                    opacity: [0, 1, 0]
                                                }}
                                                transition={{
                                                    duration: 1,
                                                    repeat: Infinity,
                                                    delay: index * 0.1,
                                                    ease: "linear"
                                                }}
                                            />
                                        </g>
                                    )}

                                    {/* Main Bar Group */}
                                    <g filter={isFocused ? "url(#cyber-glow-focus)" : undefined}>
                                        {/* Bar Body */}
                                        <motion.rect
                                            x={x}
                                            y={barY}
                                            width={barWidth}
                                            height={barHeight}
                                            fill={baseColor}
                                            rx="8"
                                            initial={{ scaleY: 0, opacity: 0 }}
                                            animate={{
                                                scaleY: 1,
                                                opacity: 1,
                                                scale: isFocused && focusedIndex === index ? 1.05 : 1 // Scale up on hover
                                            }}
                                            transition={{
                                                type: 'spring',
                                                damping: 15,
                                                stiffness: 120,
                                                delay: index * 0.1 // Staggered entrance
                                            }}
                                            style={{
                                                transformOrigin: '50% 50%' // Scale from center
                                            }}
                                        />

                                        {/* Texture Overlay */}
                                        <rect
                                            x={x}
                                            y={barY}
                                            width={barWidth}
                                            height={barHeight}
                                            fill="url(#scanlines)"
                                            rx="8"
                                            style={{ pointerEvents: 'none' }}
                                        />
                                    </g>

                                    {/* Value Box */}
                                    <motion.foreignObject
                                        x={x - 10}
                                        y={Math.min(barY, getY(barStart)) - 50}
                                        width={barWidth + 20}
                                        height={40}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 + index * 0.1 }}
                                    >
                                        <div className={`
                                            flex items-center justify-center h-full rounded-lg text-xs font-bold
                                            ${isFocused ? 'scale-110 shadow-lg text-white' : 'scale-100'}
                                            transition-all duration-300
                                        `}
                                            style={{
                                                background: isDarkMode ? `${baseColor}60` : `${baseColor}40`, // Brighter background
                                                color: isDarkMode ? '#fff' : '#000',
                                                border: `1px solid ${baseColor}`,
                                                backdropFilter: 'blur(4px)'
                                            }}>
                                            {item.value > 0 && !item.isTotal ? '+' : ''}{Math.round(item.value).toLocaleString()}
                                        </div>
                                    </motion.foreignObject>

                                    {/* Label Bottom */}
                                    <text
                                        x={x + barWidth / 2}
                                        y={chartHeight - 10}
                                        textAnchor="middle"
                                        className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${isFocused ? 'fill-white' : 'fill-slate-500'}`}
                                    >
                                        {item.label}
                                    </text>
                                </g>
                            );
                        })}
                    </AnimatePresence>
                </svg>
            </div>

            {/* Legend with Neon Glow */}
            <div className="flex flex-wrap justify-center gap-6 mt-2 relative z-20">
                {[
                    { label: 'Increase', color: '#10b981' },
                    { label: 'Decrease', color: '#ef4444' },
                    { label: 'Total', color: currentTheme.secondary || '#8b5cf6' }
                ].map((l, i) => (
                    <motion.div
                        key={i}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-white/5 backdrop-blur-md"
                        whileHover={{ scale: 1.1, boxShadow: `0 0 15px ${l.color}`, borderColor: l.color }}
                    >
                        <div className="w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: l.color, color: l.color }} />
                        <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {l.label}
                        </span>
                    </motion.div>
                ))}
            </div>
        </SpotlightCard>
    );
};
