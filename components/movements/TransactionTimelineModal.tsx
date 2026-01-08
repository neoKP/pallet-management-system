import React from 'react';
import { X, Truck, Building2, CheckCircle, Clock, MapPin, PackageCheck, ArrowRight, Package, AlertCircle, Info } from 'lucide-react';
import { Transaction, BranchId } from '../../types';
import { BRANCHES, EXTERNAL_PARTNERS, PALLET_TYPES } from '../../constants';

const formatDate = (dateStr: string) => {
    try {
        if (!dateStr || dateStr === '-') return dateStr;
        return new Date(dateStr).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    } catch (e) {
        return dateStr;
    }
};

interface TransactionTimelineModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
}

const TransactionTimelineModal: React.FC<TransactionTimelineModalProps> = ({ isOpen, onClose, transactions }) => {
    if (!isOpen || !transactions || transactions.length === 0) return null;

    const mainTx = transactions[0];
    const sourceName = BRANCHES.find(b => b.id === mainTx.source)?.name ||
        EXTERNAL_PARTNERS.find(p => p.id === mainTx.source)?.name ||
        mainTx.source;

    const destName = BRANCHES.find(b => b.id === mainTx.dest)?.name ||
        EXTERNAL_PARTNERS.find(p => p.id === mainTx.dest)?.name ||
        mainTx.dest;

    const isCompleted = mainTx.status === 'COMPLETED';
    const totalQty = transactions.reduce((sum, tx) => sum + tx.qty, 0);

    // Determine steps
    const steps = [
        {
            title: 'สินค้าออกจากต้นทาง (Dispatched)',
            description: `ส่งออกจาก ${sourceName}`,
            detail: `Doc: ${mainTx.docNo}`,
            date: formatDate(mainTx.date),
            icon: Truck,
            status: 'completed',
            color: 'bg-emerald-500'
        },
        {
            title: 'อยู่ระหว่างดำเนินการ (In Transit)',
            description: 'ระบบบันทึกการส่งและแจังเตือนปลายทาง',
            detail: 'รอปลายทางตรวจสอบ',
            date: formatDate(mainTx.date),
            icon: MapPin,
            status: 'completed',
            color: 'bg-blue-500'
        },
        {
            title: 'การรับสินค้า (Receiving)',
            description: `รับเข้าที่ ${destName}`,
            detail: isCompleted ? 'ตรวจสอบและยืนยันแล้ว' : 'รอการตรวจสอบ (Action Required)',
            date: isCompleted ? formatDate(mainTx.receivedAt || mainTx.date) : '-',
            icon: PackageCheck,
            status: isCompleted ? 'completed' : 'current',
            color: isCompleted ? 'bg-emerald-500' : 'bg-amber-500'
        }
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white/95 backdrop-blur-md rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20 animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="bg-slate-50/80 p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 leading-none">Timeline & Tracking</h3>
                            <p className="text-xs text-slate-500 font-bold mt-1.5 uppercase tracking-wider">ติดดามสถานะการขนส่ง (Shipment Status)</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors" aria-label="Close">
                        <X size={24} className="text-slate-500" />
                    </button>
                </div>

                {/* Shipment Details Bar - Multiple Items */}
                <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/30 flex flex-col gap-4 shrink-0 max-h-[40vh] overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">รายการพาเลททั้งหมด ({transactions.length})</span>
                        <span className="text-xs font-black text-blue-600">ยอดรวม {totalQty} ตัว</span>
                    </div>

                    <div className="space-y-3">
                        {transactions.map((tx, idx) => {
                            const palletName = PALLET_TYPES.find(p => p.id === tx.palletId)?.name || tx.palletId;
                            const originalPalletName = tx.originalPalletId ? (PALLET_TYPES.find(p => p.id === tx.originalPalletId)?.name || tx.originalPalletId) : null;
                            const isEdited = !!tx.originalPalletId || (tx.originalQty !== undefined && tx.originalQty !== tx.qty);
                            const isSplit = tx.note?.includes('[รายการแยก]');

                            return (
                                <div key={tx.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                                                <Package size={16} />
                                            </div>
                                            <span className="text-sm font-black text-slate-800">รายการที่ {idx + 1}: {palletName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-black text-slate-900">{tx.qty} ตัว</span>
                                            {isEdited && <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[9px] font-black rounded-lg uppercase">มีการแก้ไขข้อมูล</span>}
                                            {isSplit && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[9px] font-black rounded-lg uppercase">รายการแยกสินค้า</span>}
                                        </div>
                                    </div>

                                    {(isEdited || isSplit) && (
                                        <div className={`px-4 py-3 rounded-2xl border ${isSplit ? 'bg-blue-50/50 text-blue-800 border-blue-100' : 'bg-amber-50/50 text-amber-800 border-amber-100'}`}>
                                            <div className="space-y-1">
                                                {tx.originalPalletId && tx.originalPalletId !== tx.palletId && (
                                                    <p className="text-[11px] font-bold">
                                                        • เปลี่ยนประเภท: <span className="line-through">{originalPalletName}</span> → {palletName}
                                                    </p>
                                                )}
                                                {tx.originalQty !== undefined && tx.originalQty !== tx.qty && (
                                                    <p className="text-[11px] font-bold">
                                                        • แก้ไขจำนวน: <span className="line-through">{tx.originalQty} ตัว</span> → {tx.qty} ตัว
                                                    </p>
                                                )}
                                                {tx.note && (
                                                    <p className="text-[10px] italic font-medium opacity-70 border-t border-current/10 pt-1 mt-1">
                                                        " {tx.note.replace('[แก้ไขการรับ] ', '').replace('[รายการแยก] ', '')} "
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Body - Scrollable */}
                <div className="p-8 md:p-10 relative overflow-y-auto flex-1 custom-scrollbar">
                    {/* Connection Line */}
                    <div className="absolute left-[3.25rem] md:left-[3.75rem] top-12 bottom-12 w-1 bg-slate-100 rounded-full" />

                    <div className="space-y-10 relative">
                        {steps.map((step, idx) => {
                            const isCurrent = step.status === 'current';

                            return (
                                <div key={idx} className={`relative flex gap-6 md:gap-8 group`}>
                                    {/* Icon Marker */}
                                    <div className={`relative shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-lg border-4 border-white z-10 transition-transform duration-500 ${isCurrent ? 'scale-110 ring-8 ring-amber-100' : ''} ${step.color} text-white`}>
                                        <step.icon size={28} className={isCurrent ? 'animate-pulse' : ''} />
                                        {step.status === 'completed' && (
                                            <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white rounded-full p-1 text-white">
                                                <CheckCircle size={10} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className={`flex-1 pt-1`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-lg font-black ${isCurrent ? 'text-amber-600' : 'text-slate-900'}`}>
                                                {step.title}
                                            </h4>
                                            <span className="text-[10px] font-black text-slate-400 font-mono bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 uppercase tracking-tighter">
                                                {step.date}
                                            </span>
                                        </div>
                                        <p className="text-slate-600 text-sm font-bold mb-1 opacity-80">{step.description}</p>
                                        <p className={`text-xs ${isCurrent ? 'text-amber-600 font-black' : 'text-slate-400 font-bold'}`}>
                                            {step.detail}
                                        </p>

                                        {/* Status Badge */}
                                        <div className="mt-4">
                                            {step.status === 'completed' && <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full inline-flex items-center gap-1.5 uppercase tracking-wider shadow-sm shadow-emerald-50"><CheckCircle size={12} /> Completed</span>}
                                            {step.status === 'current' && <span className="px-3 py-1.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full inline-flex items-center gap-1.5 animate-pulse uppercase tracking-wider shadow-sm shadow-amber-50"><Clock size={12} /> Pending Action</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="bg-slate-50 p-6 border-t border-slate-100 text-center shrink-0">
                    <div className="inline-flex items-center gap-4 text-xs text-slate-500 font-black bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm uppercase tracking-tighter">
                        <span className="flex items-center gap-2">
                            SOURCE: <span className="text-slate-900">{sourceName}</span>
                        </span>
                        <ArrowRight size={14} className="text-slate-300" />
                        <span className="flex items-center gap-2">
                            DEST: <span className="text-slate-900">{destName}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransactionTimelineModal;
