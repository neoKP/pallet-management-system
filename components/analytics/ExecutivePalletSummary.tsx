import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Info, ArrowRight } from 'lucide-react';
import { AgingRentalSummary } from '../../services/analyticsService';

import { EXTERNAL_PARTNERS } from '../../constants';

interface ExecutivePalletSummaryProps {
    analysis: AgingRentalSummary;
}

export const ExecutivePalletSummary: React.FC<ExecutivePalletSummaryProps> = ({ analysis }) => {
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
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <TrendingDown className="text-emerald-500" />
                    Pallet Executive Summary (สรุปผู้บริหาร)
                </h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {summaries.map((p) => (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={p.id}
                        className="glass bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${p.totalRent > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'
                                    }`}>
                                    {p.name.substring(0, 1)}
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900">{p.name}</h4>
                                    <div className="flex gap-2 mt-1">
                                        {p.pallets.map((pl: any) => (
                                            <span key={pl.palletId} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">
                                                {pl.palletId.replace('loscam_', '')}: {pl.openQty}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-12 bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ยอดค้างคืนรวม</p>
                                    <p className="text-xl font-black text-slate-900">{p.totalQty.toLocaleString()} <span className="text-xs font-bold text-slate-400">ใบ</span></p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">สถานะ/อัตรา</p>
                                    <div className="flex items-center gap-1">
                                        {p.currentRate > 0 ? (
                                            <span className="text-sm font-black text-blue-600">฿{p.currentRate.toFixed(2)}</span>
                                        ) : p.gracePeriod > 0 ? (
                                            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                                                <CheckCircle size={12} /> ฟรี ({p.gracePeriod} วัน)
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                                ไม่มีค่าเช่า
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="col-span-2 md:col-span-1 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-6">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ค่าเช่าสะสม</p>
                                    <p className={`text-xl font-black ${p.totalRent > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                        ฿{p.totalRent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className={`mt-4 p-3 rounded-xl flex items-start gap-3 border ${p.dangerQty > 0 ? 'bg-orange-50 border-orange-100 text-orange-700' : 'bg-blue-50/50 border-blue-100 text-blue-700'
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
                                className="self-center p-2 rounded-full bg-white text-slate-400 hover:text-blue-600 transition-all border border-slate-100 shadow-sm"
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
