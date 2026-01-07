import React from 'react';
import { X, Truck, Building2, CheckCircle, Clock, MapPin, PackageCheck, ArrowRight } from 'lucide-react';
import { Transaction, BranchId } from '../../types';
import { BRANCHES, EXTERNAL_PARTNERS } from '../../constants';

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
    transaction: Transaction; // Representative transaction (the first one of a group)
}

const TransactionTimelineModal: React.FC<TransactionTimelineModalProps> = ({ isOpen, onClose, transaction }) => {
    if (!isOpen) return null;

    const sourceName = BRANCHES.find(b => b.id === transaction.source)?.name ||
        EXTERNAL_PARTNERS.find(p => p.id === transaction.source)?.name ||
        transaction.source;

    const destName = BRANCHES.find(b => b.id === transaction.dest)?.name ||
        EXTERNAL_PARTNERS.find(p => p.id === transaction.dest)?.name ||
        transaction.dest;

    const isCompleted = transaction.status === 'COMPLETED';

    // Determine steps
    const steps = [
        {
            title: 'สินค้าออกจากต้นทาง (Dispatched)',
            description: `ส่งออกจาก ${sourceName}`,
            detail: `Doc: ${transaction.docNo}`,
            date: formatDate(transaction.date),
            icon: Truck,
            status: 'completed',
            color: 'bg-emerald-500'
        },
        {
            title: 'อยู่ระหว่างดำเนินการ (In Transit)',
            description: 'ระบบบันทึกการส่งและแจ้งเตือนปลายทาง',
            detail: 'รอปลายทางตรวจสอบ',
            date: formatDate(transaction.date), // Approximate
            icon: MapPin,
            status: 'completed', // Always completed if record exists
            color: 'bg-blue-500'
        },
        {
            title: 'การรับสินค้า (Receiving)',
            description: `รับเข้าที่ ${destName}`,
            detail: isCompleted ? 'ตรวจสอบและยืนยันแล้ว' : 'รอการตรวจสอบ (Action Required)',
            date: isCompleted ? formatDate(transaction.date) : '-', // We don't have separate completedAt yet
            icon: PackageCheck,
            status: isCompleted ? 'completed' : 'current',
            color: isCompleted ? 'bg-emerald-500' : 'bg-amber-500'
        }
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20 animate-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="bg-slate-50/80 p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Timeline & Tracking</h3>
                            <p className="text-sm text-slate-500 font-medium">ติดตามสถานะการขนส่ง (Shipment Status)</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors" aria-label="Close">
                        <X size={24} className="text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 md:p-10 relative">
                    {/* Connection Line */}
                    <div className="absolute left-[3.25rem] md:left-[3.75rem] top-12 bottom-12 w-1 bg-slate-100 rounded-full" />

                    <div className="space-y-12 relative">
                        {steps.map((step, idx) => {
                            const isLast = idx === steps.length - 1;
                            const isCurrent = step.status === 'current';

                            return (
                                <div key={idx} className={`relative flex gap-6 md:gap-8 group ${isCurrent ? 'opacity-100' : 'opacity-100'}`}>
                                    {/* Icon Marker */}
                                    <div className={`relative shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-lg border-4 border-white z-10 transition-transform duration-500 ${isCurrent ? 'scale-110 ring-4 ring-amber-100' : ''} ${step.color} text-white`}>
                                        <step.icon size={28} className={isCurrent ? 'animate-pulse' : ''} />
                                        {step.status === 'completed' && (
                                            <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white rounded-full p-1 text-white">
                                                <CheckCircle size={10} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className={`flex-1 pt-1 ${isCurrent ? 'animate-in slide-in-from-left-2' : ''}`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-lg font-bold ${isCurrent ? 'text-amber-600' : 'text-slate-900'}`}>
                                                {step.title}
                                            </h4>
                                            <span className="text-xs font-bold text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded">
                                                {step.date}
                                            </span>
                                        </div>
                                        <p className="text-slate-600 font-medium mb-1">{step.description}</p>
                                        <p className={`text-sm ${isCurrent ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                                            {step.detail}
                                        </p>

                                        {/* Status Badge */}
                                        <div className="mt-3">
                                            {step.status === 'completed' && <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full inline-flex items-center gap-1"><CheckCircle size={12} /> Completed</span>}
                                            {step.status === 'current' && <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full inline-flex items-center gap-1 animate-pulse"><Clock size={12} /> Pending Action</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="bg-slate-50 p-6 border-t border-slate-100 text-center">
                    <div className="inline-flex items-center gap-4 text-sm text-slate-500 font-medium bg-white px-6 py-3 rounded-xl border border-slate-200 shadow-sm">
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Source: {sourceName}
                        </span>
                        <ArrowRight size={16} className="text-slate-300" />
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Dest: {destName}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransactionTimelineModal;
