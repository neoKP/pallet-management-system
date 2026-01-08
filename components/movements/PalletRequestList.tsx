import React from 'react';
import { ClipboardList, AlertCircle, Send, XCircle, Edit } from 'lucide-react';
import { PalletRequest } from '../../types';
import { PALLET_TYPES, BRANCHES } from '../../constants';

interface PalletRequestListProps {
    requests: PalletRequest[];
    isHub: boolean;
    allDestinations: { id: string, name: string }[];
    onApprove: (req: PalletRequest) => void;
    onReject: (req: PalletRequest) => void;
    onShip: (req: PalletRequest) => void;
    onEdit: (req: PalletRequest) => void;
}

const statusBadge = (status: PalletRequest['status']) => {
    switch (status) {
        case 'PENDING': return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-bold">รอตรวจสอบ</span>;
        case 'APPROVED': return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">อนุมัติแล้ว</span>;
        case 'SHIPPED': return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">ส่งมอบแล้ว</span>;
        case 'REJECTED': return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">ถูกปฏิเสธ</span>;
        default: return null;
    }
};

const PalletRequestList: React.FC<PalletRequestListProps> = ({
    requests,
    isHub,
    allDestinations,
    onApprove,
    onReject,
    onShip,
    onEdit
}) => {
    if (requests.length === 0) {
        return (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <ClipboardList size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold">ไม่มีรายการคำขอในขณะนี้</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((req) => (
                <div key={req.id} className={`bg-white rounded-3xl border-2 transition-all p-5 shadow-sm ${req.priority === 'URGENT' ? 'border-red-100' : 'border-slate-100'
                    }`}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono font-bold text-slate-400">{req.requestNo}</span>
                                {statusBadge(req.status)}
                            </div>
                            <h3 className="font-black text-slate-900">{BRANCHES.find(b => b.id === req.branchId)?.name}</h3>
                        </div>
                        {req.priority === 'URGENT' && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full ring-1 ring-red-200">
                                <AlertCircle size={10} /> URGENT
                            </span>
                        )}
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 mb-4 space-y-3">
                        <div className="space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">รายการพาเลท:</span>
                            {req.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">{PALLET_TYPES.find(p => p.id === item.palletId)?.name}</span>
                                    <span className="font-black text-blue-600">x{item.qty}</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-2 border-t border-slate-200/50 space-y-2">
                            {req.targetBranchId && (
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">ปลายทางส่งคืน:</span>
                                    <p className="text-sm text-blue-700 font-black">{allDestinations.find(d => d.id === req.targetBranchId)?.name}</p>
                                </div>
                            )}
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">วัตถุประสงค์:</span>
                                <p className="text-sm text-slate-700 font-medium">{req.purpose}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="text-[10px] text-slate-400 flex justify-between px-1">
                            <span>วันที่: {req.date}</span>
                            {req.processDocNo && <span className="text-blue-500 font-bold">Ref: {req.processDocNo}</span>}
                        </div>

                        {isHub && req.status === 'PENDING' && (
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => onApprove(req)}
                                    className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all border border-blue-100"
                                >
                                    อนุมัติ
                                </button>
                                <button
                                    onClick={() => onEdit(req)}
                                    className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-all border border-amber-100"
                                    title="แก้ไขจำนวนพาเลท"
                                    aria-label="Edit request"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    onClick={() => onReject(req)}
                                    className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all border border-red-100"
                                    title="ปฏิเสธคำขอ"
                                    aria-label="Reject request"
                                >
                                    <XCircle size={16} />
                                </button>
                            </div>
                        )}

                        {isHub && req.status === 'APPROVED' && (
                            <button
                                onClick={() => onShip(req)}
                                className="w-full mt-2 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <Send size={16} /> บันทึกจ่ายออก (Send OUT)
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PalletRequestList;
