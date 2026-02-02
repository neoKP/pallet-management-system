import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Moon, Sun, X, Check, Sparkles, Zap, Star, Heart, Gem, Flame, Waves, Leaf, Crown, Globe } from 'lucide-react';

export type ThemeColor = 'indigo' | 'purple' | 'blue' | 'green' | 'rose' | 'amber' | 'cyan' | 'emerald' | 'violet';

export interface ThemeConfig {
    id: ThemeColor;
    name: string;
    nameEn: string;
    primary: string;
    secondary: string;
    accent: string;
    gradient: string;
    gradientDark: string;
    icon: React.ReactNode;
    emoji: string;
    glow: string;
    particleColor: string;
}

export const THEMES: ThemeConfig[] = [
    {
        id: 'indigo',
        name: 'คลาสสิก',
        nameEn: 'Classic Indigo',
        primary: '#6366f1',
        secondary: '#818cf8',
        accent: '#4f46e5',
        gradient: 'from-indigo-500 via-purple-500 to-pink-500',
        gradientDark: 'from-indigo-600 via-purple-600 to-pink-600',
        icon: <Gem className="w-4 h-4" />,
        emoji: '💎',
        glow: '0 0 20px rgba(99, 102, 241, 0.5)',
        particleColor: '#6366f1',
    },
    {
        id: 'purple',
        name: 'รอยัล',
        nameEn: 'Royal Purple',
        primary: '#a855f7',
        secondary: '#c084fc',
        accent: '#9333ea',
        gradient: 'from-purple-500 via-fuchsia-500 to-pink-500',
        gradientDark: 'from-purple-600 via-fuchsia-600 to-pink-600',
        icon: <Crown className="w-4 h-4" />,
        emoji: '👑',
        glow: '0 0 20px rgba(168, 85, 247, 0.5)',
        particleColor: '#a855f7',
    },
    {
        id: 'blue',
        name: 'มหาสมุทร',
        nameEn: 'Ocean Blue',
        primary: '#3b82f6',
        secondary: '#60a5fa',
        accent: '#2563eb',
        gradient: 'from-blue-500 via-cyan-500 to-teal-500',
        gradientDark: 'from-blue-600 via-cyan-600 to-teal-600',
        icon: <Waves className="w-4 h-4" />,
        emoji: '🌊',
        glow: '0 0 20px rgba(59, 130, 246, 0.5)',
        particleColor: '#3b82f6',
    },
    {
        id: 'cyan',
        name: 'ไซเบอร์',
        nameEn: 'Cyber Neon',
        primary: '#06b6d4',
        secondary: '#22d3ee',
        accent: '#0891b2',
        gradient: 'from-cyan-400 via-blue-500 to-purple-600',
        gradientDark: 'from-cyan-500 via-blue-600 to-purple-700',
        icon: <Zap className="w-4 h-4" />,
        emoji: '⚡',
        glow: '0 0 25px rgba(6, 182, 212, 0.6)',
        particleColor: '#06b6d4',
    },
    {
        id: 'green',
        name: 'ธรรมชาติ',
        nameEn: 'Forest Green',
        primary: '#10b981',
        secondary: '#34d399',
        accent: '#059669',
        gradient: 'from-emerald-500 via-green-500 to-teal-500',
        gradientDark: 'from-emerald-600 via-green-600 to-teal-600',
        icon: <Leaf className="w-4 h-4" />,
        emoji: '🌿',
        glow: '0 0 20px rgba(16, 185, 129, 0.5)',
        particleColor: '#10b981',
    },
    {
        id: 'emerald',
        name: 'มรกต',
        nameEn: 'Emerald Jewel',
        primary: '#059669',
        secondary: '#10b981',
        accent: '#047857',
        gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
        gradientDark: 'from-emerald-500 via-teal-600 to-cyan-700',
        icon: <Star className="w-4 h-4" />,
        emoji: '💚',
        glow: '0 0 20px rgba(5, 150, 105, 0.5)',
        particleColor: '#059669',
    },
    {
        id: 'rose',
        name: 'โรแมนติก',
        nameEn: 'Rose Pink',
        primary: '#f43f5e',
        secondary: '#fb7185',
        accent: '#e11d48',
        gradient: 'from-rose-500 via-pink-500 to-fuchsia-500',
        gradientDark: 'from-rose-600 via-pink-600 to-fuchsia-600',
        icon: <Heart className="w-4 h-4" />,
        emoji: '🌹',
        glow: '0 0 20px rgba(244, 63, 94, 0.5)',
        particleColor: '#f43f5e',
    },
    {
        id: 'amber',
        name: 'พระอาทิตย์',
        nameEn: 'Sunset Amber',
        primary: '#f59e0b',
        secondary: '#fbbf24',
        accent: '#d97706',
        gradient: 'from-amber-500 via-orange-500 to-red-500',
        gradientDark: 'from-amber-600 via-orange-600 to-red-600',
        icon: <Flame className="w-4 h-4" />,
        emoji: '🌅',
        glow: '0 0 20px rgba(245, 158, 11, 0.5)',
        particleColor: '#f59e0b',
    },
    {
        id: 'violet',
        name: 'จักรวาล',
        nameEn: 'Cosmic Violet',
        primary: '#8b5cf6',
        secondary: '#a78bfa',
        accent: '#7c3aed',
        gradient: 'from-violet-500 via-purple-500 to-indigo-600',
        gradientDark: 'from-violet-600 via-purple-600 to-indigo-700',
        icon: <Globe className="w-4 h-4" />,
        emoji: '🌌',
        glow: '0 0 25px rgba(139, 92, 246, 0.6)',
        particleColor: '#8b5cf6',
    },
];

// Floating Particles Component
const FloatingParticles: React.FC<{ color: string; count?: number }> = ({ color, count = 15 }) => {
    const particles = useMemo(() => {
        return Array.from({ length: count }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 4 + 2,
            duration: Math.random() * 10 + 10,
            delay: Math.random() * 5,
        }));
    }, [count]);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full bg-[var(--p-color)]"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.size,
                        height: p.size,
                        '--p-color': color,
                        boxShadow: `0 0 ${p.size * 2}px var(--p-color)`,
                    } as React.CSSProperties}
                    animate={{
                        y: [0, -30, 0],
                        x: [0, 10, -10, 0],
                        opacity: [0.3, 0.8, 0.3],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: p.duration,
                        delay: p.delay,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    );
};

// Animated Background Gradient
const AnimatedGradientBg: React.FC<{ theme: ThemeConfig; isDarkMode: boolean }> = ({ theme, isDarkMode }) => {
    return (
        <motion.div
            className="absolute inset-0 opacity-30"
            animate={{
                background: [
                    `radial-gradient(circle at 0% 0%, ${theme.primary}40 0%, transparent 50%)`,
                    `radial-gradient(circle at 100% 100%, ${theme.secondary}40 0%, transparent 50%)`,
                    `radial-gradient(circle at 0% 100%, ${theme.accent}40 0%, transparent 50%)`,
                    `radial-gradient(circle at 100% 0%, ${theme.primary}40 0%, transparent 50%)`,
                    `radial-gradient(circle at 0% 0%, ${theme.primary}40 0%, transparent 50%)`,
                ],
            }}
            transition={{
                duration: 15,
                repeat: Infinity,
                ease: 'linear',
            }}
        />
    );
};

// Theme Card with 3D Effect
const ThemeCard: React.FC<{
    theme: ThemeConfig;
    isSelected: boolean;
    isDarkMode: boolean;
    onClick: () => void;
}> = ({ theme, isSelected, isDarkMode, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.button
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`
                relative p-4 rounded-2xl flex flex-col items-center gap-3 transition-all duration-300
                ${isSelected
                    ? 'ring-2 ring-offset-2'
                    : isDarkMode
                        ? 'bg-white/5 hover:bg-white/10'
                        : 'bg-slate-100 hover:bg-slate-200'
                }
                overflow-hidden group
            `}
            style={{
                '--tw-ring-color': isSelected ? theme.primary : 'transparent',
                '--tw-ring-offset-color': isDarkMode ? '#0f172a' : '#ffffff',
                boxShadow: isHovered ? theme.glow : 'none',
            } as React.CSSProperties}
        >
            {/* Animated Background on Hover */}
            <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300`}
            />

            {/* Shine Effect */}
            <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.3)_45%,transparent_50%)]"
                animate={isHovered ? {
                    backgroundPosition: ['200% 0', '-200% 0'],
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
            />

            {/* Icon Container with Glow */}
            <motion.div
                className="relative w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl shadow-lg bg-[linear-gradient(135deg,var(--t-primary),var(--t-secondary))]"
                style={{
                    '--t-primary': theme.primary,
                    '--t-secondary': theme.secondary,
                    boxShadow: isHovered || isSelected ? theme.glow : 'none',
                } as React.CSSProperties}
                animate={isSelected ? {
                    scale: [1, 1.1, 1],
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
            >
                {isSelected ? <Check className="w-6 h-6" /> : <span className="text-2xl">{theme.emoji}</span>}

                {/* Pulse Ring */}
                {isSelected && (
                    <motion.div
                        className="absolute inset-0 rounded-xl border-2 border-[var(--t-primary)]"
                        animate={{
                            scale: [1, 1.5],
                            opacity: [0.8, 0],
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                )}
            </motion.div>

            {/* Labels */}
            <div className="relative text-center z-10">
                <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    {theme.name}
                </p>
                <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {theme.nameEn}
                </p>
            </div>

            {/* Selected Badge */}
            {isSelected && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-lg"
                >
                    <Check className="w-3 h-3" style={{ color: theme.primary }} />
                </motion.div>
            )}
        </motion.button>
    );
};

// Mode Toggle Button
const ModeToggle: React.FC<{
    mode: 'light' | 'dark';
    isActive: boolean;
    isDarkMode: boolean;
    onClick: () => void;
    theme: ThemeConfig;
}> = ({ mode, isActive, isDarkMode, onClick, theme }) => {
    const Icon = mode === 'light' ? Sun : Moon;
    const label = mode === 'light' ? 'Light' : 'Dark';
    const emoji = mode === 'light' ? '☀️' : '🌙';

    return (
        <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClick}
            className={`
                relative p-5 rounded-2xl flex flex-col items-center gap-3 transition-all duration-300 overflow-hidden
                ${isActive
                    ? `bg-gradient-to-br ${theme.gradient} text-white shadow-xl`
                    : isDarkMode
                        ? 'bg-white/5 text-slate-400 hover:bg-white/10'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
            `}
            style={{
                boxShadow: isActive ? theme.glow : 'none',
            }}
        >
            {/* Animated Background for Active */}
            {isActive && (
                <motion.div
                    className="absolute inset-0 opacity-30"
                    animate={{
                        background: [
                            'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                            'radial-gradient(circle at 70% 70%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                            'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                        ],
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                />
            )}

            <motion.div
                animate={isActive ? { rotate: [0, 360] } : {}}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
                <Icon className="w-8 h-8 relative z-10" />
            </motion.div>

            <div className="relative z-10 text-center">
                <span className="text-lg font-bold block">{label}</span>
                <span className="text-xl">{emoji}</span>
            </div>
        </motion.button>
    );
};

interface ThemeEngineProps {
    isOpen: boolean;
    onClose: () => void;
    currentTheme: ThemeColor;
    isDarkMode: boolean;
    onThemeChange: (theme: ThemeColor) => void;
    onDarkModeToggle: () => void;
}

export const ThemeEngine: React.FC<ThemeEngineProps> = ({
    isOpen,
    onClose,
    currentTheme,
    isDarkMode,
    onThemeChange,
    onDarkModeToggle,
}) => {
    const currentThemeConfig = THEMES.find(t => t.id === currentTheme) || THEMES[0];
    const [previewTheme, setPreviewTheme] = useState<ThemeConfig>(currentThemeConfig);

    // Update CSS Variables when theme changes
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--theme-primary', currentThemeConfig.primary);
        root.style.setProperty('--theme-secondary', currentThemeConfig.secondary);
        root.style.setProperty('--theme-accent', currentThemeConfig.accent);
        root.style.setProperty('--theme-glow', currentThemeConfig.glow);
    }, [currentThemeConfig]);

    // Reset preview when panel opens
    useEffect(() => {
        if (isOpen) {
            setPreviewTheme(currentThemeConfig);
        }
    }, [isOpen, currentThemeConfig]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop with Blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-40"
                    />

                    {/* Main Panel */}
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className={`
                            fixed right-0 top-0 h-full w-96 z-50 overflow-hidden
                            ${isDarkMode
                                ? 'bg-slate-900/90 backdrop-blur-xl border-l border-white/10'
                                : 'bg-white/90 backdrop-blur-xl border-l border-slate-200'
                            }
                        `}
                    >
                        {/* Animated Background */}
                        <AnimatedGradientBg theme={previewTheme} isDarkMode={isDarkMode} />

                        {/* Floating Particles */}
                        <FloatingParticles color={previewTheme.particleColor} count={20} />

                        {/* Content */}
                        <div className="relative h-full overflow-y-auto p-6 space-y-8">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <motion.div
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="flex items-center gap-3"
                                >
                                    <motion.div
                                        className={`p-3 rounded-2xl bg-gradient-to-br ${previewTheme.gradient} shadow-xl`}
                                        style={{ boxShadow: previewTheme.glow }}
                                        animate={{ rotate: [0, 5, -5, 0] }}
                                        transition={{ duration: 4, repeat: Infinity }}
                                    >
                                        <Palette className="w-6 h-6 text-white" />
                                    </motion.div>
                                    <div>
                                        <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            Theme Engine
                                        </h3>
                                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            ✨ Customize Your Experience
                                        </p>
                                    </div>
                                </motion.div>

                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={onClose}
                                    className={`p-3 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                                >
                                    <X className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-slate-700'}`} />
                                </motion.button>
                            </div>

                            {/* Current Theme Preview Card */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className={`
                                    relative p-6 rounded-3xl overflow-hidden
                                    ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-slate-100 border border-slate-200'}
                                `}
                            >
                                {/* Gradient Overlay */}
                                <div
                                    className="absolute inset-0 js-dynamic-vars"
                                    style={{
                                        opacity: 0.3,
                                        '--dynamic-bg': `linear-gradient(135deg, ${previewTheme.primary}50, ${previewTheme.secondary}30, transparent)`,
                                    } as React.CSSProperties}
                                />

                                <div className="relative flex items-center gap-4">
                                    <motion.div
                                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl js-dynamic-bg js-dynamic-shadow"
                                        style={{
                                            '--dynamic-bg': `linear-gradient(135deg, ${previewTheme.primary}, ${previewTheme.secondary})`,
                                            '--dynamic-shadow': previewTheme.glow,
                                        } as React.CSSProperties}
                                        animate={{ scale: [1, 1.05, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        {previewTheme.emoji}
                                    </motion.div>
                                    <div>
                                        <p className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Current Theme
                                        </p>
                                        <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {previewTheme.name}
                                        </p>
                                        <p className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {previewTheme.nameEn}
                                        </p>
                                    </div>
                                </div>

                                {/* Color Swatches */}
                                <div className="relative mt-4 flex gap-2">
                                    {[previewTheme.primary, previewTheme.secondary, previewTheme.accent].map((color, i) => (
                                        <motion.div
                                            key={i}
                                            className="flex-1 h-8 rounded-lg js-dynamic-vars"
                                            style={{ backgroundColor: color, boxShadow: `0 4px 15px ${color}50` } as React.CSSProperties}
                                            whileHover={{ scale: 1.1, y: -2 }}
                                        />
                                    ))}
                                </div>
                            </motion.div>

                            {/* Display Mode Section */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" style={{ color: previewTheme.primary }} />
                                    <label className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                        Display Mode
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <ModeToggle
                                        mode="light"
                                        isActive={!isDarkMode}
                                        isDarkMode={isDarkMode}
                                        onClick={() => isDarkMode && onDarkModeToggle()}
                                        theme={previewTheme}
                                    />
                                    <ModeToggle
                                        mode="dark"
                                        isActive={isDarkMode}
                                        isDarkMode={isDarkMode}
                                        onClick={() => !isDarkMode && onDarkModeToggle()}
                                        theme={previewTheme}
                                    />
                                </div>
                            </motion.div>

                            {/* Theme Colors Grid */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-2">
                                    <Palette className="w-4 h-4" style={{ color: previewTheme.primary }} />
                                    <label className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                        Color Themes
                                    </label>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    {THEMES.map((theme, index) => (
                                        <motion.div
                                            key={theme.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 + index * 0.05 }}
                                        >
                                            <ThemeCard
                                                theme={theme}
                                                isSelected={currentTheme === theme.id}
                                                isDarkMode={isDarkMode}
                                                onClick={() => {
                                                    setPreviewTheme(theme);
                                                    onThemeChange(theme.id);
                                                }}
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Live Gradient Preview */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4" style={{ color: previewTheme.primary }} />
                                    <label className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                        Gradient Preview
                                    </label>
                                </div>

                                <motion.div
                                    className={`h-24 rounded-2xl bg-gradient-to-r ${previewTheme.gradient} flex items-center justify-center gap-3 shadow-xl overflow-hidden relative`}
                                    style={{ boxShadow: previewTheme.glow }}
                                    whileHover={{ scale: 1.02 }}
                                >
                                    {/* Animated Shine */}
                                    <motion.div
                                        className="absolute inset-0"
                                        style={{
                                            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, transparent 50%)',
                                        }}
                                        animate={{
                                            backgroundPosition: ['200% 0', '-200% 0'],
                                        }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                    />

                                    <motion.div
                                        animate={{ rotate: [0, 360] }}
                                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                                    >
                                        <Sparkles className="w-8 h-8 text-white drop-shadow-lg" />
                                    </motion.div>
                                    <span className="text-white font-black text-lg drop-shadow-lg relative z-10">
                                        {previewTheme.name} Theme
                                    </span>
                                </motion.div>
                            </motion.div>

                            {/* Apply Button */}
                            <motion.button
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                whileHover={{ scale: 1.03, y: -2 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={onClose}
                                className={`
                                    w-full py-5 bg-gradient-to-r ${previewTheme.gradient} text-white rounded-2xl 
                                    font-black text-lg shadow-2xl relative overflow-hidden
                                `}
                                style={{ boxShadow: previewTheme.glow }}
                            >
                                {/* Animated Background */}
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0"
                                    animate={{
                                        x: ['-100%', '100%'],
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />

                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    <Sparkles className="w-5 h-5" />
                                    Apply Theme
                                    <Sparkles className="w-5 h-5" />
                                </span>
                            </motion.button>

                            {/* Footer */}
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className={`text-center text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}
                            >
                                🎨 Theme Engine v2.0 • Designed with ❤️
                            </motion.p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ThemeEngine;
