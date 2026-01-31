import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Package } from 'lucide-react';
import { Transaction, PalletId } from '../../types';
import { PALLET_TYPES } from '../../constants';

interface ReceiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: Transaction[]; // The group of transactions (items) in this shipment
    onConfirm: (group: Transaction[]) => void;
    isProcessing?: boolean;
}

const ReceiveModal: React.FC<ReceiveModalProps> = ({ isOpen, onClose, group, onConfirm, isProcessing }) => {
    // Local state for items being verified, allowing adjustments and splits
    const [adjustedItems, setAdjustedItems] = useState<Transaction[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Clone the group to allow local adjustments
            setAdjustedItems(group.map(tx => ({ ...tx })));
            setError(null);
        }
    }, [isOpen, group]);

    if (!isOpen) return null;

    const sourceBranch = group[0]?.source || '?';
    const docNo = group[0]?.docNo || '?';

    const handlePalletChange = (index: number, newPalletId: PalletId) => {
        const newItems = [...adjustedItems];
        newItems[index] = { ...newItems[index], palletId: newPalletId };
        setAdjustedItems(newItems);
        setError(null);
    };

    const handleQtyChange = (index: number, value: string) => {
        const newItems = [...adjustedItems];
        newItems[index] = { ...newItems[index], qty: parseInt(value) || 0 };
        setAdjustedItems(newItems);
        setError(null);
    };

    const handleSplit = (index: number) => {
        const itemToSplit = adjustedItems[index];
        const newItem: Transaction = {
            ...itemToSplit,
            id: Date.now() + Math.floor(Math.random() * 1000), // New temp ID
            qty: 0, // Let user specify the split qty
        };
        const newItems = [...adjustedItems];
        newItems.splice(index + 1, 0, newItem);
        setAdjustedItems(newItems);
    };

    const handleRemoveSplit = (index: number) => {
        if (adjustedItems.length <= 1) return;
        setAdjustedItems(adjustedItems.filter((_, i) => i !== index));
    };

    const handleConfirm = () => {
        const totalQtyReceived = adjustedItems.reduce((sum, item) => sum + item.qty, 0);
        const totalQtySent = group.reduce((sum, item) => sum + item.qty, 0);

        // Validation
        if (totalQtyReceived === 0) {
            setError('กรุณาระบุจำนวนสินค้าที่ได้รับ');
            return;
        }

        for (const item of adjustedItems) {
            if (item.qty < 0) {
                setError('จำนวนสินค้าไม่สามารถติดลบได้');
                return;
            }
        }

        onConfirm(adjustedItems);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="bg-white p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <Package className="text-white" size={18} />
                            </div>
                            ตรวจสอบการรับเข้า
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded uppercase tracking-wider">DOC: {docNo}</span>
                            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded uppercase tracking-wider">FROM: {sourceBranch}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors" title="ปิดหน้าต่าง">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto bg-slate-50/50">
                    <div className="bg-blue-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-100 flex gap-4">
                        <AlertTriangle className="shrink-0" size={24} />
                        <div className="text-sm">
                            <p className="font-bold mb-1">คำแนะนำการรับสินค้า</p>
                            <p className="opacity-90">หากพบสินค้าไม่ตรงประเภท สามารถกด "แยกรายการ" เพื่อระบุจำนวนตามประเภทที่ได้รับจริงได้</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {adjustedItems.map((item, idx) => {
                            const pallet = PALLET_TYPES.find(p => p.id === item.palletId);
                            const isNewSplit = !group.some(g => g.id === item.id);

                            return (
                                <div key={item.id} className={`group relative bg-white p-5 rounded-3xl border-2 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 ${isNewSplit ? 'border-blue-200 ring-4 ring-blue-50' : 'border-white shadow-sm'}`}>
                                    <div className="grid grid-cols-12 gap-4 items-end">
                                        <div className="col-span-7">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">ประเภทพาเลท</label>
                                            <div className="relative">
                                                <select
                                                    value={item.palletId}
                                                    onChange={(e) => handlePalletChange(idx, e.target.value as PalletId)}
                                                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-900 appearance-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                                                    title="เลือกประเภทพาเลท"
                                                    aria-label="เลือกประเภทพาเลท"
                                                >
                                                    {PALLET_TYPES.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-span-4">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1 text-center">จำนวนที่รับ</label>
                                            <input
                                                type="number"
                                                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-black text-xl text-center text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all"
                                                value={item.qty || ''}
                                                placeholder="0"
                                                onChange={(e) => handleQtyChange(idx, e.target.value)}
                                                title="จำนวนที่รับจริง"
                                                aria-label="จำนวนที่รับจริง"
                                            />
                                        </div>

                                        <div className="col-span-1 flex flex-col gap-2">
                                            <button
                                                onClick={() => handleSplit(idx)}
                                                className="p-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                                                title="แยกรายการ"
                                            >
                                                <AlertTriangle size={18} />
                                            </button>
                                            {adjustedItems.length > 1 && (
                                                <button
                                                    onClick={() => handleRemoveSplit(idx)}
                                                    className="p-2 bg-slate-50 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                                                    title="ลบรายการ"
                                                >
                                                    <X size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {isNewSplit && (
                                        <div className="absolute -top-3 left-6 px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full shadow-lg shadow-blue-200 uppercase tracking-widest">
                                            รายการแยก
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-2xl flex items-center gap-3 border border-red-100 animate-in shake-2">
                            <AlertTriangle size={20} />
                            {error}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
                    <div className="text-slate-400 text-sm font-bold">
                        ยอดรับรวม: <span className="text-slate-900 text-lg font-black">{adjustedItems.reduce((s, i) => s + i.qty, 0)}</span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-2xl font-black text-slate-400 hover:bg-slate-50 transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isProcessing}
                            className={`px-10 py-3 rounded-2xl font-black shadow-xl transition-all flex items-center gap-2 ${isProcessing ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-95'}`}
                        >
                            {isProcessing ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Check size={20} />
                            )}
                            {isProcessing ? 'กำลังบันทึก...' : 'ยืนยันการรับเข้า'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiveModal;
