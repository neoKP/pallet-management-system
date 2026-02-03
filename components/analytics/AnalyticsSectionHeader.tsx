import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface AnalyticsSectionHeaderProps {
    title: string;
    subtitle: string;
    icon: LucideIcon;
    bgIcon?: LucideIcon;
    isDarkMode: boolean;
    color?: string;
}

export const AnalyticsSectionHeader: React.FC<AnalyticsSectionHeaderProps> = ({
    title,
    subtitle,
    icon: Icon,
    bgIcon: BgIcon,
    isDarkMode,
    color = 'var(--theme-primary)'
}) => {
    return (
        <div className="relative mb-10 mt-16 group">
            {/* Background Decorative Icon */}
            {BgIcon && (
                <div className="absolute -top-12 -left-8 opacity-[0.03] dark:opacity-[0.05] pointer-events-none group-hover:scale-110 group-hover:rotate-6 transition-transform duration-1000">
                    <BgIcon size={180} />
                </div>
            )}

            <div className="relative flex items-center gap-6">
                <motion.div
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 1, type: 'spring' }}
                    className="p-4 rounded-3xl shadow-xl flex items-center justify-center text-white"
                    style={{
                        backgroundColor: color,
                        boxShadow: `0 10px 30px ${color}30`
                    }}
                >
                    <Icon size={32} />
                </motion.div>

                <div className="space-y-1">
                    <h2 className={`text-3xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {title}
                    </h2>
                    <p className={`text-sm font-bold uppercase tracking-[0.2em] opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {subtitle}
                    </p>
                </div>

                <div className="flex-1 h-px bg-gradient-to-r from-slate-500/20 via-slate-500/10 to-transparent ml-4" />
            </div>
        </div>
    );
};
