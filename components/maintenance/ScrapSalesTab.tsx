import React, { useMemo } from 'react';
import { Trash2, TrendingUp, Package, History } from 'lucide-react';
import { Transaction } from '../../types';
import { PALLET_TYPES } from '../../constants';
import ScrappedReportTable from './ScrappedReportTable';

interface ScrapSalesTabProps {
    transactions: Transaction[];
}

const ScrapSalesTab: React.FC<ScrapSalesTabProps> = ({ transactions }) => {
    // Parse scrap quantity helper
    const getScrapQty = (noteExtended: string) => {
        const match = noteExtended.match(/SCRAP:\s*(\d+)/);
        return match ? parseInt(match[1]) : 0;
    };

    // Filter relevant transactions
    const scrappedTransactions = useMemo(() => {
        return transactions.filter((tx: Transaction) =>
            tx.type === 'MAINTENANCE' &&
            tx.status === 'COMPLETED' &&
            tx.noteExtended?.includes('SCRAP:')
        );
    }, [transactions]);

    // Calculate Metrics
    const metrics = useMemo(() => {
        const totalScrapped = scrappedTransactions.reduce((sum: number, tx: Transaction) => sum + getScrapQty(tx.noteExtended || ''), 0);
        const waitingForSale = scrappedTransactions
            .filter((tx: Transaction) => !tx.scrapRevenue)
            .reduce((sum: number, tx: Transaction) => sum + getScrapQty(tx.noteExtended || ''), 0);
        const soldQty = totalScrapped - waitingForSale;
        const totalRevenue = scrappedTransactions.reduce((sum: number, tx: Transaction) => sum + (tx.scrapRevenue || 0), 0);

        return { totalScrapped, waitingForSale, soldQty, totalRevenue };
    }, [scrappedTransactions]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass p-6 rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-red-50 rounded-2xl text-red-600">
                            <Trash2 size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">พาเลทเสียสะสม</p>
                            <h3 className="text-2xl font-black text-slate-900">{metrics.totalScrapped.toLocaleString()} <span className="text-sm font-bold">ตัว</span></h3>
                        </div>
                    </div>
                </div>

                <div className="glass p-6 rounded-3xl border border-orange-200 bg-orange-50/30 shadow-sm hover:shadow-md transition-all border-dashed animate-pulse-slow">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-orange-100 rounded-2xl text-orange-600">
                            <Package size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">สต๊อกรอขายซาก</p>
                            <h3 className="text-2xl font-black text-orange-600">{metrics.waitingForSale.toLocaleString()} <span className="text-sm font-bold">ตัว</span></h3>
                        </div>
                    </div>
                    <p className="text-[10px] text-orange-500 font-medium">พาเลทที่เสียจากการซ่อมและยังไม่มีการลงบันทึกรายได้</p>
                </div>

                <div className="glass p-6 rounded-3xl border border-blue-200 bg-blue-50/30 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                            <History size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">ขายซากไปแล้ว</p>
                            <h3 className="text-2xl font-black text-blue-600">{metrics.soldQty.toLocaleString()} <span className="text-sm font-bold">ตัว</span></h3>
                        </div>
                    </div>
                </div>

                <div className="glass p-6 rounded-3xl border border-emerald-200 bg-emerald-50 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">รายได้รวมจากการขาย</p>
                            <h3 className="text-2xl font-black text-emerald-600">฿{metrics.totalRevenue.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Workflow Info Section */}
            <div className="glass p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl -mr-32 -mt-32"></div>
                <div className="relative z-10">
                    <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                        <TrendingUp className="text-emerald-400" size={24} />
                        ขั้นตอนการจัดการขายซาก (Scrap Workflow)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-black text-sm">1</span>
                                <span className="font-bold">ตรวจสอบสต๊อกเสีย</span>
                            </div>
                            <p className="text-sm text-slate-400">ดูจากช่อง "สต๊อกรอขายซาก" เพื่อทราบจำนวนพาเลทที่พร้อมจำหน่ายเป็นเศษไม้/เศษพลาสติก</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-black text-sm">2</span>
                                <span className="font-bold">บันทึกยอดขาย</span>
                            </div>
                            <p className="text-sm text-slate-400">เมื่อขายซากจริง ให้ค้นหายอดในตารางด้านล่างแล้วกดปุ่มแก้ไขเพื่อลง "ราคา" ที่ขายได้</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-black text-sm">3</span>
                                <span className="font-bold">สรุปยอดสต๊อก</span>
                            </div>
                            <p className="text-sm text-slate-400">เมื่อลงราคา รายการนั้นจะถูกนับเป็น "ขายไปแล้ว" และถูกบันทึกเข้าสู่ระบบรายรับโดยอัตโนมัติ</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <ScrappedReportTable transactions={transactions} />
        </div>
    );
};

export default ScrapSalesTab;
