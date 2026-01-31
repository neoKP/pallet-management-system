import React from 'react';
import { Truck, Clock, Building, Car, User as UserIcon, FileText, CheckCircle } from 'lucide-react';
import { Transaction, BranchId } from '../../types';
import { BRANCHES, PALLET_TYPES, VEHICLE_TYPES } from '../../constants';

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

interface PendingTransfersProps {
    pendingGroups: Transaction[][];
    onViewTimeline: (tx: Transaction) => void;
    onBatchConfirm: (txs: Transaction[]) => void;
    isProcessing?: boolean;
}

const PendingTransfers: React.FC<PendingTransfersProps> = ({
    pendingGroups,
    onViewTimeline,
    onBatchConfirm,
    isProcessing
}) => {
    if (pendingGroups.length === 0) return null;

    return (
        <div className="glass p-6 rounded-3xl border border-orange-200 bg-orange-50/50 mb-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-orange-100 rounded-xl text-orange-600">
                    <Truck size={24} />
                </div>
                <div>
                    <h2 className="text-lg font-black text-slate-900">Incoming Deliveries (รอรับเข้า)</h2>
                    <p className="text-sm text-slate-500">Items sent from other branches waiting for acceptance</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingGroups.map((group) => {
                    const mainTx = group[0];
                    return (
                        <div key={mainTx.docNo} className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-lg">
                                        {mainTx.docNo}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onViewTimeline(mainTx)}
                                            className="p-1 px-2 text-xs font-bold bg-slate-50 text-slate-400 hover:bg-white hover:text-blue-600 rounded-lg transition-all border border-transparent hover:border-blue-100 shadow-sm hover:shadow active:scale-95 flex items-center gap-1"
                                            title="View Timeline"
                                        >
                                            <Clock size={14} /> Timeline
                                        </button>
                                        <span className="text-xs text-slate-400 font-medium">{formatDate(mainTx.date)}</span>
                                    </div>
                                </div>
                                <div className="space-y-2 mb-4 border-t border-slate-100 pt-2">
                                    <div className="text-sm text-slate-600">
                                        <span className="font-bold text-slate-800">From:</span> {BRANCHES.find(b => b.id === mainTx.source)?.name || mainTx.source}
                                    </div>
                                    {(mainTx.carRegistration || mainTx.transportCompany) && (
                                        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded space-y-1">
                                            {mainTx.transportCompany && <div className="flex items-center gap-1"><Building size={12} /> {mainTx.transportCompany}</div>}
                                            {mainTx.carRegistration && <div className="flex items-center gap-1"><Car size={12} /> {mainTx.carRegistration} {(mainTx.vehicleType) ? `(${VEHICLE_TYPES.find(v => v.id === mainTx.vehicleType)?.name || mainTx.vehicleType})` : ''}</div>}
                                            {mainTx.driverName && <div className="flex items-center gap-1"><UserIcon size={12} /> {mainTx.driverName}</div>}
                                        </div>
                                    )}
                                    {mainTx.referenceDocNo && (
                                        <div className="text-xs font-mono text-slate-500 bg-blue-50 border border-blue-100 p-1.5 rounded flex items-center gap-1 my-2">
                                            <FileText size={10} /> ECD/Ref: {mainTx.referenceDocNo}
                                        </div>
                                    )}

                                    <div className="bg-slate-50 rounded-lg p-2 space-y-1">
                                        {Object.values(group.reduce((acc, item) => {
                                            if (!acc[item.palletId]) {
                                                acc[item.palletId] = { ...item, qty: 0 };
                                            }
                                            acc[item.palletId].qty += item.qty;
                                            return acc;
                                        }, {} as Record<string, Transaction>)).map((tx, idx) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span className="text-slate-600">{PALLET_TYPES.find(p => p.id === tx.palletId)?.name}</span>
                                                <span className="font-black text-orange-600">x{tx.qty}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => onBatchConfirm(group)}
                                disabled={isProcessing}
                                className={`w-full py-2 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${isProcessing ? 'bg-slate-300 cursor-not-allowed text-slate-500' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                            >
                                {isProcessing ? (
                                    <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-600 rounded-full animate-spin" />
                                ) : (
                                    <CheckCircle size={16} />
                                )}
                                {isProcessing ? 'กำลังเปิด...' : 'ตรวจสอบ & รับของ'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PendingTransfers;
