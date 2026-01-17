import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Sparkline } from './Sparkline';
import { TiltCard } from './MotionWrappers';

interface EnhancedKPICardProps {
    title: string;
    value: number | string;
    suffix?: string;
    icon: React.ReactNode;
    trend?: 'up' | 'down' | 'stable';
    trendValue?: number;
    sparklineData?: number[];
    color?: string;
    variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning';
    isDarkMode: boolean;
    delay?: number;
    onClick?: () => void;
}

const VARIANT_STYLES = {
    primary: {
        shadow: 'theme-shadow-primary',
        gradient: 'theme-gradient-overlay-primary',
        text: 'theme-text-primary',
        bgSoft: 'theme-bg-primary-soft-20',
        border: 'theme-border-primary'
    },
    secondary: {
        shadow: 'theme-shadow-secondary',
        gradient: 'theme-gradient-overlay-secondary',
        text: 'theme-text-secondary',
        bgSoft: 'theme-bg-secondary-soft-20',
        border: 'theme-border-secondary'
    },
    accent: {
        shadow: 'theme-shadow-accent',
        gradient: 'theme-gradient-overlay-accent',
        text: 'theme-text-accent',
        bgSoft: 'theme-bg-accent-soft-20',
        border: 'theme-border-accent'
    },
    success: {
        shadow: 'shadow-emerald-500/20',
        gradient: 'from-emerald-500/10 to-transparent',
        text: 'text-emerald-500',
        bgSoft: 'bg-emerald-500/20',
        border: 'border-emerald-500/50'
    },
    warning: {
        shadow: 'shadow-amber-500/20',
        gradient: 'from-amber-500/10 to-transparent',
        text: 'text-amber-500',
        bgSoft: 'bg-amber-500/20',
        border: 'border-amber-500/50'
    }
};

export const EnhancedKPICard: React.FC<EnhancedKPICardProps> = ({
    title,
    value,
    suffix,
    icon,
    trend,
    trendValue,
    sparklineData,
    color,
    variant,
    isDarkMode,
    delay = 0,
    onClick,
}) => {
    const variantStyle = variant ? VARIANT_STYLES[variant] : null;

    // Counting Animation
    const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]+/g, ""));
    const animatedValue = useSpring(0, { stiffness: 50, damping: 20 });
    const displayValue = useTransform(animatedValue, (latest) => {
        if (typeof value !== 'number') return value; // Fallback for non-numeric
        return Math.round(latest).toLocaleString();
    });

    useEffect(() => {
        if (typeof value === 'number') {
            const timer = setTimeout(() => {
                animatedValue.set(numericValue);
            }, delay * 1000 + 200);
            return () => clearTimeout(timer);
        }
    }, [value, numericValue, animatedValue, delay]);

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

    const trendColor = getTrendColor();

    return (
        <div onClick={onClick} className="h-full">
            <TiltCard
                isDarkMode={isDarkMode}
                className={`
                    relative p-6 rounded-xl overflow-hidden cursor-pointer group h-full
                    ${isDarkMode
                        ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50'
                        : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
                    }
                    backdrop-blur-md shadow-lg hover:shadow-2xl transition-all
                    ${variantStyle?.shadow || ''}
                `}
                style={{
                    // @ts-ignore
                    '--card-glow': `radial-gradient(circle at top right, ${color}, transparent 70%)`
                } as React.CSSProperties}
                glareColor={color || '#fff'}
            >
                {/* Static Background Glow */}
                <div
                    className={`absolute inset-0 opacity-10 ${variantStyle?.gradient || 'bg-[image:var(--card-glow)]'}`}
                />

                {/* Header */}
                <div className="relative flex items-start justify-between mb-4 z-10">
                    <div className="flex-1">
                        <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {title}
                        </h3>
                    </div>
                    <motion.div
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                        className={`
                            p-3 rounded-lg 
                            ${variantStyle
                                ? `${variantStyle.bgSoft} ${variantStyle.text}`
                                : 'bg-[var(--icon-bg)] text-[var(--icon-color)] shadow-[var(--icon-shadow)]'
                            }
                        `}
                        style={!variantStyle ? {
                            // @ts-ignore
                            '--icon-bg': `${color}20`,
                            '--icon-color': color,
                            '--icon-shadow': `0 0 20px ${color}30`
                        } as React.CSSProperties : undefined}
                    >
                        {icon}
                    </motion.div>
                </div>

                {/* Value */}
                <div className="relative mb-3 z-10">
                    <div className="flex items-baseline gap-2">
                        <motion.span className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {typeof value === 'number' ? displayValue : value}
                        </motion.span>
                        {suffix && (
                            <span className={`text-lg ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                {suffix}
                            </span>
                        )}
                    </div>
                </div>

                {/* Sparkline */}
                {sparklineData && sparklineData.length > 0 && (
                    <div className="relative mb-3 h-10 z-10 opacity-80 group-hover:opacity-100 transition-opacity">
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
                        className="relative flex items-center gap-2 z-10"
                    >
                        <div
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-[var(--trend-bg)] text-[var(--trend-color)]"
                            style={{
                                // @ts-ignore
                                '--trend-bg': `${trendColor}20`,
                                '--trend-color': trendColor
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
            </TiltCard>
        </div>
    );
};
