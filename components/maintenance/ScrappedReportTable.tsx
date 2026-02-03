import React, { useMemo, useState } from 'react';
import { Trash2, Calendar, FileText, Hash } from 'lucide-react';
import { Transaction } from '../../types';
import { PALLET_TYPES } from '../../constants';
import { useStock } from '../../contexts/StockContext';
// @ts-ignore
import Swal from 'sweetalert2';

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
    const { updateTransaction } = useStock();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    // Filter only MAINTENANCE transactions that have scrapped quantity
    const scrappedTransactions = useMemo(() => {
        return transactions
            .filter((tx: Transaction) =>
                tx.type === 'MAINTENANCE' &&
                tx.status === 'COMPLETED' &&
                tx.noteExtended?.includes('SCRAP:')
            )
            .sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions]);

    const handleSaveRevenue = async (tx: Transaction) => {
        const revenue = parseFloat(editValue);
        if (isNaN(revenue)) return;

        try {
            await updateTransaction({ ...tx, scrapRevenue: revenue });
            setEditingId(null);
            Swal.fire({
                icon: 'success',
                title: 'สำเร็จ',
                text: 'บันทึกรายได้เรียบร้อยแล้ว',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'ผิดพลาด',
                text: 'ไม่สามารถบันทึกข้อมูลได้'
            });
        }
    };

    // Parse scrap quantity from noteExtended: "REPAIR: 5, SCRAP: 2"
    const getScrapQty = (noteExtended: string) => {
        const match = noteExtended.match(/SCRAP:\s*(\d+)/);
        return match ? parseInt(match[1]) : 0;
    };

    const totalScrapped = scrappedTransactions.reduce((sum: number, tx: Transaction) => sum + getScrapQty(tx.noteExtended || ''), 0);
    const totalRevenue = scrappedTransactions.reduce((sum: number, tx: Transaction) => sum + (tx.scrapRevenue || 0), 0);

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
                <div className="flex gap-4">
                    <div className="bg-red-50 px-4 py-2 rounded-2xl border border-red-100 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">ยอดเสียสะสมรวม</span>
                        <span className="text-xl font-black text-red-700">{totalScrapped.toLocaleString()} <span className="text-xs font-bold">ตัว</span></span>
                    </div>
                    <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">รายได้จากการขายซากรวม</span>
                        <span className="text-xl font-black text-emerald-700">{totalRevenue.toLocaleString()} <span className="text-xs font-bold">บาท</span></span>
                    </div>
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
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">รายได้จากการขาย</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {scrappedTransactions.length > 0 ? (
                            scrappedTransactions.map((tx: Transaction) => {
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
                                        <td className="px-6 py-4 text-right">
                                            {editingId === tx.id ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <input
                                                        type="number"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="w-24 px-2 py-1 text-xs font-bold border border-emerald-300 rounded focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                                        placeholder="ราคา"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => handleSaveRevenue(tx)}
                                                        className="p-1 px-2 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700 transition-colors"
                                                    >
                                                        บันทึก
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="p-1 px-2 bg-slate-200 text-slate-600 text-[10px] font-bold rounded hover:bg-slate-300 transition-colors"
                                                    >
                                                        ยกเลิก
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2">
                                                    {tx.scrapRevenue ? (
                                                        <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                                            ฿{tx.scrapRevenue.toLocaleString()}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-slate-400 italic">ยังไม่ได้ลงบันทึก</span>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setEditingId(tx.id);
                                                            setEditValue(tx.scrapRevenue?.toString() || '');
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                                                        title="แก้ไขรายได้"
                                                    >
                                                        <Hash size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
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
