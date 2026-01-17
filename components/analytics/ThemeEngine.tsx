import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Moon, Sun, X, Check, Sparkles } from 'lucide-react';

export type ThemeColor = 'indigo' | 'purple' | 'blue' | 'green' | 'rose' | 'amber';

export interface ThemeConfig {
    id: ThemeColor;
    name: string;
    nameEn: string;
    primary: string;
    secondary: string;
    accent: string;
    gradient: string;
    icon: string;
}

export const THEMES: ThemeConfig[] = [
    {
        id: 'indigo',
        name: 'คลาสสิก',
        nameEn: 'Classic Indigo',
        primary: '#6366f1',
        secondary: '#818cf8',
        accent: '#4f46e5',
        gradient: 'from-indigo-500 to-purple-500',
        icon: '💎',
    },
    {
        id: 'purple',
        name: 'รอยัล',
        nameEn: 'Royal Purple',
        primary: '#a855f7',
        secondary: '#c084fc',
        accent: '#9333ea',
        gradient: 'from-purple-500 to-pink-500',
        icon: '👑',
    },
    {
        id: 'blue',
        name: 'มหาสมุทร',
        nameEn: 'Ocean Blue',
        primary: '#3b82f6',
        secondary: '#60a5fa',
        accent: '#2563eb',
        gradient: 'from-blue-500 to-cyan-500',
        icon: '🌊',
    },
    {
        id: 'green',
        name: 'ธรรมชาติ',
        nameEn: 'Forest Green',
        primary: '#10b981',
        secondary: '#34d399',
        accent: '#059669',
        gradient: 'from-emerald-500 to-teal-500',
        icon: '🌿',
    },
    {
        id: 'rose',
        name: 'โรแมนติก',
        nameEn: 'Rose Pink',
        primary: '#f43f5e',
        secondary: '#fb7185',
        accent: '#e11d48',
        gradient: 'from-rose-500 to-pink-500',
        icon: '🌹',
    },
    {
        id: 'amber',
        name: 'พระอาทิตย์',
        nameEn: 'Sunset Amber',
        primary: '#f59e0b',
        secondary: '#fbbf24',
        accent: '#d97706',
        gradient: 'from-amber-500 to-orange-500',
        icon: '🌅',
    },
];

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

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className={`fixed right-0 top-0 h-full w-80 z-50 shadow-2xl overflow-y-auto ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
                            }`}
                    >
                        <div className="p-6 space-y-8">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b pb-4 border-slate-700/50">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Palette className="w-5 h-5 text-indigo-500" />
                                    Theme Engine
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                                    title="ปิด"
                                    aria-label="ปิด"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Current Theme Preview */}
                            <div
                                className={`p-4 rounded-2xl relative overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'
                                    }`}
                            >
                                <div
                                    className="absolute inset-0 opacity-20"
                                    style={{
                                        background: `linear-gradient(135deg, ${currentThemeConfig.primary}, ${currentThemeConfig.secondary})`,
                                    } as React.CSSProperties}
                                />
                                <div className="relative flex items-center gap-3">
                                    <span className="text-3xl">{currentThemeConfig.icon}</span>
                                    <div>
                                        <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            ธีมปัจจุบัน
                                        </p>
                                        <p className="font-bold">{currentThemeConfig.name}</p>
                                        <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {currentThemeConfig.nameEn}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Dark Mode Toggle */}
                            <div className="space-y-3">
                                <label className={`text-sm font-semibold uppercase tracking-wider ${isDarkMode ? 'opacity-60' : 'text-slate-600'}`}>
                                    โหมดการแสดงผล
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => isDarkMode && onDarkModeToggle()}
                                        className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${!isDarkMode
                                                ? 'bg-amber-500/20 border-2 border-amber-500 text-amber-500'
                                                : isDarkMode
                                                    ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        <Sun className="w-6 h-6" />
                                        <span className="text-sm font-medium">Light</span>
                                    </button>
                                    <button
                                        onClick={() => !isDarkMode && onDarkModeToggle()}
                                        className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${isDarkMode
                                                ? 'bg-indigo-500/20 border-2 border-indigo-500 text-indigo-400'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        <Moon className="w-6 h-6" />
                                        <span className="text-sm font-medium">Dark</span>
                                    </button>
                                </div>
                            </div>

                            {/* Theme Colors */}
                            <div className="space-y-3">
                                <label className={`text-sm font-semibold uppercase tracking-wider ${isDarkMode ? 'opacity-60' : 'text-slate-600'}`}>
                                    สีธีม
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {THEMES.map((theme) => {
                                        const isSelected = currentTheme === theme.id;
                                        return (
                                            <motion.button
                                                key={theme.id}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => onThemeChange(theme.id)}
                                                className={`relative p-3 rounded-xl flex items-center gap-3 transition-all ${isSelected
                                                        ? 'ring-2 ring-offset-2'
                                                        : isDarkMode
                                                            ? 'bg-slate-800 hover:bg-slate-700'
                                                            : 'bg-slate-100 hover:bg-slate-200'
                                                    }`}
                                                style={{
                                                    '--tw-ring-color': isSelected ? theme.primary : 'transparent',
                                                    '--tw-ring-offset-color': isDarkMode ? '#0f172a' : '#ffffff',
                                                } as React.CSSProperties}
                                            >
                                                {/* Color Preview */}
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
                                                    style={{ backgroundColor: theme.primary } as React.CSSProperties}
                                                >
                                                    {isSelected ? <Check className="w-4 h-4" /> : theme.icon}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-medium">{theme.name}</p>
                                                    <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                        {theme.nameEn}
                                                    </p>
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Color Preview Swatches */}
                            <div className="space-y-3">
                                <label className={`text-sm font-semibold uppercase tracking-wider ${isDarkMode ? 'opacity-60' : 'text-slate-600'}`}>
                                    ตัวอย่างสี
                                </label>
                                <div className="flex gap-2">
                                    <div
                                        className="flex-1 h-12 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                                        style={{ backgroundColor: currentThemeConfig.primary } as React.CSSProperties}
                                    >
                                        Primary
                                    </div>
                                    <div
                                        className="flex-1 h-12 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                                        style={{ backgroundColor: currentThemeConfig.secondary } as React.CSSProperties}
                                    >
                                        Secondary
                                    </div>
                                    <div
                                        className="flex-1 h-12 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                                        style={{ backgroundColor: currentThemeConfig.accent } as React.CSSProperties}
                                    >
                                        Accent
                                    </div>
                                </div>
                                <div
                                    className={`h-16 rounded-xl bg-gradient-to-r ${currentThemeConfig.gradient} flex items-center justify-center gap-2`}
                                >
                                    <Sparkles className="w-5 h-5 text-white" />
                                    <span className="text-white font-bold text-sm">Gradient Preview</span>
                                </div>
                            </div>

                            {/* Apply Button */}
                            <button
                                onClick={onClose}
                                className={`w-full py-4 bg-gradient-to-r ${currentThemeConfig.gradient} text-white rounded-2xl font-bold shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all`}
                            >
                                ✨ ใช้ธีมนี้
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ThemeEngine;
