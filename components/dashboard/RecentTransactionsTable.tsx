import React from 'react';
import { History as HistoryIcon, Download, Clock, Printer, Trash2 } from 'lucide-react';
import { Transaction, BranchId, User } from '../../types';
import { BRANCHES, VEHICLE_TYPES, PALLET_TYPES, EXTERNAL_PARTNERS } from '../../constants';

interface RecentTransactionsTableProps {
    displayTransactions: Transaction[];
    selectedBranch: BranchId | 'ALL';
    currentUser: User | null;
    onViewTimeline: (tx: Transaction) => void;
    onPrintDoc: (tx: Transaction) => void;
    onDelete: (txId: number) => void;
    onExport: () => void;
    onOpenAdjModal: () => void;
}

const RecentTransactionsTable: React.FC<RecentTransactionsTableProps> = ({
    displayTransactions,
    selectedBranch,
    currentUser,
    onViewTimeline,
    onPrintDoc,
    onDelete,
    onExport,
    onOpenAdjModal
}) => {
    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <HistoryIcon className="text-slate-400" size={20} />
                    <h2 className="text-lg font-black text-slate-800">Inventory Tracking System</h2>
                </div>
                <div className="flex gap-2">
                    {currentUser?.role === 'ADMIN' && (
                        <button
                            onClick={onOpenAdjModal}
                            className="px-3 py-1.5 text-xs font-bold bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                        >
                            ปรับปรุงยอด (Adj)
                        </button>
                    )}
                    <button
                        onClick={onExport}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                    >
                        <Download size={14} /> Export Excel
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <tr>
                            <th className="p-4">Date/Time</th>
                            <th className="p-4">Doc No.</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Reference / ECD No.</th>
                            <th className="p-4">Transport</th>
                            <th className="p-4">Details</th>
                            <th className="p-4 text-center">รับ (In)</th>
                            <th className="p-4 text-center">จ่าย (Out)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {displayTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-slate-400">No transactions found.</td>
                            </tr>
                        ) : (
                            displayTransactions.map((tx) => {
                                const isAdjustment = tx.type === 'ADJUST';
                                let qtyIn: any = '-';
                                let qtyOut: any = '-';

                                if (isAdjustment) {
                                    const isSourceSystem = ['ADJUSTMENT', 'SYSTEM_ADJUST', 'SYSTEM'].includes(tx.source);
                                    if (isSourceSystem) {
                                        qtyIn = tx.qty;
                                    } else {
                                        qtyOut = tx.qty;
                                    }
                                } else if (selectedBranch !== 'ALL') {
                                    if (tx.dest === selectedBranch) qtyIn = tx.qty;
                                    if (tx.source === selectedBranch) qtyOut = tx.qty;
                                } else {
                                    const isInternal = BRANCHES.some(b => b.id === tx.source) && BRANCHES.some(b => b.id === tx.dest);
                                    if (isInternal) {
                                        qtyIn = tx.qty;
                                        qtyOut = tx.qty;
                                    } else {
                                        qtyIn = (tx.type === 'IN') ? tx.qty : '-';
                                        qtyOut = (tx.type === 'OUT') ? tx.qty : '-';
                                    }
                                }

                                const isCancelled = tx.status === 'CANCELLED';

                                return (
                                    <tr key={`${tx.id}-${tx.docNo}`} className={`transition-colors ${isCancelled ? 'bg-red-50/30' : 'hover:bg-slate-50/50'}`}>
                                        <td className={`p-4 text-slate-500 whitespace-nowrap ${isCancelled ? 'line-through decoration-red-300 opacity-60' : ''}`}>
                                            {new Date(tx.date).toLocaleDateString('th-TH')}
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex flex-col items-start gap-1">
                                                <span className={`font-mono font-medium ${isCancelled ? 'text-slate-400 line-through decoration-red-300' : 'text-blue-600'}`}>
                                                    {tx.docNo}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => onViewTimeline(tx)}
                                                        className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded border border-slate-200 hover:border-blue-200 text-[10px] font-bold transition-all flex items-center gap-1"
                                                        title="View Timeline"
                                                    >
                                                        <Clock size={10} /> Timeline
                                                    </button>
                                                    <button
                                                        onClick={() => onPrintDoc(tx)}
                                                        className="p-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded border border-slate-200 transition-all flex items-center gap-1"
                                                        title="Print PDF"
                                                    >
                                                        <Printer size={10} />
                                                    </button>
                                                    {currentUser?.role === 'ADMIN' && !isCancelled && (
                                                        <button
                                                            onClick={() => onDelete(tx.id)}
                                                            className="p-1 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded border border-slate-200 hover:border-red-200 transition-colors"
                                                            title="Delete Transaction"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`p-4 text-slate-900 font-bold whitespace-nowrap ${isCancelled ? 'opacity-50' : ''}`}>
                                            {isCancelled ? (
                                                <span className="px-2 py-0.5 rounded-md text-[10px] bg-red-100 text-red-600 font-black">
                                                    CANCELLED
                                                </span>
                                            ) : (
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] ${(selectedBranch !== 'ALL' && tx.dest === selectedBranch) || tx.type === 'IN' ? 'bg-emerald-100 text-emerald-700' :
                                                    (selectedBranch !== 'ALL' && tx.source === selectedBranch) || tx.type === 'OUT' ? 'bg-orange-100 text-orange-700' :
                                                        tx.type === 'ADJUST' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {selectedBranch === 'ALL' ? tx.type : (tx.dest === selectedBranch ? 'IN' : 'OUT')}
                                                </span>
                                            )}
                                        </td>
                                        <td className={`p-4 text-slate-600 ${isCancelled ? 'line-through opacity-50' : ''}`}>
                                            {tx.referenceDocNo || '-'}
                                        </td>
                                        <td className={`p-4 text-slate-600 ${isCancelled ? 'line-through opacity-50' : ''}`}>
                                            <div className="flex flex-col gap-0.5">
                                                {tx.carRegistration && <div className="flex items-center gap-1"><span className="font-bold">{tx.carRegistration}</span> {(tx.vehicleType) ? `(${VEHICLE_TYPES.find(v => v.id === tx.vehicleType)?.name || tx.vehicleType})` : ''}</div>}
                                                {tx.driverName && <span>{tx.driverName}</span>}
                                                {tx.transportCompany && <span className="text-[10px] text-slate-400">{tx.transportCompany}</span>}
                                            </div>
                                        </td>
                                        <td className={`p-4 text-slate-600 ${isCancelled ? 'line-through opacity-50' : ''}`}>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-slate-800">
                                                        {PALLET_TYPES.find(p => p.id === tx.palletId)?.name || tx.palletId}
                                                    </span>
                                                    {tx.note?.includes('[แก้ไขการรับ]') && (
                                                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded uppercase">แก้ไขแล้ว</span>
                                                    )}
                                                    {tx.note?.includes('[รายการแยก]') && (
                                                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded uppercase">รายการแยก</span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                                    <span className="font-bold text-slate-500">
                                                        {[...BRANCHES, ...EXTERNAL_PARTNERS].find(b => b.id === tx.source)?.name || tx.source}
                                                    </span>
                                                    <span className="text-slate-300">→</span>
                                                    <span className="font-bold text-slate-500">
                                                        {[...BRANCHES, ...EXTERNAL_PARTNERS].find(b => b.id === tx.dest)?.name || tx.dest}
                                                    </span>
                                                </div>
                                                {tx.note && (
                                                    <div className="text-[10px] text-blue-500/70 font-medium italic mt-0.5 leading-tight">
                                                        {tx.note.replace('[แก้ไขการรับ] ', '').replace('[รายการแยก] ', '')}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className={`p-4 text-center font-black ${isCancelled ? 'text-slate-400 line-through opacity-50' : 'text-emerald-600 bg-emerald-50/30'}`}>
                                            {qtyIn}
                                        </td>
                                        <td className={`p-4 text-center font-black ${isCancelled ? 'text-slate-400 line-through opacity-50' : 'text-red-600 bg-red-50/30'}`}>
                                            {qtyOut}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RecentTransactionsTable;
