import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Package } from 'lucide-react';
import { Transaction, PalletId } from '../../types';
import { PALLET_TYPES } from '../../constants';

interface ReceiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: Transaction[]; // The group of transactions (items) in this shipment
    onConfirm: (group: Transaction[]) => void;
}

const ReceiveModal: React.FC<ReceiveModalProps> = ({ isOpen, onClose, group, onConfirm }) => {
    const [inputs, setInputs] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);

    // Group items by palletId (in case multiple lines of same pallet)
    const consolidatedItems = group.reduce((acc, tx) => {
        if (!acc[tx.palletId]) {
            acc[tx.palletId] = { ...tx, qty: 0 };
        }
        acc[tx.palletId].qty += tx.qty;
        return acc;
    }, {} as Record<string, Transaction>);

    const items = Object.values(consolidatedItems);

    useEffect(() => {
        if (isOpen) {
            setInputs({});
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const sourceBranch = group[0]?.source || '?';
    const docNo = group[0]?.docNo || '?';

    const handleInputChange = (palletId: string, value: string) => {
        setInputs(prev => ({ ...prev, [palletId]: value }));
        setError(null);
    };

    const handleConfirm = () => {
        // Validate
        for (const item of items) {
            const inputQty = parseInt(inputs[item.palletId] || '0');
            if (inputQty !== item.qty) {
                setError(`จำนวนยอดรับไม่ถูกต้องสำหรับ ${PALLET_TYPES.find(p => p.id === item.palletId)?.name} (แจ้งมา: ${item.qty}, นับได้: ${inputQty})`);
                return;
            }
        }

        onConfirm(group);
        onClose();
    };

    const isAllMatched = items.every(item => parseInt(inputs[item.palletId] || '0') === item.qty);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Package className="text-blue-600" />
                            ตรวจสอบการรับเข้า (Verify Inbound)
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">Doc No: <span className="font-mono text-slate-700">{docNo}</span> | From: <span className="font-bold text-slate-700">{sourceBranch}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-sm text-blue-900">
                        <AlertTriangle size={20} className="shrink-0 text-blue-600" />
                        <p>กรุณานับจำนวนสินค้าจริงที่ได้รับ และกรอกลงในช่อง "จำนวนที่นับได้" เพื่อยืนยันความถูกต้อง</p>
                    </div>

                    <div className="space-y-3">
                        {items.map((item) => {
                            const pallet = PALLET_TYPES.find(p => p.id === item.palletId);
                            const inputVal = inputs[item.palletId] || '';
                            const isMatch = parseInt(inputVal) === item.qty;
                            const isFilled = inputVal !== '';

                            return (
                                <div key={item.palletId} className={`p-4 rounded-xl border-2 transition-all ${isMatch ? 'border-green-500 bg-green-50' : 'border-slate-100 bg-white'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="font-bold text-slate-900">{pallet?.name}</div>
                                        <div className="text-xs font-bold text-slate-500">ยอดส่งมา: {item.qty}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="grow">
                                            <input
                                                type="number"
                                                placeholder="ระบุนวนที่นับได้..."
                                                className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-all ${isFilled && !isMatch ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-200'}`}
                                                value={inputVal}
                                                onChange={(e) => handleInputChange(item.palletId, e.target.value)}
                                            />
                                        </div>
                                        <div className="shrink-0 w-8 flex justify-center">
                                            {isMatch ? (
                                                <Check className="text-green-600 animate-in zoom-in" />
                                            ) : isFilled ? (
                                                <X className="text-red-500 animate-in zoom-in" />
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-slate-300" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-lg flex items-center gap-2 animate-in slide-in-from-top-1">
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isAllMatched}
                        className={`px-6 py-2 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${isAllMatched ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-slate-300 cursor-not-allowed'}`}
                    >
                        <Check size={18} />
                        ยืนยันการรับ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiveModal;
