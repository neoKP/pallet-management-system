import { Clock, Building, Car, User as UserIcon, FileText, Printer, Trash2 } from 'lucide-react';
import { Transaction } from '../../types';
import { PALLET_TYPES, VEHICLE_TYPES } from '../../constants';

const formatDate = (dateStr: string) => {
    try {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    } catch (e) {
        return dateStr;
    }
};

interface TransactionHistoryProps {
    historyGroups: Transaction[][];
    onViewTimeline: (tx: Transaction) => void;
    onVerifyDocument: (txGroup: Transaction[]) => void;
    onDelete?: (txGroup: Transaction[]) => void;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
    historyGroups,
    onViewTimeline,
    onVerifyDocument,
    onDelete
}) => {
    return (
        <div className="glass p-6 rounded-3xl border border-slate-200 bg-white">
            <h2 className="text-xl font-black text-slate-900 mb-4">Transaction History</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {historyGroups.map((group, idx) => {
                    const tx = group[0];
                    const isPending = group.some(t => t.status === 'PENDING');

                    return (
                        <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex flex-col">
                                    <div className="flex gap-2 mb-1">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold w-fit ${tx.type === 'IN' ? 'bg-green-100 text-green-700' :
                                            tx.type === 'OUT' ? 'bg-red-100 text-red-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                            {tx.type}
                                        </span>
                                        {isPending && (
                                            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-orange-100 text-orange-700">
                                                WAITING
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs font-mono font-bold text-slate-500">{tx.docNo || '-'}</span>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    <span className="text-xs text-slate-400 mb-1">{formatDate(tx.date)}</span>
                                    <button
                                        onClick={() => onViewTimeline(tx)}
                                        className="text-[10px] flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-black hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100"
                                        title="View Timeline"
                                    >
                                        <Clock size={10} /> TIMELINE
                                    </button>
                                    <button
                                        onClick={() => onVerifyDocument(group)}
                                        className="text-[10px] flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 font-black hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100"
                                        title="ตรวจสอบเอกสาร (Document Verification)"
                                    >
                                        <Printer size={10} /> VERIFY
                                    </button>
                                    {onDelete && (
                                        <button
                                            onClick={() => onDelete(group)}
                                            className="text-[10px] flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-black hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100"
                                            title="ลบรายการ (Delete Transaction)"
                                        >
                                            <Trash2 size={10} /> DELETE
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="text-sm text-slate-600">
                                <div className="mb-2">
                                    <span className="font-bold text-slate-800">Route:</span> {tx.display_source || tx.source} → {tx.display_dest || tx.dest}
                                </div>
                                {(tx.carRegistration || tx.transportCompany) && (
                                    <div className="mb-2 text-xs text-slate-500 bg-white border border-slate-200 p-2 rounded space-y-1">
                                        {tx.transportCompany && <div className="flex items-center gap-1"><Building size={10} /> {tx.transportCompany}</div>}
                                        {tx.carRegistration && <div className="flex items-center gap-1"><Car size={10} /> {tx.carRegistration} {(tx.vehicleType) ? `(${VEHICLE_TYPES.find(v => v.id === tx.vehicleType)?.name || tx.vehicleType})` : ''}</div>}
                                        {tx.driverName && <div className="flex items-center gap-1"><UserIcon size={10} /> {tx.driverName}</div>}
                                    </div>
                                )}
                                {tx.referenceDocNo && (
                                    <div className="mb-2 text-xs font-mono text-slate-500 bg-blue-50 border border-blue-100 p-1.5 rounded flex items-center gap-1">
                                        <FileText size={10} /> ECD/Ref: {tx.referenceDocNo}
                                    </div>
                                )}
                                <div className="bg-white rounded border border-slate-200 p-2 space-y-1">
                                    {Object.values(group.reduce((acc, item) => {
                                        if (!acc[item.palletId]) {
                                            acc[item.palletId] = { ...item, qty: 0 };
                                        }
                                        acc[item.palletId].qty += item.qty;
                                        return acc;
                                    }, {} as Record<string, Transaction>)).map((item, i) => (
                                        <div key={i} className="flex justify-between">
                                            <span className="text-slate-700 text-xs">{PALLET_TYPES.find(p => p.id === item.palletId)?.name}</span>
                                            <span className="font-bold text-slate-900 text-xs">{item.qty}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TransactionHistory;
