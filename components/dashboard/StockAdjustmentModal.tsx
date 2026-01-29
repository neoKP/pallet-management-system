import React, { useState, useEffect } from 'react';
import { X, Check, ArrowUp, ArrowDown, Info } from 'lucide-react';
import { PalletId, BranchId } from '../../types';
import { PALLET_TYPES, BRANCHES } from '../../constants';
import Swal from 'sweetalert2';

interface StockAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        type: 'IN' | 'OUT' | 'ABSOLUTE';
        branchId: string;
        palletId: PalletId;
        qty: number;
        note: string;
    }) => void;
    currentBranch: BranchId | 'ALL';
    stock: any;
    transactions: any[];
}

const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    currentBranch,
    stock,
    transactions
}) => {
    const [adjType, setAdjType] = useState<'IN' | 'OUT' | 'ABSOLUTE'>('IN');
    const [selectedBranch, setSelectedBranch] = useState<string>(currentBranch === 'ALL' ? 'hub_nw' : currentBranch);
    const [selectedPallet, setSelectedPallet] = useState<PalletId>('loscam_red');
    const [qty, setQty] = useState<string>('');
    const [note, setNote] = useState<string>('');

    // --- Helper to calculate current balance ---
    const currentBalance = React.useMemo(() => {
        const isBranch = BRANCHES.some(b => b.id === selectedBranch);
        if (isBranch) {
            return stock[selectedBranch as BranchId]?.[selectedPallet as PalletId] || 0;
        } else {
            // For partners, calculate from transactions
            const { calculatePartnerBalance } = require('../../utils/businessLogic');
            return calculatePartnerBalance(transactions, selectedBranch, selectedPallet);
        }
    }, [selectedBranch, selectedPallet, stock, transactions]);

    const expectedTotal = React.useMemo(() => {
        const amount = parseInt(qty) || 0;
        if (adjType === 'ABSOLUTE') return amount;
        if (adjType === 'IN') return currentBalance + amount;
        return currentBalance - amount;
    }, [currentBalance, qty, adjType]);

    useEffect(() => {
        if (isOpen) {
            setAdjType('IN');
            setSelectedBranch(currentBranch === 'ALL' ? 'hub_nw' : currentBranch);
            setSelectedPallet('loscam_red');
            setQty('');
            setNote('');
        }
    }, [isOpen, currentBranch]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const quantity = parseInt(qty);
        if (!quantity || quantity <= 0) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Quantity',
                text: 'Please enter a valid positive number.',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        if (!note.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Note Required',
                text: 'Please provide a reason for the adjustment.',
                confirmButtonColor: '#f59e0b'
            });
            return;
        }

        onSubmit({
            type: adjType,
            branchId: selectedBranch,
            palletId: selectedPallet,
            qty: quantity,
            note: note.trim()
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center shrink-0">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <Info size={20} className="text-blue-400" />
                        Stock Adjustment
                    </h2>
                    <button
                        onClick={onClose}
                        aria-label="Close modal"
                        className="text-slate-400 hover:text-white transition-colors bg-white/10 p-1 rounded-full"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">

                    {/* Adjustment Type Toggle */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setAdjType('IN')}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black transition-all ${adjType === 'IN'
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'text-slate-500 hover:bg-slate-200'
                                }`}
                        >
                            <ArrowUp size={14} />
                            ADD (+)
                        </button>
                        <button
                            type="button"
                            onClick={() => setAdjType('OUT')}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black transition-all ${adjType === 'OUT'
                                ? 'bg-red-500 text-white shadow-md'
                                : 'text-slate-500 hover:bg-slate-200'
                                }`}
                        >
                            <ArrowDown size={14} />
                            REDUCE (-)
                        </button>
                        <button
                            type="button"
                            onClick={() => setAdjType('ABSOLUTE')}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black transition-all ${adjType === 'ABSOLUTE'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-slate-500 hover:bg-slate-200'
                                }`}
                        >
                            <Check size={14} />
                            SET TOTAL
                        </button>
                    </div>

                    {/* Balance Preview Card */}
                    <div className="bg-slate-900 rounded-2xl p-4 flex justify-between items-center overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Balance</p>
                            <h3 className="text-2xl font-black text-white">{currentBalance.toLocaleString()}</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Expected Result</p>
                            <h3 className={`text-2xl font-black ${adjType === 'ABSOLUTE' ? 'text-blue-400' : (expectedTotal > currentBalance ? 'text-emerald-400' : 'text-red-400')}`}>
                                {expectedTotal.toLocaleString()}
                            </h3>
                        </div>
                    </div>

                    {/* Branch Selection */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Branch</label>
                        <select
                            aria-label="Select Branch"
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            disabled={currentBranch !== 'ALL'} // Lock if user is not viewing ALL (implies they are branch user)
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                            {BRANCHES.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Pallet Selection */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pallet Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {PALLET_TYPES.map(pallet => {
                                const palletDotStyle = { backgroundColor: pallet.color };
                                return (
                                    <button
                                        key={pallet.id}
                                        type="button"
                                        onClick={() => setSelectedPallet(pallet.id)}
                                        className={`px-3 py-2 rounded-xl text-left border transition-all relative overflow-hidden group ${selectedPallet === pallet.id
                                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/50 z-10'
                                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            {/* eslint-disable-next-line */}
                                            <div className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0" {...{ style: palletDotStyle }} />
                                            <span className={`text-xs font-bold leading-tight ${selectedPallet === pallet.id ? 'text-slate-900' : 'text-slate-600'}`}>
                                                {pallet.name}
                                            </span>
                                        </div>
                                        {selectedPallet === pallet.id && (
                                            <div className="absolute top-1 right-1">
                                                <Check size={12} className="text-blue-600" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Quantity & Note */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 col-span-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity</label>
                            <input
                                type="number"
                                value={qty}
                                onChange={(e) => setQty(e.target.value)}
                                placeholder="0"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Reason / Note <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Why is this adjustment needed?"
                                rows={2}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/20 transition-all active:scale-[0.98]"
                        >
                            Confirm Adjustment
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default StockAdjustmentModal;
