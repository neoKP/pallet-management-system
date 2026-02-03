import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Info, ArrowRight } from 'lucide-react';
import { AgingRentalSummary } from '../../services/analyticsService';
import { EXTERNAL_PARTNERS } from '../../constants';

interface ExecutivePalletSummaryProps {
    analysis: AgingRentalSummary;
    isDarkMode: boolean;
}

export const ExecutivePalletSummary: React.FC<ExecutivePalletSummaryProps> = ({ analysis, isDarkMode }) => {
    const summaries = useMemo(() => {
        const partners: Record<string, any> = {};

        Object.entries(analysis.partnerSummaries).forEach(([key, s]: [string, any]) => {
            const partnerId = key.split('_')[0];
            const partnerConfig = EXTERNAL_PARTNERS.find(p => p.id === partnerId);

            if (!partners[partnerId]) {
                partners[partnerId] = {
                    id: partnerId,
                    name: s.name,
                    totalQty: 0,
                    totalRent: 0,
                    dangerQty: 0,
                    currentRate: s.currentRate || 0,
                    gracePeriod: partnerConfig?.gracePeriod || 0,
                    rentalFee: partnerConfig?.rentalFee || 0,
                    pallets: []
                };
            }
            partners[partnerId].totalQty += s.openQty;
            partners[partnerId].totalRent += s.rent;
            partners[partnerId].dangerQty += s.dangerCount;
            partners[partnerId].pallets.push(s);
        });

        return Object.values(partners).sort((a, b) => b.totalRent - a.totalRent || b.totalQty - a.totalQty);
    }, [analysis]);

    const getActionRecommendation = (p: any) => {
        if (p.id === 'loscam_wangnoi') {
            if (p.totalQty > 2000 && p.totalQty < 2100) return `คืนเพิ่มอีก ${p.totalQty - 2000} ใบ เพื่อให้ยอดต่ำกว่า Tier 2,000`;
            if (p.totalQty > 3000 && p.totalQty < 3100) return `คืนเพิ่มอีก ${p.totalQty - 3000} ใบ เพื่อให้ยอดต่ำกว่า Tier 3,000`;
            return 'คืนพาเลทที่ถือครองนานที่สุดไปที่ "Loscam วังน้อย" เพื่อลดค่าเช่าสะสม';
        }
        if (p.id === 'sino') {
            if (p.dangerQty > 0) return `มี ${p.dangerQty} ใบ เกิน 10 วัน! รีบคืนด่วนเพื่อหยุดค่าเช่า`;
            return 'คืนพาเลทล็อตที่ใกล้ครบ 10 วันก่อน (Grace Period)';
        }
        if (p.totalQty > 0) return 'ตรวจเช็คยอดค้างและวางแผนรับคืนตามรอบขนส่ง';
        return 'ไม่มีภาระหนี้ค้างชำระ';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className={`text-lg font-black flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <TrendingDown className="text-emerald-500" />
                    Pallet Executive Summary (สรุปผู้บริหาร)
                </h3>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {summaries.map((p) => (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={p.id}
                        className={`p-5 sm:p-6 rounded-[2.5rem] border transition-all overflow-hidden relative ${isDarkMode
                            ? 'bg-slate-900/40 border-white/5 shadow-2xl'
                            : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
                            }`}
                    >
                        <div className="flex flex-col gap-6">
                            {/* Top Section: Identity & Pallet Tags */}
                            <div className="flex items-center gap-5 w-full">
                                <div className={`w-14 h-14 flex-shrink-0 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner ${p.totalRent > 0
                                    ? (isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600')
                                    : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500')
                                    }`}>
                                    {p.name.substring(0, 1)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className={`text-xl font-black truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{p.name}</h4>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {p.pallets.map((pl: any) => (
                                            <span key={pl.palletId} className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-tight ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                {pl.palletId.replace('loscam_', '')}: <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{pl.openQty}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Section: Stat Bar - Robust Grid */}
                            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-y-3 gap-x-2 p-4 rounded-3xl border w-full ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="min-w-0">
                                    <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ยอดค้างคืนรวม</p>
                                    <div className="flex items-baseline gap-1.5 min-w-0">
                                        <span className={`text-base sm:text-lg font-black truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{p.totalQty.toLocaleString()}</span>
                                        <span className="text-xs font-bold opacity-40 uppercase">ใบ</span>
                                    </div>
                                </div>

                                <div className="min-w-0 border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-4 border-black/5 dark:border-white/10">
                                    <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>สถานะ/อัตรา</p>
                                    <div className="flex items-center min-h-[1.75rem] min-w-0">
                                        {p.currentRate > 0 ? (
                                            <div className="flex items-baseline gap-1 min-w-0">
                                                <span className={`text-sm sm:text-base font-black truncate ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{p.currentRate.toFixed(2)}</span>
                                                <span className="text-[8px] font-bold opacity-40 flex-shrink-0 whitespace-nowrap">฿/วัน</span>
                                            </div>
                                        ) : p.gracePeriod > 0 ? (
                                            <span className={`text-xs font-black flex items-center gap-1.5 py-1 px-3 rounded-lg truncate ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                                <CheckCircle size={14} className="flex-shrink-0" /> ฟรี ({p.gracePeriod} วัน)
                                            </span>
                                        ) : (
                                            <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg border leading-none ${isDarkMode ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                                                ไม่มีค่าเช่า
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="min-w-0 border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 sm:pl-6 border-black/5 dark:border-white/10">
                                    <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ค่าเช่าสะสม</p>
                                    <div className="flex items-baseline gap-1 min-w-0">
                                        <span className={`text-base sm:text-lg font-black truncate ${p.totalRent > 0 ? (isDarkMode ? 'text-red-400' : 'text-red-600') : (isDarkMode ? 'text-white' : 'text-slate-900')}`}>
                                            ฿{p.totalRent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={`mt-4 p-3 rounded-xl flex items-start gap-3 border ${p.dangerQty > 0
                            ? (isDarkMode ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-orange-50 border-orange-100 text-orange-700')
                            : (isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50/50 border-blue-100 text-blue-700')
                            }`}>
                            <div className="mt-0.5">
                                {p.dangerQty > 0 ? <AlertTriangle size={16} /> : <Info size={16} />}
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold uppercase tracking-tight mb-0.5">คำแนะนำ (Recommended Action):</p>
                                <p className="text-sm font-black">{getActionRecommendation(p)}</p>
                            </div>
                            <button
                                title="View Details"
                                className={`self-center p-2 rounded-full transition-all border shadow-sm ${isDarkMode ? 'bg-slate-800 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-100 text-slate-400 hover:text-blue-600'}`}
                            >
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
