import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GaugeChart } from './GaugeChart';
import { Activity, ShieldCheck, Zap, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface HealthScoreCockpitProps {
    performanceData: {
        score: number,
        utilization: number,
        lossRate: number,
        transitHealth: number,
        trend: number
    };
    isDarkMode: boolean;
}

export const HealthScoreCockpit: React.FC<HealthScoreCockpitProps> = ({
    performanceData,
    isDarkMode
}) => {
    const { score, utilization, lossRate, transitHealth, trend } = performanceData;

    const healthStatus = useMemo(() => {
        if (score >= 90) return { label: 'OPTIMAL', color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: 'System is running at peak efficiency.' };
        if (score >= 75) return { label: 'HEALTHY', color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Operations are stable and within limits.' };
        if (score >= 50) return { label: 'NEEDS ATTENTION', color: 'text-amber-500', bg: 'bg-amber-500/10', desc: 'Minor inefficiencies detected in pallet flow.' };
        return { label: 'CRITICAL', color: 'text-red-500', bg: 'bg-red-500/10', desc: 'Severe bottlenecks or high asset loss detected!' };
    }, [score]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            {/* Main Gauge Column */}
            <div className="lg:col-span-5 h-[340px]">
                <GaugeChart
                    value={score}
                    max={100}
                    title="Logistics Health Score (LQI)"
                    subtitle="Index of Asset Management Velocity"
                    isDarkMode={isDarkMode}
                    color={score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444"}
                />
            </div>

            {/* Metrics Breakdown Column */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Score Status Card */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900/60 border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl'}`}
                >
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500 opacity-40'}`}>System Status</p>
                            <h4 className={`text-2xl font-black ${healthStatus.color}`}>{healthStatus.label}</h4>
                        </div>
                        <div className={`p-3 rounded-2xl ${healthStatus.bg} ${healthStatus.color}`}>
                            {score >= 75 ? <ShieldCheck size={24} /> : <AlertCircle size={24} />}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                            {healthStatus.desc}
                        </p>
                        <div className="flex items-center gap-2">
                            {trend >= 0 ? <TrendingUp className="text-emerald-500" size={16} /> : <TrendingDown className="text-red-500" size={16} />}
                            <span className={`text-xs font-black ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {trend >= 0 ? '+' : ''}{trend}% from last period
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Sub-metrics Cards */}
                <div className="grid grid-cols-1 gap-4">
                    <div className={`p-5 rounded-3xl border flex items-center justify-between ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-indigo-500 text-white shadow-lg"><Zap size={20} /></div>
                            <div>
                                <p className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500 opacity-40'}`}>Utilization Rate</p>
                                <p className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{utilization}%</p>
                            </div>
                        </div>
                        <div className="h-1.5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${utilization}%` }}
                                className="h-full bg-indigo-500"
                            />
                        </div>
                    </div>

                    <div className={`p-5 rounded-3xl border flex items-center justify-between ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-lg"><Activity size={20} /></div>
                            <div>
                                <p className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500 opacity-40'}`}>Network Health</p>
                                <p className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{transitHealth}%</p>
                            </div>
                        </div>
                        <div className="h-1.5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${transitHealth}%` }}
                                className="h-full bg-emerald-500"
                            />
                        </div>
                    </div>

                    <div className={`p-5 rounded-3xl border flex items-center justify-between ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-rose-500 text-white shadow-lg"><TrendingDown size={20} /></div>
                            <div>
                                <p className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500 opacity-40'}`}>Asset Loss Rate</p>
                                <p className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{lossRate}%</p>
                            </div>
                        </div>
                        <div className="h-1.5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(0, 100 - (lossRate * 10))}%` }}
                                className="h-full bg-rose-500"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
