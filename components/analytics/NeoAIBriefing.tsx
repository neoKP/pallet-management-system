import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Sparkles, RefreshCcw, Activity, ChevronRight, Zap } from 'lucide-react';

interface NeoAIBriefingProps {
    insight: string;
    onRefresh: () => void;
    isDarkMode: boolean;
    isRefreshing?: boolean;
}

export const NeoAIBriefing: React.FC<NeoAIBriefingProps> = ({
    insight,
    onRefresh,
    isDarkMode,
    isRefreshing
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            data-pdf-export="insight"
            className={`
                group relative p-8 md:p-10 rounded-[3.5rem] overflow-hidden transition-all duration-700
                ${isDarkMode
                    ? 'bg-slate-950/40 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)]'
                    : 'bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)]'}
            `}
        >
            {/* Ambient Animated Glows */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-fuchsia-500/10 blur-[100px] rounded-full animate-pulse opacity-50" />

            <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-center lg:items-start">

                {/* Robot Avatar Section */}
                <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500/30 blur-2xl rounded-3xl animate-pulse" />
                        <div className={`
                            relative w-24 h-24 rounded-[2rem] flex items-center justify-center border-2
                            ${isDarkMode ? 'bg-indigo-600 border-white/20' : 'bg-indigo-500 border-indigo-200'}
                            shadow-[0_15px_35px_rgba(79,70,229,0.3)]
                        `}>
                            <Bot className="w-12 h-12 text-white" />
                        </div>
                    </div>
                    <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/5 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">NEO AI 3.0</span>
                    </div>
                </div>

                {/* Main Content Body */}
                <div className="flex-1 space-y-6 text-center lg:text-left">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-center lg:justify-start gap-2">
                            <Sparkles className="w-4 h-4 text-orange-400" />
                            <span className={`text-[11px] font-black uppercase tracking-[0.25em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                DAILY BRIEFING • INTELLIGENCE REPORT
                            </span>
                        </div>
                        <h2 className={`text-xl md:text-2xl font-black leading-tight tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            "{insight}"
                        </h2>
                    </div>

                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all
                                ${isDarkMode
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500'
                                    : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700'}
                            `}
                        >
                            <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            REFRESH INSIGHTS
                        </motion.button>

                        <div className={`
                            flex items-center gap-2 px-5 py-3 rounded-2xl border backdrop-blur-md
                            ${isDarkMode ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'}
                        `}>
                            <Activity className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.1em]">ANALYSIS: 98.4% CONFIDENCE</span>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Cards Right Side */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-4 w-full lg:w-72">
                    <div className={`
                        p-4 rounded-3xl border flex-1 transition-all duration-500
                        ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-sm'}
                    `}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>STATUS</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className={`text-sm font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>All Nodes Healthy</span>
                        </div>
                    </div>

                    <div className={`
                        p-4 rounded-3xl border flex-1 transition-all duration-500
                        ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-sm'}
                    `}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>NEXT ACTION</span>
                        </div>
                        <div className="flex items-center justify-between group/action cursor-pointer">
                            <span className="text-sm font-black text-indigo-500 group-hover:text-indigo-400">Check Hub Returns</span>
                            <ChevronRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </div>

            </div>
        </motion.div>
    );
};
