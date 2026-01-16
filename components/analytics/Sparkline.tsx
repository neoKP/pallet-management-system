import React from 'react';
import { motion } from 'framer-motion';

interface SparklineProps {
    data: number[];
    color?: string;
    height?: number;
    showDots?: boolean;
    isDarkMode: boolean;
}

export const Sparkline: React.FC<SparklineProps> = ({
    data,
    color = '#6366f1',
    height = 40,
    showDots = false,
    isDarkMode,
}) => {
    if (!data || data.length === 0) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

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
            {/* Gradient Definition */}
            <defs>
                <linearGradient id={`sparkline-gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Area Fill */}
            <motion.path
                d={areaData}
                fill={`url(#sparkline-gradient-${color})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            />

            {/* Line */}
            <motion.path
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: 'easeInOut' }}
                style={{
                    filter: `drop-shadow(0 0 4px ${color}40)`,
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
                        fill={color}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                    />
                );
            })}

            {/* Last Point Highlight */}
            {data.length > 0 && (
                <motion.circle
                    cx={(data.length - 1) / (data.length - 1) * 100}
                    cy={height - ((data[data.length - 1] - min) / range) * height}
                    r="3"
                    fill={color}
                    stroke={isDarkMode ? '#1e293b' : '#ffffff'}
                    strokeWidth="2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                />
            )}
        </svg>
    );
};
