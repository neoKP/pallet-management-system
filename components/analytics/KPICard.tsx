import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    trend?: 'up' | 'down' | 'stable';
    trendValue?: number;
    suffix?: string;
    color?: string;
    variant?: 'primary' | 'secondary' | 'accent';
    isDarkMode: boolean;
    delay?: number;
}

const VARIANT_STYLES = {
    primary: {
        shadow: 'theme-shadow-primary',
        gradient: 'theme-gradient-overlay-primary',
        bgSoft: 'theme-bg-primary-soft-20',
        text: 'theme-text-primary',
        border: 'theme-border-primary'
    },
    secondary: {
        shadow: 'theme-shadow-secondary',
        gradient: 'theme-gradient-overlay-secondary',
        bgSoft: 'theme-bg-secondary-soft-20',
        text: 'theme-text-secondary',
        border: 'theme-border-secondary'
    },
    accent: {
        shadow: 'theme-shadow-accent',
        gradient: 'theme-gradient-overlay-accent',
        bgSoft: 'theme-bg-accent-soft-20',
        text: 'theme-text-accent',
        border: 'border-pink-500' // fallback or define theme-border-accent if needed
    }
};

export const KPICard: React.FC<KPICardProps> = ({
    title,
    value,
    icon,
    trend,
    trendValue,
    suffix = '',
    color,
    variant,
    isDarkMode,
    delay = 0,
}) => {
    const variantStyle = variant ? VARIANT_STYLES[variant] : null;
    // Animated counter using Framer Motion
    const numericValue = typeof value === 'number' ? value : 0;
    const spring = useSpring(0, { stiffness: 50, damping: 20 });
    const display = useTransform(spring, (current) =>
        Math.floor(current).toLocaleString()
    );

    useEffect(() => {
        if (typeof value === 'number') {
            spring.set(value);
        }
    }, [value, spring]);

    const getTrendIcon = () => {
        if (trend === 'up') return <TrendingUp className="w-4 h-4" />;
        if (trend === 'down') return <TrendingDown className="w-4 h-4" />;
        return <Minus className="w-4 h-4" />;
    };

    const getTrendColor = () => {
        if (trend === 'up') return 'text-green-400';
        if (trend === 'down') return 'text-red-400';
        return 'text-gray-400';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay / 1000 }}
            whileHover={{ scale: 1.05, y: -5 }}
            className={`
        relative overflow-hidden rounded-2xl p-6 cursor-pointer
        dynamic-transition 
        ${variantStyle ? variantStyle.shadow : 'dynamic-shadow'}
        ${isDarkMode
                    ? 'bg-white/5 backdrop-blur-xl border border-white/10'
                    : 'bg-white/80 backdrop-blur-xl border border-gray-200'
                }
      `}
            style={variantStyle ? undefined : ({
                '--dynamic-shadow-value': isDarkMode
                    ? `0 8px 32px 0 ${color}26`
                    : '0 4px 16px rgba(0, 0, 0, 0.08)',
            } as React.CSSProperties)}
        >
            {/* Gradient Background */}
            <motion.div
                className={`absolute inset-0 ${variantStyle ? variantStyle.gradient : 'dynamic-bg'}`}
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 0.1 }}
                transition={{ duration: 0.3 }}
                style={variantStyle ? undefined : ({
                    '--dynamic-bg-value': `linear-gradient(135deg, ${color} 0%, transparent 100%)`,
                } as React.CSSProperties)}
            />

            {/* Icon */}
            <motion.div
                className={`inline-flex p-3 rounded-xl mb-4 ${variantStyle ? variantStyle.bgSoft : 'dynamic-bg-color'}`}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
                style={variantStyle ? undefined : ({ '--dynamic-bg-color-value': `${color}20` } as React.CSSProperties)}
            >
                <div
                    className={variantStyle ? variantStyle.text : 'dynamic-color'}
                    style={variantStyle ? undefined : ({ '--dynamic-color-value': color } as React.CSSProperties)}
                >
                    {icon}
                </div>
            </motion.div>

            {/* Title */}
            <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {title}
            </h3>

            {/* Value */}
            <div className="flex items-baseline gap-2">
                <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {typeof value === 'number' ? (
                        <motion.span>{display}</motion.span>
                    ) : (
                        value
                    )}
                    {suffix && <span className="text-xl ml-1">{suffix}</span>}
                </p>
            </div>

            {/* Trend */}
            {trend && trendValue !== undefined && (
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (delay / 1000) + 0.3 }}
                    className={`flex items-center gap-1 mt-3 ${getTrendColor()}`}
                >
                    {getTrendIcon()}
                    <span className="text-sm font-medium">{trendValue}%</span>
                    <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        vs ช่วงก่อน
                    </span>
                </motion.div>
            )}

            {/* Shine Effect */}
            <motion.div
                className={`absolute inset-0 pointer-events-none ${variantStyle ? variantStyle.gradient : 'dynamic-bg'}`}
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
                style={variantStyle ? undefined : ({
                    '--dynamic-bg-value': `linear-gradient(90deg, transparent, ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}, transparent)`,
                } as React.CSSProperties)}
            />
        </motion.div>
    );
};
