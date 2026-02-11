import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Transaction, PalletId } from '../../types';
import { getAgingRentalAnalysis, AgingRentalSummary } from '../../services/analyticsService';
import { Calendar, AlertTriangle, DollarSign, Clock, ArrowRight } from 'lucide-react';

interface AgingRentalReportProps {
    transactions: Transaction[];
    isDarkMode: boolean;
}

export const AgingRentalReport: React.FC<AgingRentalReportProps> = ({ transactions, isDarkMode }) => {
    const analysis = useMemo(() => getAgingRentalAnalysis(transactions), [transactions]);

    return (
        <div className="space-y-8">
            {/* Accrual Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                    whileHover={{ y: -5 }}
                    className={`p-6 rounded-[2.5rem] border ${isDarkMode ? 'bg-slate-900/60 border-blue-500/20 shadow-2xl' : 'bg-white border-blue-100 shadow-xl'}`}
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ยอดค่าเช่าสะสม</p>
                            <h3 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                ฿{analysis.totalAccruedRent.toLocaleString()}
                            </h3>
                        </div>
                    </div>
                    <div className="text-xs font-bold text-slate-400 italic">
                        คำนวณหลังจากครบ 10 วัน (Free Period)
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ y: -5 }}
                    className={`p-6 rounded-[2.5rem] border ${isDarkMode ? 'bg-slate-900/60 border-red-500/20 shadow-2xl' : 'bg-white border-red-100 shadow-xl'}`}
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-red-500/10 text-red-500">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>พาเลทเกินกำหนดคืน</p>
                            <h3 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {analysis.totalOverdueQty.toLocaleString()} <span className="text-sm opacity-50">ใบ</span>
                            </h3>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ y: -5 }}
                    className={`p-6 rounded-[2.5rem] border ${isDarkMode ? 'bg-slate-900/60 border-purple-500/20 shadow-2xl' : 'bg-white border-purple-100 shadow-xl'}`}
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>เอกสารเงินยืมที่ยังเปิดอยู่</p>
                            <h3 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {analysis.loans.length} <span className="text-sm opacity-50">ฉบับ</span>
                            </h3>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Partner Summary Table (Loan Liability Monitoring) */}
            <div className={`rounded-[2.5rem] border overflow-hidden ${isDarkMode ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-100 shadow-xl'}`}>
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>📊 ตารางสรุปภาระหนี้พาเลท (Loan Liability Monitoring)</h3>
                    <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest">
                        v2.0.0 Business Engine
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={isDarkMode ? 'bg-white/5' : 'bg-slate-50'}>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">คู่ค้า (Partner)</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">ประเภท</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">ยอดรับรวม</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">คืนแล้ว</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">คงค้าง (ยอดหนี้)</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">สถานะ/อัตรา</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">อายุเฉลี่ย (วัน)</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">ค่าเช่าค้างจ่าย (Accrued)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(analysis.partnerSummaries).map(([id, summary]: [string, any]) => (
                                <tr key={id} className={`border-b ${isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-50 hover:bg-slate-50'} transition-colors`}>
                                    <td className="px-6 py-4">
                                        <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{summary.name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${summary.palletId.includes('red') ? 'bg-red-500/10 text-red-500' :
                                            summary.palletId.includes('blue') ? 'bg-blue-500/10 text-blue-500' :
                                                summary.palletId.includes('yellow') ? 'bg-yellow-500/10 text-yellow-500' : 'bg-slate-500/10 text-slate-500'
                                            }`}>
                                            {summary.palletId.replace('loscam_', '').toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-500">{summary.totalIn.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center text-xs font-bold text-emerald-500">{summary.totalOut.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className={`text-sm font-bold ${summary.openQty !== 0 ? 'text-blue-500' : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`}>
                                            {summary.openQty.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {summary.currentRate > 0 ? (
                                            <span className="text-xs font-black text-blue-600">฿{summary.currentRate.toFixed(2)}</span>
                                        ) : (
                                            <span className={`text-[10px] font-bold ${isDarkMode ? 'text-emerald-400/50' : 'text-emerald-500/50'}`}>FREE</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className={`text-xs font-bold ${summary.avgAge > 10 ? 'text-red-500' : (isDarkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                                            {summary.avgAge} <span className="opacity-40">วัน</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-blue-500 text-sm">฿{summary.rent.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detailed Loan List (Aging Report) */}
            <div className={`rounded-[2.5rem] border overflow-hidden ${isDarkMode ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-100 shadow-xl'}`}>
                <div className="p-6 border-b border-white/5">
                    <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Detailed Aging Report (FIFO)</h3>
                </div>
                <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className={isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}>
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Doc No / Date</th>
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Partner</th>
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Age</th>
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Qty</th>
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Rent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analysis.loans.map((loan, idx) => (
                                <tr key={idx} className={`border-b ${isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-50 hover:bg-slate-50'}`}>
                                    <td className="px-6 py-4">
                                        <div className="font-mono text-xs font-bold">{loan.docNo}</div>
                                        <div className="text-[10px] text-slate-500">{loan.borrowDate}</div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold">{loan.partnerName}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black ${loan.ageDays > 10 ? 'bg-red-500/10 text-red-500' :
                                            loan.ageDays >= 8 ? 'bg-orange-500/10 text-orange-500' :
                                                'bg-green-500/10 text-green-500'
                                            }`}>
                                            {loan.ageDays} DAYS
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold">{loan.qty}</td>
                                    <td className="px-6 py-4 text-right font-black text-xs">฿{loan.accruedRent.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
