
import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, Calendar, ArrowRight, TrendingDown, ShieldCheck, Info, Send } from 'lucide-react';
import { StockPrediction } from '../../services/analyticsService';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import * as TelegramService from '../../services/telegramService';
import Swal from 'sweetalert2';

interface PredictiveStockAlertsProps {
    predictions: StockPrediction[];
    isDarkMode: boolean;
}

export const PredictiveStockAlerts: React.FC<PredictiveStockAlertsProps> = ({ predictions, isDarkMode }) => {
    if (predictions.length === 0) {
        return (
            <div className={`p-8 rounded-3xl border flex flex-col items-center justify-center text-center gap-4 ${isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-100'}`}>
                <div className="p-4 rounded-full bg-emerald-50 text-emerald-500">
                    <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                    <h4 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>สต็อกอยู่ในระดับปลอดภัย</h4>
                    <p className="text-sm text-slate-500">AI วิเคราะห์แล้วว่ายังไม่มีสาขาใดเสี่ยงสต็อกขาดภายใน 14 วันนี้</p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predictions.map((p, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`
                        p-5 rounded-3xl border relative overflow-hidden group
                        ${p.status === 'Critical'
                            ? (isDarkMode ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200')
                            : p.status === 'Warning'
                                ? (isDarkMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200')
                                : (isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200')}
                    `}
                >
                    {/* Status Badge */}
                    <div className="flex justify-between items-start mb-4">
                        <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1
                            ${p.status === 'Critical' ? 'bg-red-500 text-white' : p.status === 'Warning' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'}
                        `}>
                            {p.status === 'Critical' ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {p.status === 'Critical' ? 'Critical Depletion' : p.status === 'Warning' ? 'Warning' : 'Forecasted'}
                        </div>
                        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                            <TrendingDown className={`w-4 h-4 ${p.status === 'Critical' ? 'text-red-500' : 'text-amber-500'}`} />
                        </div>
                    </div>

                    {/* Branch & Pallet Info */}
                    <div className="mb-4">
                        <h4 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} leading-tight`}>
                            {p.branchName}
                        </h4>
                        <p className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {p.palletName}
                        </p>
                    </div>

                    {/* Prediction Stat */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-black/20' : 'bg-white/60'}`}>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">สต็อกปัจจุบัน</p>
                            <p className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{p.currentStock.toLocaleString()}</p>
                        </div>
                        <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-black/20' : 'bg-white/60'}`}>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">คาดว่าจะหมดใน</p>
                            <p className={`text-lg font-black ${p.status === 'Critical' ? 'text-red-500' : 'text-amber-500'}`}>~{p.daysUntilEmpty} วัน</p>
                        </div>
                    </div>

                    {/* AI Recommendation */}
                    <div className={`p-3 rounded-2xl mb-4 border border-dashed ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-indigo-200 bg-white/80'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-3 h-3 text-indigo-500" />
                            <span className="text-[10px] font-black text-indigo-600 uppercase">AI Recommendation</span>
                        </div>
                        <p className={`text-xs font-medium leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            ควรเติมพาเลทอย่างน้อย <span className="font-bold underline">{p.recommendedReplenishment.toLocaleString()} ตัว</span> ก่อนวันที่ {format(new Date(p.predictedDate), 'd MMM yy', { locale: th })}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all 
                            ${isDarkMode
                                ? 'bg-white/10 hover:bg-white/20 text-white'
                                : 'bg-white hover:bg-slate-50 text-slate-700 shadow-sm border border-slate-200'}`}
                        >
                            สร้างใบเบิกโอน
                            <ArrowRight className="w-3 h-3" />
                        </button>

                        <button
                            onClick={async () => {
                                try {
                                    // Use a default chat ID or prompt (for demo, we'll use a common group ID if known)
                                    // In a real app, this would be in settings.
                                    const chatId = "-1002364024467"; // Placeholder for Ops Group
                                    const message = TelegramService.formatStockDepletionAlert({
                                        branchName: p.branchName,
                                        palletName: p.palletName,
                                        currentStock: p.currentStock,
                                        dailyConsumption: p.burnRate,
                                        daysToExhaustion: p.daysUntilEmpty,
                                        probability: p.status === 'Critical' ? 0.9 : 0.6
                                    });

                                    await TelegramService.sendMessage(chatId, message);

                                    Swal.fire({
                                        icon: 'success',
                                        title: 'ส่งแจ้งเตือนสำเร็จ!',
                                        text: `ส่งข้อความแจ้งเตือนไปที่กลุ่ม Telegram เรียบร้อยแล้ว`,
                                        timer: 2000,
                                        showConfirmButton: false,
                                        toast: true,
                                        position: 'top-end'
                                    });
                                } catch (error) {
                                    Swal.fire({
                                        icon: 'error',
                                        title: 'เกิดข้อผิดพลาด',
                                        text: 'ไม่สามารถส่งข้อความไปที่ Telegram ได้'
                                    });
                                }
                            }}
                            className={`p-2.5 rounded-xl text-white transition-all shadow-lg theme-bg-primary theme-shadow-primary flex items-center justify-center`}
                            title="ส่งแจ้งเตือนเข้ากลุ่ม Telegram"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Hover Glow */}
                    <div className={`absolute -bottom-1 -right-1 w-12 h-12 blur-2xl opacity-20 pointer-events-none rounded-full
                        ${p.status === 'Critical' ? 'bg-red-500' : 'bg-amber-500'}`}
                    />
                </motion.div>
            ))}
        </div>
    );
};
