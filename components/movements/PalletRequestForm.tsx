import React from 'react';
import { Plus, Trash2, Send } from 'lucide-react';
import { PALLET_TYPES, BRANCHES, EXTERNAL_PARTNERS } from '../../constants';
import { PalletId } from '../../types';

interface PalletRequestFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    requestItems: { palletId: PalletId | ''; qty: string }[];
    handleAddItem: () => void;
    handleRemoveItem: (index: number) => void;
    handleItemChange: (index: number, field: 'palletId' | 'qty', value: string) => void;
    newRequestMeta: any;
    setNewRequestMeta: (meta: any) => void;
}

const PalletRequestForm: React.FC<PalletRequestFormProps> = ({
    isOpen,
    onClose,
    onSubmit,
    requestItems,
    handleAddItem,
    handleRemoveItem,
    handleItemChange,
    newRequestMeta,
    setNewRequestMeta
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-xl font-black text-slate-900">สร้างคำขอรับพาเลท</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                        title="ปิดหน้าต่าง"
                        aria-label="Close modal"
                    >
                        <Plus size={24} className="rotate-45 text-slate-400" />
                    </button>
                </div>
                <form onSubmit={onSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-bold text-slate-700">รายการพาเลท <span className="text-red-500">*</span></label>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                                <Plus size={14} /> เพิ่มรายการ
                            </button>
                        </div>
                        {requestItems.map((item, index) => (
                            <div key={index} className="flex gap-2 items-start">
                                <div className="flex-1">
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                        value={item.palletId}
                                        onChange={(e) => handleItemChange(index, 'palletId', e.target.value)}
                                        title="เลือกประเภทพาเลท"
                                        aria-label="Select pallet type"
                                        required
                                    >
                                        <option value="">เลือกพาเลท...</option>
                                        {PALLET_TYPES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="w-24">
                                    <input
                                        type="number"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-center"
                                        placeholder="0"
                                        value={item.qty}
                                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                        required
                                        min="1"
                                    />
                                </div>
                                {requestItems.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="p-3 text-slate-400 hover:text-red-500 transition-colors"
                                        title="ลบรายการ"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 text-blue-600">ปลายทางส่งคืน (ลูกค้า/ผู้ให้บริการ)</label>
                            <select
                                className="w-full bg-blue-50 border border-blue-100 rounded-xl p-4 font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                                value={newRequestMeta.targetBranchId}
                                onChange={(e) => setNewRequestMeta({ ...newRequestMeta, targetBranchId: e.target.value })}
                                title="เลือกปลายทาง"
                                aria-label="Select destination"
                            >
                                <option value="">เลือกปลายทาง...</option>
                                <optgroup label="สาขา/Hub">
                                    {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </optgroup>
                                <optgroup label="บริษัทลูกค้า / ผู้ให้บริการ">
                                    {EXTERNAL_PARTNERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </optgroup>
                            </select>
                        </div>

                        <div className="pt-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">ระดับความสำคัญ</label>
                            <div className="flex gap-2 h-[48px]">
                                <button
                                    type="button"
                                    onClick={() => setNewRequestMeta({ ...newRequestMeta, priority: 'NORMAL' })}
                                    className={`flex-1 rounded-xl font-bold text-xs transition-all ${newRequestMeta.priority === 'NORMAL' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}
                                >
                                    ปกติ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewRequestMeta({ ...newRequestMeta, priority: 'URGENT' })}
                                    className={`flex-1 rounded-xl font-bold text-xs transition-all ${newRequestMeta.priority === 'URGENT' ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'bg-slate-100 text-slate-500'}`}
                                >
                                    ด่วน
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">วัตถุประสงค์ (เช่น ส่งคืนลำสูง) <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            placeholder="ระบุจุดประสงค์การใช้งาน"
                            value={newRequestMeta.purpose}
                            onChange={(e) => setNewRequestMeta({ ...newRequestMeta, purpose: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">หมายเหตุเพิ่มเติม</label>
                        <textarea
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[80px]"
                            placeholder="ระบุรายละเอียดอื่นๆ (ถ้ามี)"
                            value={newRequestMeta.note}
                            onChange={(e) => setNewRequestMeta({ ...newRequestMeta, note: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3"
                    >
                        <Send size={24} /> ส่งคำขอ (Submit Request)
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PalletRequestForm;
