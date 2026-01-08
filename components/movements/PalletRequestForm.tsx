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
    isEditing?: boolean;
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
    setNewRequestMeta,
    isEditing = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-xl font-black text-slate-900">
                        {isEditing ? 'แก้ไขคำขอพาเลท' : 'สร้างคำขอรับพาเลท'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                        title="ปิดหน้าต่าง"
                        aria-label="Close modal"
                    >
                        <Plus size={24} className="rotate-45 text-slate-400" />
                    </button>
                </div>
                {/* ... existing form fields ... */}
                {/* (I will replace the whole form block to ensure consistency) */}
                <form onSubmit={onSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                    {/* Items Section */}
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

                    <div className="grid grid-cols-1 gap-6">
                        {/* Request Type Toggle (Only for Hub) */}
                        {newRequestMeta.branchId === 'hub_nw' && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ประเภทการดำเนินการ</label>
                                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                                    <button
                                        type="button"
                                        onClick={() => setNewRequestMeta({ ...newRequestMeta, requestType: 'PUSH' })}
                                        className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${newRequestMeta.requestType === 'PUSH' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        ส่งพาเลทให้ (Push)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewRequestMeta({ ...newRequestMeta, requestType: 'PULL' })}
                                        className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${newRequestMeta.requestType === 'PULL' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        เรียกเก็บคืน (Pull)
                                    </button>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 text-blue-600">
                                {newRequestMeta.requestType === 'PULL' ? 'สาขาต้นทาง (ที่จะเรียกเก็บ)' : 'ปลายทางส่งคืน (ลูกค้า/ผู้ให้บริการ/สาขา)'}
                            </label>
                            <select
                                className={`w-full border rounded-xl p-4 font-black transition-all cursor-pointer ${newRequestMeta.requestType === 'PULL' ? 'bg-orange-50 border-orange-100 text-slate-900' : 'bg-blue-50 border-blue-100 text-slate-900'}`}
                                value={newRequestMeta.targetBranchId}
                                onChange={(e) => setNewRequestMeta({ ...newRequestMeta, targetBranchId: e.target.value })}
                                title="เลือกสาขา"
                                aria-label="Select target branch"
                                required
                            >
                                <option value="">เลือกสาขา/พาร์ทเนอร์...</option>
                                <optgroup label="สาขา/Hub">
                                    {BRANCHES.filter(b => b.id !== newRequestMeta.branchId).map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </optgroup>
                                {newRequestMeta.requestType === 'PUSH' && (
                                    <optgroup label="บริษัทลูกค้า / ผู้ให้บริการ">
                                        {EXTERNAL_PARTNERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </optgroup>
                                )}
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
                        className={`w-full py-5 text-white rounded-[2rem] font-black text-lg transition-all shadow-xl flex items-center justify-center gap-3 ${isEditing ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`}
                    >
                        <Send size={24} />
                        {isEditing ? 'บันทึกการแก้ไข (Update Request)' : 'ส่งคำขอ (Submit Request)'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PalletRequestForm;
