import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EXTERNAL_PARTNERS, PALLET_TYPES, AUTOMATION_RULES, BRANCHES } from '../../constants';
import { BranchId, PalletId, TransactionType } from '../../types';
import { Plus, Minus, ArrowDown, ArrowUp, Zap, Info, X, ChevronUp, Sparkles } from 'lucide-react';
import { calculatePartnerBalance } from '../../utils/businessLogic';
import { useStock } from '../../contexts/StockContext';
// @ts-ignore
import Swal from 'sweetalert2';

interface QuickLoopRecordProps {
    selectedBranch: BranchId;
}

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    show: { opacity: 1, scale: 1, y: 0 }
};

export const QuickLoopRecord: React.FC<QuickLoopRecordProps> = ({ selectedBranch }) => {
    const { transactions, addMovementBatch } = useStock();
    const [isOpen, setIsOpen] = useState(false);
    const [activePartner, setActivePartner] = useState<string | null>(null);
    const [activePallet, setActivePallet] = useState<PalletId | null>(null);
    const [qty, setQty] = useState<string>('');
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
    const [referenceDocNo, setReferenceDocNo] = useState('');
    const [transportInfo, setTransportInfo] = useState({
        carRegistration: '',
        vehicleType: '',
        driverName: '',
        transportCompany: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Target partners for branch-specific loop
    const loopPartners = useMemo(() => {
        if (selectedBranch === 'hub_nw') {
            const ids = ['sino', 'loscam_wangnoi'];
            return EXTERNAL_PARTNERS.filter(p => ids.includes(p.id));
        }
        const ids = ['lamsoon', 'ufc', 'loxley', 'kopee', 'hiq_th'];
        return EXTERNAL_PARTNERS.filter(p => ids.includes(p.id));
    }, [selectedBranch]);

    // Get current liability for a specific pallet/partner
    const getLiability = (partnerId: string, palletId: PalletId) => {
        return calculatePartnerBalance(transactions, partnerId, palletId);
    };

    const totalActiveDebt = useMemo(() => {
        return loopPartners.reduce((acc, p) => {
            const red = Math.abs(getLiability(p.id, 'loscam_red'));
            const blue = Math.abs(getLiability(p.id, 'loscam_blue'));
            const yellow = Math.abs(getLiability(p.id, 'loscam_yellow'));
            return acc + red + blue + yellow;
        }, 0);
    }, [loopPartners, transactions]);

    const handleAction = async (type: TransactionType) => {
        if (!activePartner || !activePallet) {
            Swal.fire({
                icon: 'warning',
                title: 'โปรดเลือกข้อมูล',
                text: 'กรุณาเลือกคู่ค้าและประเภทพาเลทก่อน',
                customClass: { popup: 'rounded-3xl border-none shadow-2xl' }
            });
            return;
        }

        const numericQty = parseInt(qty);
        if (isNaN(numericQty) || numericQty <= 0) {
            Swal.fire({ icon: 'warning', title: 'จำนวนไม่ถูกต้อง', text: 'กรุณาระบุจำนวนพาเลท' });
            return;
        }

        try {
            setIsSubmitting(true);

            let effectivePartnerId = activePartner;
            if (activePartner === 'loscam_wangnoi' && activePallet === 'loscam_red' && type === 'IN') {
                effectivePartnerId = 'neo_corp';
            }

            const tDate = transactionDate || new Date().toISOString().split('T')[0];
            const datePart = tDate.replace(/-/g, '');
            const existingDocNos = Array.from(new Set(transactions
                .filter(t => t.docNo && t.docNo.includes(datePart))
                .map(t => t.docNo)));
            const running = (existingDocNos.length + 1).toString().padStart(3, '0');
            const prefix = 'QL';
            const docNo = `${prefix}-${datePart}-${running}`;

            let status: 'PENDING' | 'COMPLETED' = 'PENDING';
            if (selectedBranch === 'sai3' && AUTOMATION_RULES.sai3.partnersWithAutoFlow.includes(effectivePartnerId)) {
                status = 'COMPLETED';
            }

            const srcPartner = EXTERNAL_PARTNERS.find(p => p.id === (type === 'IN' ? effectivePartnerId : selectedBranch));
            const dstPartner = EXTERNAL_PARTNERS.find(p => p.id === (type === 'IN' ? selectedBranch : effectivePartnerId));

            let display_source = srcPartner ? (srcPartner.name) : (BRANCHES.find(b => b.id === (type === 'IN' ? effectivePartnerId : selectedBranch))?.name || (type === 'IN' ? effectivePartnerId : selectedBranch));
            let display_dest = dstPartner ? (dstPartner.name) : (BRANCHES.find(b => b.id === (type === 'IN' ? selectedBranch : effectivePartnerId))?.name || (type === 'IN' ? selectedBranch : effectivePartnerId));

            if (selectedBranch === 'hub_nw' && type === 'OUT' && effectivePartnerId === 'loscam_wangnoi') {
                display_dest = 'บ. นีโอ คอร์ปอเรท';
            }

            const data = {
                type,
                source: type === 'IN' ? effectivePartnerId : selectedBranch,
                dest: type === 'IN' ? selectedBranch : effectivePartnerId,
                display_source,
                display_dest,
                items: [{ palletId: activePallet, qty: numericQty }],
                docNo,
                date: tDate,
                referenceDocNo: referenceDocNo || '',
                carRegistration: transportInfo.carRegistration || '',
                vehicleType: transportInfo.vehicleType || '',
                driverName: transportInfo.driverName || '',
                transportCompany: transportInfo.transportCompany || '',
                status,
                note: 'Quick Loop Entry (Widget)'
            };

            await addMovementBatch(data);

            setQty('');
            setReferenceDocNo('');
            setTransportInfo({ carRegistration: '', vehicleType: '', driverName: '', transportCompany: '' });
            setActivePartner(null);
            setActivePallet(null);

            Swal.fire({
                icon: 'success',
                title: 'บันทึกสำเร็จ!',
                timer: 1500,
                showConfirmButton: false,
                toast: true,
                position: 'top-end',
                background: '#0f172a',
                color: '#fff'
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Floating FAB Trigger with Sonar Effect */}
            <motion.div
                layoutId="quick-loop-fab-container"
                className="fixed bottom-24 left-6 md:bottom-8 md:left-8 z-[100]"
            >
                {totalActiveDebt > 0 && (
                    <div className="absolute inset-0">
                        <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20" />
                        <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-10 [animation-delay:0.5s]" />
                    </div>
                )}
                <motion.button
                    layoutId="quick-loop-fab"
                    onClick={() => setIsOpen(true)}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    className="relative w-16 h-16 bg-slate-900 border-2 border-slate-700/50 text-white rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center justify-center overflow-hidden group"
                    title="เปิดเมนูบันทึกด่วน (Quick Loop)"
                    aria-label="Open Quick Loop Record"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <Zap size={28} className="fill-blue-400 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)] group-hover:scale-110 transition-transform" />
                        {totalActiveDebt > 0 && (
                            <div className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 rounded-full border-4 border-slate-900 flex items-center justify-center overflow-hidden">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 bg-gradient-to-tr from-white/40 to-transparent"
                                />
                                <span className="text-[10px] font-black relative z-10 text-white leading-none">!</span>
                            </div>
                        )}
                    </div>
                </motion.button>
            </motion.div>

            {/* Smart Panel Overlay with Glassmorphism */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[110]"
                        />
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                            className="fixed bottom-0 inset-x-0 z-[120] bg-slate-50/80 backdrop-blur-2xl rounded-t-[3.5rem] shadow-[0_-20px_100px_rgba(0,0,0,0.15)] max-h-[92vh] overflow-hidden flex flex-col border-t border-white/50"
                        >
                            {/* Animated Background Mesh */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                                <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400 rounded-full blur-[100px] animate-pulse" />
                                <div className="absolute top-1/2 -right-24 w-64 h-64 bg-emerald-400 rounded-full blur-[80px] [animation-delay:1s] animate-pulse" />
                            </div>

                            <div className="w-full max-w-2xl mx-auto px-6 pb-12 pt-4 relative z-10 overflow-y-auto no-scrollbar">
                                {/* Grab Handle */}
                                <div className="flex justify-center mb-6">
                                    <div className="w-16 h-1.5 bg-slate-300/40 rounded-full" />
                                </div>

                                {/* Header with Gradient Text */}
                                <div className="flex items-center justify-between mb-10">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-slate-900 rounded-[1.5rem] text-white shadow-2xl shadow-blue-500/30 group">
                                            <Zap size={24} className="fill-blue-400 text-blue-400 group-hover:scale-125 transition-transform" />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-1 flex items-center gap-2">
                                                Express Loop <span className="bg-blue-600 text-white text-[14px] px-3 py-1 rounded-full font-black tracking-widest">V3.1</span>
                                            </h2>
                                            <p className="text-xs font-bold text-blue-500/70 uppercase tracking-[0.2em]">Next-Gen Smart Logistics Widget</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-3 bg-white/50 hover:bg-white text-slate-400 hover:text-red-500 rounded-full transition-all shadow-sm border border-slate-200/50"
                                        title="ปิด (Close)"
                                        aria-label="Close Smart Panel"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <motion.div
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="show"
                                    className="space-y-10"
                                >
                                    {/* 1. Partner Summary Cards */}
                                    <section>
                                        <div className="flex items-center justify-between mb-5 px-1">
                                            <div className="flex items-center gap-2">
                                                <Sparkles size={16} className="text-blue-500" />
                                                <p className="text-sm font-black uppercase tracking-widest text-slate-400">Target Partners</p>
                                            </div>
                                            <span className="px-3 py-1.5 rounded-full bg-slate-900/5 text-[11px] font-black text-slate-500 border border-slate-200/30">{selectedBranch.toUpperCase()} Mode</span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {loopPartners
                                                .sort((a, b) => {
                                                    const debtA = Math.abs(getLiability(a.id, 'loscam_red')) + Math.abs(getLiability(a.id, 'loscam_blue')) + Math.abs(getLiability(a.id, 'loscam_yellow'));
                                                    const debtB = Math.abs(getLiability(b.id, 'loscam_red')) + Math.abs(getLiability(b.id, 'loscam_blue')) + Math.abs(getLiability(b.id, 'loscam_yellow'));
                                                    return debtB - debtA;
                                                })
                                                .map(p => {
                                                    const redQty = Math.round(getLiability(p.id, 'loscam_red'));
                                                    const blueQty = Math.round(getLiability(p.id, 'loscam_blue'));
                                                    const yellowQty = Math.round(getLiability(p.id, 'loscam_yellow'));
                                                    const isMain = p.id === 'loscam_wangnoi';
                                                    const displayName = isMain ? 'Loscam (Main)' : p.name.replace('บ. ', '');
                                                    const hasAnyDebt = redQty !== 0 || blueQty !== 0 || yellowQty !== 0;

                                                    return (
                                                        <motion.button
                                                            key={p.id}
                                                            variants={itemVariants}
                                                            onClick={() => setActivePartner(p.id)}
                                                            whileHover={{ y: -6, scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            className={`p-6 rounded-[2rem] border-2 transition-all text-left relative overflow-hidden group ${activePartner === p.id
                                                                ? 'border-blue-500 bg-slate-900 text-white shadow-[0_20px_40px_rgba(0,0,0,0.15)]'
                                                                : 'border-white bg-white/60 text-slate-600 hover:border-blue-100 shadow-sm'}`}
                                                        >
                                                            <div className="relative z-10">
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <p className={`text-sm font-black uppercase leading-tight truncate pr-4 ${activePartner === p.id ? 'text-blue-400' : 'text-slate-500'}`}>{displayName}</p>
                                                                    {hasAnyDebt && (
                                                                        <div className="flex gap-1">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse [animation-delay:0.2s]" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="space-y-2 pt-1 border-t border-slate-100/10 mt-1">
                                                                    {redQty !== 0 && <p className="text-sm font-black tracking-tight flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" /> {redQty.toLocaleString()}</p>}
                                                                    {blueQty !== 0 && <p className="text-sm font-black tracking-tight flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> {blueQty.toLocaleString()}</p>}
                                                                    {yellowQty !== 0 && <p className="text-sm font-black tracking-tight flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]" /> {yellowQty.toLocaleString()}</p>}
                                                                    {!hasAnyDebt && <p className="text-xs font-black opacity-30 uppercase tracking-widest text-center mt-2">Balanced</p>}
                                                                </div>
                                                            </div>
                                                            {activePartner === p.id && (
                                                                <div className="absolute top-0 right-0 p-3 opacity-20">
                                                                    <Zap size={36} className="fill-blue-500 text-transparent" />
                                                                </div>
                                                            )}
                                                            <div className={`absolute bottom-0 left-0 h-1.5 bg-blue-500 transition-all duration-500 ${activePartner === p.id ? 'w-full' : 'w-0'}`} />
                                                        </motion.button>
                                                    );
                                                })}
                                        </div>
                                    </section>

                                    {/* 2. Pallet Selection */}
                                    <AnimatePresence mode="wait">
                                        {activePartner && (
                                            <motion.section
                                                initial={{ opacity: 0, y: 30 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 20 }}
                                                className="bg-white/40 p-1 rounded-[2.5rem] border border-white/60 shadow-inner"
                                            >
                                                <div className="bg-white/80 p-8 rounded-[2.4rem] shadow-sm">
                                                    <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-6 text-center">Select Pallet Type</p>
                                                    <div className="flex flex-wrap gap-4">
                                                        {PALLET_TYPES.filter(pt => {
                                                            if (!activePartner) return false;
                                                            if (['neo_corp', 'loscam_wangnoi', 'lamsoon', 'kopee'].includes(activePartner)) return pt.id === 'loscam_red';
                                                            if (['sino', 'ufc'].includes(activePartner)) return pt.id === 'loscam_red' || pt.id === 'loscam_blue';
                                                            if (activePartner === 'loxley') return ['loscam_red', 'loscam_blue', 'loscam_yellow'].includes(pt.id);
                                                            if (activePartner === 'hiq_th') return pt.id === 'hiq';
                                                            return pt.id.startsWith('loscam') || pt.id === 'hiq';
                                                        }).map(pt => (
                                                            <button
                                                                key={pt.id}
                                                                onClick={() => setActivePallet(pt.id as PalletId)}
                                                                className={`flex-1 min-w-[150px] p-7 rounded-[2.2rem] border-2 transition-all flex flex-col items-center gap-4 group relative overflow-hidden ${activePallet === pt.id
                                                                    ? 'border-blue-500 bg-slate-900 text-white shadow-xl translate-y-[-4px]'
                                                                    : 'border-slate-100 bg-white text-slate-400 hover:border-blue-100 hover:bg-blue-50/10'}`}
                                                            >
                                                                <div className={`w-5 h-5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)] ${pt.id === 'loscam_red' ? 'bg-red-500' : pt.id === 'loscam_blue' ? 'bg-blue-500' : pt.id === 'loscam_yellow' ? 'bg-yellow-400' : 'bg-orange-500'}`} />
                                                                <span className={`text-sm font-black uppercase tracking-widest ${activePallet === pt.id ? 'text-white' : 'text-slate-900'}`}>
                                                                    {pt.id.replace('loscam_', '').toUpperCase()}
                                                                </span>
                                                                <div className="flex items-center gap-2 opacity-60">
                                                                    <span className="text-[11px] font-bold uppercase tracking-tight">Balance:</span>
                                                                    <span className="text-xs font-black">{Math.round(getLiability(activePartner, pt.id as PalletId))}</span>
                                                                </div>
                                                                {activePallet === pt.id && (
                                                                    <motion.div
                                                                        layoutId="pallet-check"
                                                                        className="absolute -right-2 -bottom-2 opacity-10"
                                                                    >
                                                                        <Zap size={72} className="fill-white" />
                                                                    </motion.div>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.section>
                                        )}
                                    </AnimatePresence>

                                    {/* 3. Input Area */}
                                    <AnimatePresence mode="wait">
                                        {activePallet && (
                                            <motion.section
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="space-y-8"
                                            >
                                                <div className="relative group">
                                                    <div className="absolute inset-0 bg-blue-500/5 blur-[40px] opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                                    <input
                                                        type="number"
                                                        aria-label="Quantity"
                                                        value={qty}
                                                        onChange={(e) => setQty(e.target.value)}
                                                        placeholder="0"
                                                        className="w-full h-40 text-[9rem] font-black text-center rounded-[3.5rem] bg-slate-900 border-4 border-slate-800 text-blue-400 focus:border-blue-500 focus:ring-[1.5rem] focus:ring-blue-500/5 outline-none transition-all shadow-2xl relative z-10 selection:bg-blue-500/30"
                                                    />
                                                    <div className="absolute inset-x-0 bottom-6 text-center">
                                                        <span className="text-xs font-black text-slate-500 uppercase tracking-[0.5em] translate-y-2 inline-block">Units Qty Count</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-6 px-1">
                                                    <motion.button
                                                        disabled={isSubmitting}
                                                        onClick={() => handleAction('IN')}
                                                        whileHover={{ scale: 1.02, y: -4 }}
                                                        whileTap={{ scale: 0.96 }}
                                                        className="h-32 rounded-[2.5rem] font-black flex flex-col items-center justify-center gap-3 shadow-xl transition-all active:scale-95 disabled:opacity-30 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30 border-b-[10px] border-emerald-700 active:border-b-0 active:translate-y-2"
                                                    >
                                                        <ArrowDown size={40} className="drop-shadow-lg" />
                                                        <span className="text-base tracking-[0.15em] uppercase">RECEIVE IN</span>
                                                    </motion.button>
                                                    <motion.button
                                                        disabled={isSubmitting}
                                                        onClick={() => handleAction('OUT')}
                                                        whileHover={{ scale: 1.02, y: -4 }}
                                                        whileTap={{ scale: 0.96 }}
                                                        className="h-32 rounded-[2.5rem] font-black flex flex-col items-center justify-center gap-3 shadow-xl transition-all active:scale-95 disabled:opacity-30 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-blue-600/30 border-b-[10px] border-blue-800 active:border-b-0 active:translate-y-2"
                                                    >
                                                        <ArrowUp size={40} className="drop-shadow-lg" />
                                                        <span className="text-base tracking-[0.15em] uppercase">RETURN OUT</span>
                                                    </motion.button>
                                                </div>

                                                {/* Advanced Toggle */}
                                                <details className="group bg-white/40 rounded-[2.5rem] border border-white/60 overflow-hidden">
                                                    <summary className="list-none flex items-center justify-between px-10 py-6 cursor-pointer hover:bg-white/50 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white">
                                                                <ChevronUp size={20} className="group-open:rotate-180 transition-transform" />
                                                            </div>
                                                            <span className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Advanced Logistical Data</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                                                            <div className="w-2 h-2 rounded-full bg-slate-200" />
                                                        </div>
                                                    </summary>
                                                    <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-white/40">
                                                        <div className="space-y-8">
                                                            <div className="space-y-3">
                                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Document Date</label>
                                                                <input
                                                                    type="date"
                                                                    value={transactionDate}
                                                                    onChange={e => setTransactionDate(e.target.value)}
                                                                    className="w-full px-6 py-5 bg-white border border-slate-100 rounded-[1.5rem] text-base font-black text-slate-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-sm"
                                                                />
                                                            </div>
                                                            <div className="space-y-3">
                                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">ECD / Reference No.</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="e.g. INV-2024-XXX"
                                                                    value={referenceDocNo}
                                                                    onChange={e => setReferenceDocNo(e.target.value)}
                                                                    className="w-full px-6 py-5 bg-white border border-slate-100 rounded-[1.5rem] text-base font-black text-slate-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-sm placeholder:text-slate-300"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-8">
                                                            <div className="space-y-3">
                                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Vehicle Registration</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="70-1234 นฐ"
                                                                    value={transportInfo.carRegistration}
                                                                    onChange={e => setTransportInfo({ ...transportInfo, carRegistration: e.target.value })}
                                                                    className="w-full px-6 py-5 bg-white border border-slate-100 rounded-[1.5rem] text-base font-black text-slate-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-sm placeholder:text-slate-300"
                                                                />
                                                            </div>
                                                            <div className="space-y-3">
                                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Certified Driver</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Driver Name"
                                                                    value={transportInfo.driverName}
                                                                    onChange={e => setTransportInfo({ ...transportInfo, driverName: e.target.value })}
                                                                    className="w-full px-6 py-5 bg-white border border-slate-100 rounded-[1.5rem] text-base font-black text-slate-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-sm placeholder:text-slate-300"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </details>

                                                <div className="flex items-center justify-between pt-10 border-t border-slate-200/50">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                                                            <Info size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-900 font-black tracking-tight leading-none mb-1">Smart Engine v3.1</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Enterprise Production Release</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => { setActivePartner(null); setActivePallet(null); }}
                                                        className="px-8 py-3 rounded-full text-xs font-black text-slate-400 hover:text-red-500 hover:bg-red-50 uppercase tracking-[0.2em] transition-all"
                                                    >
                                                        Clear Selection
                                                    </button>
                                                </div>
                                            </motion.section>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};
