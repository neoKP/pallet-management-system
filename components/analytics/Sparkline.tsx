import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface SparklineProps {
    data: number[];
    color?: string;
    height?: number;
    showDots?: boolean;
    isDarkMode: boolean;
    useRainbow?: boolean;
}

export const Sparkline: React.FC<SparklineProps> = ({
    data,
    color = '#6366f1',
    height = 40,
    showDots = false,
    isDarkMode,
    useRainbow = true, // Default to true for "wow" effect
}) => {
    if (!data || data.length === 0) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    // Unique ID for gradients to avoid collisions
    const gradientId = useMemo(() => `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`, []);
    const rainbowId = useMemo(() => `rainbow-ribbon-${Math.random().toString(36).substr(2, 9)}`, []);

    // Generate SVG path
    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
    });

    const pathData = `M ${points.join(' L ')}`;

    // Area path (for gradient fill)
    const areaData = `M 0,${height} L ${points.join(' L ')} L 100,${height} Z`;

    return (
        <svg
            width="100%"
            height={height}
            viewBox={`0 0 100 ${height}`}
            preserveAspectRatio="none"
            className="overflow-visible"
        >
            <defs>
                {/* Standard Area Gradient */}
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={useRainbow ? '#6366f1' : color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={useRainbow ? '#6366f1' : color} stopOpacity="0" />
                </linearGradient>

                {/* Rainbow Ribbon Gradient */}
                {useRainbow && (
                    <linearGradient id={rainbowId} x1="0%" y1="0%" x2="200%" y2="0%" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#ff0000" />
                        <stop offset="14%" stopColor="#ff7f00" />
                        <stop offset="28%" stopColor="#ffff00" />
                        <stop offset="42%" stopColor="#00ff00" />
                        <stop offset="56%" stopColor="#0000ff" />
                        <stop offset="70%" stopColor="#4b0082" />
                        <stop offset="84%" stopColor="#9400d3" />
                        <stop offset="100%" stopColor="#ff0000" />
                    </linearGradient>
                )}
            </defs>

            {/* Area Fill */}
            <motion.path
                d={areaData}
                fill={`url(#${gradientId})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            />

            {/* Ribbon Line Layer (Rainbow) */}
            {useRainbow && (
                <motion.path
                    d={pathData}
                    fill="none"
                    stroke={`url(#${rainbowId})`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{
                        pathLength: 1,
                        opacity: 1,
                    }}
                    transition={{
                        pathLength: { duration: 1, ease: 'easeOut' },
                        opacity: { duration: 0.5 }
                    }}
                    style={{
                        filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.3))',
                    }}
                />
            )}

            {/* Standard Line / Base Line */}
            <motion.path
                d={pathData}
                fill="none"
                stroke={useRainbow ? 'white' : color}
                strokeWidth={useRainbow ? "1" : "2"}
                strokeOpacity={useRainbow ? 0.3 : 1}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: 'easeInOut' }}
                style={{
                    filter: useRainbow ? 'none' : `drop-shadow(0 0 4px ${color}40)`,
                }}
            />

            {/* Continuous Rainbow Flow Animation (Overlay) */}
            {useRainbow && (
                <motion.path
                    d={pathData}
                    fill="none"
                    stroke={`url(#${rainbowId})`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="20, 10"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: [0, -30] }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    style={{
                        mixBlendMode: 'screen',
                        opacity: 0.8
                    }}
                />
            )}

            {/* Pulse Effect on Line */}
            <motion.path
                d={pathData}
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeOpacity="0"
                animate={{
                    strokeOpacity: [0, 0.4, 0],
                    strokeWidth: [2, 4, 2]
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Dots */}
            {showDots && data.map((value, index) => {
                const x = (index / (data.length - 1)) * 100;
                const y = height - ((value - min) / range) * height;
                return (
                    <motion.circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="2"
                        fill={useRainbow ? 'white' : color}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                    />
                );
            })}

            {/* Last Point Highlight */}
            {data.length > 0 && (
                <motion.circle
                    cx={100}
                    cy={height - ((data[data.length - 1] - min) / range) * height}
                    r="4"
                    fill={useRainbow ? '#6366f1' : color}
                    stroke="white"
                    strokeWidth="2"
                    initial={{ scale: 0 }}
                    animate={{
                        scale: [1, 1.5, 1],
                        filter: ['drop-shadow(0 0 0px #fff)', 'drop-shadow(0 0 8px #fff)', 'drop-shadow(0 0 0px #fff)']
                    }}
                    transition={{
                        scale: { duration: 2, repeat: Infinity },
                        filter: { duration: 2, repeat: Infinity }
                    }}
                />
            )}
        </svg>
    );
};
