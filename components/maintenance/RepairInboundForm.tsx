import React from 'react';
import { ArrowDownToLine } from 'lucide-react';
import { PALLET_TYPES } from '../../constants';
import { PalletId } from '../../types';

interface RepairInboundFormProps {
    form: { palletId: PalletId; qty: string; note: string };
    onChange: (form: any) => void;
    onSubmit: (e: React.FormEvent) => void;
}

const RepairInboundForm: React.FC<RepairInboundFormProps> = ({ form, onChange, onSubmit }) => {
    return (
        <div className="glass p-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <ArrowDownToLine className="text-blue-600" />
                รับพาเลทเสียเข้าคลังซ่อม
            </h2>
            <form onSubmit={onSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">ประเภทพาเลทเสีย</label>
                    <select
                        value={form.palletId}
                        onChange={e => onChange({ ...form, palletId: e.target.value as PalletId })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        title="เลือกประเภทพาเลทเสีย"
                    >
                        {PALLET_TYPES.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">จำนวน</label>
                    <input
                        type="number"
                        value={form.qty}
                        onChange={e => onChange({ ...form, qty: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        placeholder="0"
                        required
                        min="1"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">หมายเหตุ</label>
                    <input
                        type="text"
                        value={form.note}
                        onChange={e => onChange({ ...form, note: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        placeholder="เช่น พาเลทแตกหักจาก Hub"
                    />
                </div>
                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                    ยืนยันรับเข้า
                </button>
            </form>
        </div>
    );
};

export default RepairInboundForm;
