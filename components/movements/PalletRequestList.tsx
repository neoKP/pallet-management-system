import React from 'react';
import { ClipboardList, AlertCircle, Send, XCircle, Edit, ArrowUpCircle, ArrowDownCircle, Info } from 'lucide-react';
import { PalletRequest, BranchId } from '../../types';
import { PALLET_TYPES, BRANCHES } from '../../constants';

interface PalletRequestListProps {
    requests: PalletRequest[];
    isHub: boolean;
    currentBranchId: BranchId;
    allDestinations: { id: string, name: string }[];
    onApprove: (req: PalletRequest) => void;
    onReject: (req: PalletRequest) => void;
    onShip: (req: PalletRequest) => void;
    onEdit: (req: PalletRequest) => void;
}

const statusBadge = (status: PalletRequest['status']) => {
    switch (status) {
        case 'PENDING': return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black border border-slate-200 uppercase">รอตรวจสอบ</span>;
        case 'APPROVED': return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black border border-blue-200 uppercase">อนุมัติแล้ว</span>;
        case 'SHIPPED': return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-lg text-[10px] font-black border border-green-200 uppercase">ส่งมอบแล้ว</span>;
        case 'REJECTED': return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-lg text-[10px] font-black border border-red-200 uppercase">ถูกปฏิเสธ</span>;
        default: return null;
    }
};

const PalletRequestList: React.FC<PalletRequestListProps> = ({
    requests,
    isHub,
    currentBranchId,
    allDestinations,
    onApprove,
    onReject,
    onShip,
    onEdit
}) => {
    if (requests.length === 0) {
        return (
            <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-[2.5rem] border-4 border-dashed border-slate-100">
                <ClipboardList size={64} className="mx-auto mb-6 opacity-10" />
                <p className="text-xl font-black text-slate-300">ไม่พบรายการคำขอในขณะนี้</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {requests.map((req) => {
                const isPull = req.requestType === 'PULL';
                const themeColor = isPull ? 'orange' : 'blue';
                const Icon = isPull ? ArrowDownCircle : ArrowUpCircle;
                const isTargetOfPull = isPull && req.targetBranchId === currentBranchId;

                return (
                    <div key={req.id} className={`group relative bg-white rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden hover:shadow-2xl hover:-translate-y-1 ${isPull ? 'border-orange-100 hover:border-orange-300' : 'border-blue-100 hover:border-blue-300'
                        } ${req.priority === 'URGENT' ? 'ring-4 ring-red-500/10' : ''}`}>

                        {/* Action Header Label */}
                        <div className={`p-3 text-center text-[11px] font-black tracking-widest uppercase flex items-center justify-center gap-2 ${isPull ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
                            }`}>
                            <Icon size={14} />
                            {isPull ? 'รายการเรียกเก็บ (COLLECTION - PULL)' : 'รายการส่งมอบ (SHIPMENT - PUSH)'}
                        </div>

                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                            {req.requestNo}
                                        </span>
                                        {statusBadge(req.status)}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-black text-slate-900 leading-tight">
                                            {BRANCHES.find(b => b.id === req.branchId)?.name}
                                        </h3>
                                    </div>
                                </div>
                                {req.priority === 'URGENT' && (
                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-white bg-red-600 px-3 py-1 rounded-full shadow-lg shadow-red-100 animate-pulse">
                                        <AlertCircle size={12} /> URGENT
                                    </span>
                                )}
                            </div>

                            <div className={`rounded-[1.5rem] p-5 mb-5 border transition-colors ${isPull
                                    ? 'bg-orange-50/50 border-orange-100 group-hover:bg-orange-50'
                                    : 'bg-blue-50/50 border-blue-100 group-hover:bg-blue-50'
                                }`}>
                                <div className="space-y-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">รายการพาเลท:</span>
                                    {req.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center group/item">
                                            <span className="text-slate-700 font-bold text-sm tracking-tight">{PALLET_TYPES.find(p => p.id === item.palletId)?.name}</span>
                                            <div className={`px-3 py-1 rounded-xl font-black text-sm flex items-center gap-1 ${isPull ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                x {item.qty.toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-5 pt-5 border-t border-slate-200/50 space-y-4">
                                    {req.targetBranchId && (
                                        <div className="bg-white/60 p-3 rounded-2xl border border-slate-100 shadow-sm">
                                            <span className={`text-[10px] font-black uppercase tracking-wider block mb-1.5 ${isPull ? 'text-orange-500' : 'text-blue-500'
                                                }`}>
                                                {isPull ? '📍 เรียกจากสาขาต้นทาง (Source):' : '🚚 ส่งไปที่ปลายทาง (Target):'}
                                            </span>
                                            <p className="text-base font-black text-slate-800">
                                                {allDestinations.find(d => d.id === req.targetBranchId)?.name}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <div className="p-2 bg-white/40 rounded-xl">
                                            <Info size={14} className="text-slate-400" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">วัตถุประสงค์:</span>
                                            <p className="text-sm text-slate-600 font-bold leading-relaxed">{req.purpose}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="text-[10px] text-slate-400 font-bold flex justify-between items-center px-2">
                                    <span>สร้างเมื่อ {req.date}</span>
                                    {req.processDocNo && (
                                        <span className="flex items-center gap-1 text-emerald-600 font-black">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                                            Ref: {req.processDocNo}
                                        </span>
                                    )}
                                </div>

                                {(isHub || isTargetOfPull) && req.status === 'PENDING' && (
                                    <div className="flex gap-2.5 mt-2">
                                        <button
                                            onClick={() => onApprove(req)}
                                            className={`flex-1 py-3 rounded-[1.25rem] font-black text-xs transition-all border-2 flex items-center justify-center gap-2 hover:shadow-lg ${isPull
                                                    ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                                                    : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                                                }`}
                                        >
                                            <Info size={14} /> อนุมัติ
                                        </button>

                                        {isHub && (
                                            <button
                                                onClick={() => onEdit(req)}
                                                className="p-3 bg-slate-50 text-slate-600 rounded-[1.25rem] hover:bg-slate-100 transition-all border-2 border-slate-100 shadow-sm"
                                                title="แก้ไขข้อมูล"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onReject(req)}
                                            className="p-3 bg-red-50 text-red-600 rounded-[1.25rem] hover:bg-red-100 transition-all border-2 border-red-100 shadow-sm"
                                            title="ปฏิเสธ"
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    </div>
                                )}

                                {isHub && req.status === 'APPROVED' && (
                                    <button
                                        onClick={() => onShip(req)}
                                        className={`w-full mt-2 py-4 rounded-[1.25rem] font-black text-sm transition-all shadow-xl flex items-center justify-center gap-3 hover:-translate-y-0.5 ${isPull
                                                ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-100'
                                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                                            }`}
                                    >
                                        <Send size={18} />
                                        {isPull ? 'เริ่มรายการเรียกเก็บ (Start Collect)' : 'บันทึกจ่ายออก (Confirm OUT)'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PalletRequestList;
