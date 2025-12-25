import React, { useState } from 'react';
import { Hammer, Plus, Trash2, CheckCircle2, XCircle, Save, ArrowDownToLine, Settings } from 'lucide-react';
import { PALLET_TYPES } from '../../constants';
import { Stock, BranchId, PalletId, Transaction } from '../../types';

interface MaintenanceTabProps {
    stock: Stock;
    selectedBranch: BranchId;
    onBatchMaintenance: (data: any) => void;
    onAddTransaction: (transaction: Partial<Transaction>) => void;
}

const MaintenanceTab: React.FC<MaintenanceTabProps> = ({ stock, selectedBranch, onBatchMaintenance, onAddTransaction }) => {
    const [subTab, setSubTab] = useState<'inbound' | 'process'>('inbound');

    // Inbound State
    const [inboundForm, setInboundForm] = useState({
        palletId: 'loscam_red' as PalletId,
        qty: '',
        note: ''
    });

    // Process State
    const [batchItems, setBatchItems] = useState<{ palletId: PalletId; qty: number }[]>([]);
    const [fixedQty, setFixedQty] = useState(0);
    const [scrappedQty, setScrappedQty] = useState(0);
    const [note, setNote] = useState('');

    // --- Inbound Logic ---
    const handleInboundSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const qty = parseInt(inboundForm.qty);
        if (qty <= 0) return;

        onAddTransaction({
            type: 'OUT', // Move out from Hub to Maintenance
            source: selectedBranch,
            dest: 'maintenance_stock',
            palletId: inboundForm.palletId,
            qty: qty,
            note: inboundForm.note || 'ส่งซ่อม'
        });

        alert('ส่งเข้าคลังซ่อมเรียบร้อย');
        setInboundForm({ ...inboundForm, qty: '', note: '' });
    };

    // --- Process Logic ---
    const pendingStock = stock['maintenance_stock'] || {};

    const addBatchItem = () => {
        setBatchItems([...batchItems, { palletId: 'loscam_red', qty: 0 }]);
    };

    const removeBatchItem = (index: number) => {
        setBatchItems(batchItems.filter((_, i) => i !== index));
    };

    const updateBatchItem = (index: number, field: 'palletId' | 'qty', value: any) => {
        const updated = [...batchItems];
        updated[index] = { ...updated[index], [field]: value };
        setBatchItems(updated);
    };

    const totalProcessed = batchItems.reduce((sum, item) => sum + item.qty, 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate Quantity against Pending Stock
        for (const item of batchItems) {
            const currentPending = pendingStock[item.palletId] || 0;
            if (item.qty > currentPending) {
                alert(`จำนวน ${PALLET_TYPES.find(p => p.id === item.palletId)?.name} ในคลังซ่อมมีไม่พอ (มี: ${currentPending}, จะซ่อม: ${item.qty})`);
                return;
            }
        }

        if (fixedQty + scrappedQty !== totalProcessed) {
            alert('ยอดรวม (ซ่อมได้ + ทิ้ง) ต้องเท่ากับจำนวนที่เบิกมาซ่อม');
            return;
        }

        onBatchMaintenance({
            items: batchItems,
            fixedQty,
            scrappedQty,
            note,
            branchId: 'maintenance_stock' // Deduct from Maintenance Stock
        });

        setBatchItems([]);
        setFixedQty(0);
        setScrappedQty(0);
        setNote('');
        alert('บันทึกผลการซ่อมสำเร็จ!');
    };


    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Sub-Tab Navigation */}
            <div className="flex p-1 bg-white/50 backdrop-blur rounded-2xl border border-slate-200">
                <button
                    onClick={() => setSubTab('inbound')}
                    className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${subTab === 'inbound' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <ArrowDownToLine size={20} />
                    1. รับเข้าคลังซ่อม
                </button>
                <button
                    onClick={() => setSubTab('process')}
                    className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${subTab === 'process' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Settings size={20} />
                    2. บันทึกผลการซ่อม
                </button>
            </div>

            {subTab === 'inbound' && (
                <div className="glass p-6 rounded-3xl border border-slate-200 bg-white">
                    <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                        <ArrowDownToLine className="text-blue-600" />
                        รับพาเลทเสียเข้าคลังซ่อม
                    </h2>
                    <form onSubmit={handleInboundSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ประเภทพาเลทเสีย</label>
                            <select
                                value={inboundForm.palletId}
                                onChange={e => setInboundForm({ ...inboundForm, palletId: e.target.value as PalletId })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900"
                                title="เลือกประเภทพาเลทเสีย"
                                aria-label="เลือกประเภทพาเลทเสีย"
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
                                value={inboundForm.qty}
                                onChange={e => setInboundForm({ ...inboundForm, qty: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900"
                                placeholder="0"
                                required
                                min="1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">หมายเหตุ</label>
                            <input
                                type="text"
                                value={inboundForm.note}
                                onChange={e => setInboundForm({ ...inboundForm, note: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900"
                                placeholder="เช่น พาเลทแตกหักจาก Hub"
                            />
                        </div>
                        <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all">
                            ยืนยันรับเข้า
                        </button>
                    </form>
                </div>
            )}

            {subTab === 'process' && (
                <div className="glass p-6 rounded-3xl border border-slate-200 bg-white">
                    <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                        <Hammer className="text-blue-600" />
                        บันทึกผลการซ่อม (ตัดจากคลังซ่อม)
                    </h2>

                    {/* Pending Stock Display */}
                    <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
                        <h3 className="font-bold text-orange-800 mb-3">ของเสียรอซ่อม (Pending Repair)</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {PALLET_TYPES.map(p => {
                                const qty = pendingStock[p.id] || 0;
                                if (qty === 0 && !['loscam_red', 'loscam_blue', 'loscam_yellow'].includes(p.id)) return null;
                                return (
                                    <div key={p.id} className="flex justify-between bg-white p-2 rounded-lg border border-orange-100">
                                        <span className="text-xs text-slate-500">{p.name}</span>
                                        <span className="font-bold text-slate-900">{qty}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Batch Items */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-sm font-bold text-slate-700">รายการที่จะซ่อม</label>
                                <button
                                    type="button"
                                    onClick={addBatchItem}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all"
                                >
                                    <Plus size={16} className="inline mr-1" />
                                    เพิ่มรายการ
                                </button>
                            </div>

                            <div className="space-y-3">
                                {batchItems.map((item, idx) => {
                                    const pallet = PALLET_TYPES.find(p => p.id === item.palletId);
                                    return (
                                        <div key={idx} className="flex gap-3 items-center">
                                            <div className={`w-3 h-10 rounded-md shadow-sm ${pallet?.color || 'bg-slate-200'}`} title={`สี${pallet?.name || 'พาเลท'}`} />
                                            <select
                                                value={item.palletId}
                                                onChange={(e) => updateBatchItem(idx, 'palletId', e.target.value)}
                                                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm"
                                                title="เลือกประเภทพาเลท"
                                                aria-label="เลือกประเภทพาเลท"
                                            >
                                                {PALLET_TYPES.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                value={item.qty}
                                                onChange={(e) => updateBatchItem(idx, 'qty', parseInt(e.target.value) || 0)}
                                                className="w-24 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm"
                                                placeholder="Qty"
                                                min="0"
                                                title="จำนวน"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeBatchItem(idx)}
                                                className="p-2 bg-red-500/20 text-red-200 rounded-xl hover:bg-red-500/30"
                                                title="ลบรายการ"
                                                aria-label="ลบรายการ"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Results */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    <CheckCircle2 size={16} className="inline mr-1" />
                                    ซ่อมแล้ว (แปลงเป็น General)
                                </label>
                                <input
                                    type="number"
                                    value={fixedQty}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setFixedQty(val);
                                        if (val <= totalProcessed) setScrappedQty(totalProcessed - val);
                                    }}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900"
                                    placeholder="0"
                                    title="จำนวนที่ซ่อมแล้ว"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    <XCircle size={16} className="inline mr-1" />
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
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900"
                                    placeholder="0"
                                    title="จำนวนที่เสีย/ทิ้ง"
                                />
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <div className="text-slate-500">รวมนำเข้า</div>
                                    <div className="text-2xl font-black text-slate-900">{totalProcessed}</div>
                                </div>
                                <div>
                                    <div className="text-slate-500">รวมออก</div>
                                    <div className={`text-2xl font-black ${totalProcessed > 0 && fixedQty + scrappedQty === totalProcessed ? 'text-slate-900' : 'text-red-500'}`}>
                                        {fixedQty + scrappedQty}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-slate-500">Yield</div>
                                    <div className={`text-2xl font-black ${(() => {
                                        if (totalProcessed === 0) return 'text-slate-400';
                                        const yieldVal = (fixedQty / totalProcessed) * 100;
                                        if (yieldVal >= 80) return 'text-green-600';
                                        if (yieldVal >= 50) return 'text-yellow-600';
                                        return 'text-red-600';
                                    })()}`}>
                                        {totalProcessed > 0 ? ((fixedQty / totalProcessed) * 100).toFixed(1) : 0}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={totalProcessed === 0 || fixedQty + scrappedQty !== totalProcessed}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Save size={20} />
                            บันทึกผลการซ่อม
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default MaintenanceTab;
