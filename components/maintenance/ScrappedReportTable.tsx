import React, { useMemo } from 'react';
import { Trash2, Calendar, FileText, Hash } from 'lucide-react';
import { Transaction } from '../../types';
import { PALLET_TYPES } from '../../constants';

interface ScrappedReportTableProps {
    transactions: Transaction[];
}

const formatDate = (dateStr: string) => {
    try {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateStr;
    }
};

const ScrappedReportTable: React.FC<ScrappedReportTableProps> = ({ transactions }) => {
    // Filter only MAINTENANCE transactions that have scrapped quantity
    const scrappedTransactions = useMemo(() => {
        return transactions
            .filter(tx =>
                tx.type === 'MAINTENANCE' &&
                tx.status === 'COMPLETED' &&
                tx.noteExtended?.includes('SCRAP:')
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions]);

    // Parse scrap quantity from noteExtended: "REPAIR: 5, SCRAP: 2"
    const getScrapQty = (noteExtended: string) => {
        const match = noteExtended.match(/SCRAP:\s*(\d+)/);
        return match ? parseInt(match[1]) : 0;
    };

    const totalScrapped = scrappedTransactions.reduce((sum, tx) => sum + getScrapQty(tx.noteExtended || ''), 0);

    return (
        <div className="glass p-6 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <Trash2 className="text-red-500" size={24} />
                        สรุปรายการ เสีย/ทิ้ง (Scrapped Report)
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">รายการที่ถูกตัดสต๊อกออกจากระบบถาวรจากการซ่อม</p>
                </div>
                <div className="bg-red-50 px-4 py-2 rounded-2xl border border-red-100">
                    <span className="text-xs font-bold text-red-600 uppercase tracking-wider block">ยอดเสียสะสมรวม</span>
                    <span className="text-2xl font-black text-red-700">{totalScrapped.toLocaleString()} <span className="text-sm font-bold">ตัว</span></span>
                </div>
            </div>

            <div className="overflow-x-auto -mx-6 sm:mx-0">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-y border-slate-100">
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">
                                <div className="flex items-center gap-1"><Calendar size={14} /> วันที่บันทึก</div>
                            </th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">
                                <div className="flex items-center gap-1"><FileText size={14} /> เลขที่เอกสาร</div>
                            </th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">ต้นทาง/ประเภท</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">
                                <div className="flex items-center justify-end gap-1"><Hash size={14} /> จำนวนที่ทิ้ง</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {scrappedTransactions.length > 0 ? (
                            scrappedTransactions.map((tx) => {
                                const scrapQty = getScrapQty(tx.noteExtended || '');
                                if (scrapQty === 0) return null;

                                return (
                                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-slate-700">{formatDate(tx.date)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                {tx.docNo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-800">
                                                    {PALLET_TYPES.find(p => p.id === tx.originalPalletId)?.name || 'ไม่ระบุประเภท'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">คลัง: {tx.source}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-lg font-black text-red-600">
                                                {scrapQty.toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                                    <div className="flex flex-col items-center gap-2">
                                        <Trash2 size={32} className="opacity-20" />
                                        ไม่พบรายการเสีย/ทิ้งในระบบ
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ScrappedReportTable;
