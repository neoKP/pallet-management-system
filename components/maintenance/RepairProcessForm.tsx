import React from 'react';
import { Hammer, Plus, Trash2, CheckCircle2, XCircle, Save } from 'lucide-react';
import { PALLET_TYPES, BRANCHES } from '../../constants';
import { PalletId, BranchId } from '../../types';

interface RepairProcessFormProps {
    pendingStock: Record<string, number>;
    batchItems: { palletId: PalletId; qty: number }[];
    addBatchItem: () => void;
    removeBatchItem: (index: number) => void;
    updateBatchItem: (index: number, field: 'palletId' | 'qty', value: any) => void;
    fixedQty: number;
    setFixedQty: (val: number) => void;
    scrappedQty: number;
    setScrappedQty: (val: number) => void;
    targetPalletId: PalletId;
    setTargetPalletId: (val: PalletId) => void;
    targetBranchId: BranchId;
    setTargetBranchId: (val: BranchId) => void;
    totalProcessed: number;
    onSubmit: (e: React.FormEvent) => void;
    isProcessing?: boolean;
}

const RepairProcessForm: React.FC<RepairProcessFormProps> = ({
    pendingStock,
    batchItems,
    addBatchItem,
    removeBatchItem,
    updateBatchItem,
    fixedQty,
    setFixedQty,
    scrappedQty,
    setScrappedQty,
    targetPalletId,
    setTargetPalletId,
    targetBranchId,
    setTargetBranchId,
    totalProcessed,
    onSubmit,
    isProcessing
}) => {
    return (
        <div className="glass p-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <Hammer className="text-blue-600" />
                บันทึกผลการซ่อม (ตัดจากคลังซ่อม)
            </h2>

            {/* Pending Stock Display */}
            <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
                <h3 className="font-bold text-orange-800 mb-3 text-sm uppercase tracking-wider">ของเสียรอซ่อม (Pending Repair)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PALLET_TYPES.map(p => {
                        const qty = pendingStock[p.id] || 0;
                        if (qty === 0 && !['loscam_red', 'loscam_blue', 'loscam_yellow'].includes(p.id)) return null;
                        return (
                            <div key={p.id} className="flex justify-between bg-white p-2.5 rounded-xl border border-orange-100 shadow-sm">
                                <span className="text-xs font-bold text-slate-500">{p.name}</span>
                                <span className="font-black text-slate-900">{qty}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-sm font-bold text-slate-700">รายการที่จะซ่อม</label>
                        <button
                            type="button"
                            onClick={addBatchItem}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
                        >
                            <Plus size={14} className="inline mr-1" />
                            เพิ่มรายการ
                        </button>
                    </div>

                    <div className="space-y-3">
                        {batchItems.map((item, idx) => {
                            const pallet = PALLET_TYPES.find(p => p.id === item.palletId);
                            return (
                                <div key={idx} className="flex gap-3 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <div className={`w-3 h-10 rounded-full shadow-sm ${pallet?.color || 'bg-slate-200'}`} />
                                    <select
                                        value={item.palletId}
                                        onChange={(e) => updateBatchItem(idx, 'palletId', e.target.value)}
                                        className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        title="เลือกประเภทพาเลท"
                                    >
                                        {PALLET_TYPES.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        value={item.qty}
                                        onChange={(e) => updateBatchItem(idx, 'qty', parseInt(e.target.value) || 0)}
                                        className="w-24 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-black text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Qty"
                                        min="0"
                                        title="จำนวน"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeBatchItem(idx)}
                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                        title="ลบรายการ"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            );
                        })}
                        {batchItems.length === 0 && (
                            <div className="py-8 text-center text-slate-400 text-sm italic">
                                ยังไม่มีรายการซ่อม กรุณากดเพิ่มรายการ
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100 flex flex-col gap-3">
                        <div>
                            <label className="block text-xs font-black text-green-700 mb-2 uppercase tracking-wider">
                                <CheckCircle2 size={14} className="inline mr-1" />
                                ซ่อมเสร็จแล้ว (คลังปกติ)
                            </label>
                            <input
                                type="number"
                                value={fixedQty}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setFixedQty(val);
                                    if (val <= totalProcessed) setScrappedQty(totalProcessed - val);
                                }}
                                className="w-full px-4 py-3 rounded-xl bg-white border border-green-200 text-green-700 font-black text-lg focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ประเภทเมื่อซ่อมเสร็จ</label>
                            <select
                                value={targetPalletId}
                                onChange={(e) => setTargetPalletId(e.target.value as PalletId)}
                                className="w-full px-3 py-2 rounded-lg bg-white border border-green-100 text-slate-700 text-xs font-bold outline-none focus:border-green-400 transition-all"
                                title="เลือกประเภทพาเลทเมื่อซ่อมเสร็จ"
                            >
                                {PALLET_TYPES.filter(p => {
                                    // Logic: เฉพาะพาเลทไม้เท่านั้นที่แปลงได้หลากหลาย
                                    // ถ้าของที่เอามาซ่อมเป็นไม้ ให้เลือกไม้ได้ทุุกอัน
                                    // ถ้าเป็นพลาสติก ให้ล็อกไว้ที่พลาสติก
                                    const firstItemMaterial = PALLET_TYPES.find(pt => pt.id === batchItems[0]?.palletId)?.material || 'wood';
                                    return p.material === firstItemMaterial;
                                }).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">สาขาปลายทาง</label>
                            <select
                                value={targetBranchId}
                                onChange={(e) => setTargetBranchId(e.target.value as BranchId)}
                                className="w-full px-3 py-2 rounded-lg bg-white border border-green-100 text-slate-700 text-xs font-bold outline-none focus:border-green-400 transition-all"
                                title="เลือกสาขาที่จะรับเข้า"
                            >
                                {BRANCHES.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                                <option value="maintenance_stock">คลังซ่อม (คงสต๊อกไว้ที่เดิม)</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 flex flex-col justify-center">
                        <label className="block text-xs font-black text-red-700 mb-2 uppercase tracking-wider">
                            <XCircle size={14} className="inline mr-1" />
                            เสีย/ทิ้ง
                        </label>
                        <input
                            type="number"
                            value={scrappedQty}
                            onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setScrappedQty(val);
                                if (val <= totalProcessed) setFixedQty(totalProcessed - val);
                            }}
                            className="w-full px-4 py-3 rounded-xl bg-white border border-red-200 text-red-700 font-black text-lg focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all"
                            placeholder="0"
                        />
                    </div>
                </div>

                <div className="p-5 bg-slate-900 text-white rounded-[2rem] shadow-xl">
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">รวมนำเข้า</div>
                            <div className="text-xl font-black">{totalProcessed}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">รวมออก</div>
                            <div className={`text-xl font-black ${totalProcessed > 0 && fixedQty + scrappedQty === totalProcessed ? 'text-white' : 'text-red-400'}`}>
                                {fixedQty + scrappedQty}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Yield</div>
                            <div className={`text-xl font-black ${(() => {
                                if (totalProcessed === 0) return 'text-slate-500';
                                const yieldVal = (fixedQty / totalProcessed) * 100;
                                if (yieldVal >= 80) return 'text-green-400';
                                if (yieldVal >= 50) return 'text-yellow-400';
                                return 'text-red-400';
                            })()}`}>
                                {totalProcessed > 0 ? ((fixedQty / totalProcessed) * 100).toFixed(1) : 0}%
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isProcessing || totalProcessed === 0 || fixedQty + scrappedQty !== totalProcessed}
                    className={`w-full py-5 rounded-[2rem] font-black text-lg transition-all shadow-xl flex items-center justify-center gap-2 ${isProcessing ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'} disabled:opacity-30 disabled:shadow-none`}
                >
                    {isProcessing ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Save size={20} />
                    )}
                    {isProcessing ? 'กำลังบันทึก...' : 'บันทึกผลการซ่อม'}
                </button>
            </form>
        </div>
    );
};

export default RepairProcessForm;
