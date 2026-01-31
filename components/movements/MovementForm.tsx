import React from 'react';
import { ArrowDownCircle, ArrowUpCircle, Save, Plus, Trash2, Truck } from 'lucide-react';
import { TransactionType, PalletId, BranchId } from '../../types';
import { BRANCHES, EXTERNAL_PARTNERS, PALLET_TYPES, VEHICLE_TYPES } from '../../constants';

interface MovementFormProps {
    transactionType: TransactionType;
    setTransactionType: (type: TransactionType) => void;
    target: string;
    setTarget: (target: string) => void;
    transactionDate: string;
    setTransactionDate: (date: string) => void;
    referenceDocNo: string;
    setReferenceDocNo: (doc: string) => void;
    items: { palletId: PalletId | ''; qty: string }[];
    handleItemChange: (index: number, field: 'palletId' | 'qty', value: string) => void;
    handleRemoveItem: (index: number) => void;
    handleAddItem: () => void;
    transportInfo: any;
    setTransportInfo: (info: any) => void;
    onSubmit: (e: React.FormEvent) => void;
    suggestions?: {
        carRegistrations: string[];
        driverNames: string[];
        transportCompanies: string[];
    };
    selectedBranch: BranchId;
    isProcessing?: boolean;
}

const MovementForm: React.FC<MovementFormProps> = ({
    transactionType,
    setTransactionType,
    target,
    setTarget,
    transactionDate,
    setTransactionDate,
    referenceDocNo,
    setReferenceDocNo,
    items,
    handleItemChange,
    handleRemoveItem,
    handleAddItem,
    transportInfo,
    setTransportInfo,
    onSubmit,
    suggestions,
    selectedBranch,
    isProcessing
}) => {
    return (
        <div className="glass p-6 rounded-3xl border border-slate-200 bg-white">
            <h2 className="text-xl font-black text-slate-900 mb-6">Record Movement</h2>
            <form onSubmit={onSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">ประเภท</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setTransactionType('IN')}
                            className={`py-3 rounded-xl font-bold transition-all ${transactionType === 'IN'
                                ? 'bg-green-600 text-white shadow-lg shadow-green-200'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                }`}
                        >
                            <ArrowDownCircle size={20} className="inline mr-2" />
                            รับเข้า (IN)
                        </button>
                        <button
                            type="button"
                            onClick={() => setTransactionType('OUT')}
                            className={`py-3 rounded-xl font-bold transition-all ${transactionType === 'OUT'
                                ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                }`}
                        >
                            <ArrowUpCircle size={20} className="inline mr-2" />
                            จ่ายออก (OUT)
                        </button>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-bold text-slate-700">
                            {transactionType === 'IN' ? 'รับจาก' : 'จ่ายไปยัง'}
                        </label>
                        {selectedBranch === 'sai3' && (
                            <div className="flex gap-1">
                                {EXTERNAL_PARTNERS.filter(p => ['lamsoon', 'ufc', 'loxley', 'kopee'].includes(p.id)).map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setTarget(p.id)}
                                        className={`text-[10px] px-2 py-1 rounded-full border transition-all ${target === p.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}
                                    >
                                        {p.name.replace('บ. ', '')}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <select
                        value={target}
                        onChange={(e) => {
                            const val = e.target.value;
                            setTarget(val);

                            // Version 2.0.0: Auto-Destination Logic for Hub NW
                            if (selectedBranch === 'hub_nw' && transactionType === 'IN') {
                                if (val === 'loscam_wangnoi') {
                                    // Normally handle secondary auto-logic in hook, but we could pre-fill note or UI hint
                                }
                            }
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title={transactionType === 'IN' ? 'เลือกต้นทาง' : 'เลือกปลายทาง'}
                        aria-label={transactionType === 'IN' ? 'Select source' : 'Select destination'}
                        required
                    >
                        <option value="">เลือก...</option>
                        {BRANCHES.filter(b => b.id !== selectedBranch).map(branch => (
                            <option key={branch.id} value={branch.id} className="text-slate-900">
                                {branch.name}
                            </option>
                        ))}
                        {selectedBranch !== 'maintenance_stock' && EXTERNAL_PARTNERS.filter(p => {
                            // Version 2.4.0: Simplified Partner Access Control

                            // Rule 0: Global 'No OUT to Neo Corp'
                            if (transactionType === 'OUT' && p.id === 'neo_corp') return false;

                            // Rule 1: Lamsoon (IN: Sai3 only, OUT: Sai3 & Hub NW)
                            if (p.id === 'lamsoon') {
                                if (transactionType === 'IN' && selectedBranch !== 'sai3') return false;
                                if (transactionType === 'OUT' && !['sai3', 'hub_nw'].includes(selectedBranch)) return false;
                            }

                            // Rule 2: UFC, Loxley, Kopee (Strictly Sai3 Only for both IN/OUT)
                            if (['ufc', 'loxley', 'kopee'].includes(p.id)) {
                                if (selectedBranch !== 'sai3') return false;
                            }

                            // Rule 3: HI-Q only shows when selecting hiq pallets OR when no items selected yet
                            if (p.id === 'hiq_th') {
                                const hasHiq = items.some(item => item.palletId === 'hiq');
                                const hasNonHiq = items.some(item => item.palletId !== '' && item.palletId !== 'hiq');
                                if (hasNonHiq && !hasHiq) return false;
                            }

                            // Rule 4: Loscam provider (neo_corp, loscam_wangnoi) only at Hub NW
                            if (['neo_corp', 'loscam_wangnoi'].includes(p.id)) {
                                if (selectedBranch !== 'hub_nw') return false;
                            }

                            // Rule 5: Sino allowed at Hub NW, Chiang Mai, EKP, KPP, PLK, and MS
                            if (p.id === 'sino') {
                                if (!['hub_nw', 'cm', 'ekp', 'kpp', 'plk', 'ms'].includes(selectedBranch)) return false;
                            }

                            return true;
                        }).map(partner => (
                            <option key={partner.id} value={partner.id} className="text-slate-900">
                                {partner.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">วันเดือนปี (Date)</label>
                        <input
                            type="date"
                            value={transactionDate}
                            onChange={(e) => setTransactionDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title="เลือกวันที่ (Date)"
                            aria-label="Select transaction date"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            เลขที่เอกสารอ้างอิง (เลขที่ใบคลุม พาเลท เลขที่ ECD)
                        </label>
                        <input
                            type="text"
                            value={referenceDocNo}
                            onChange={(e) => setReferenceDocNo(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            placeholder="เลขที่ใบคลุมพาเลท หรือ เลขที่ ECD"
                            title="เลขที่ใบคลุมพาเลท หรือ เลขที่ ECD"
                            aria-label="Enter reference document or ECD number"
                        />
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Truck size={18} className="text-blue-600" />
                        ข้อมูลการขนส่ง (Transport Info)
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">ทะเบียนรถ</label>
                            <input
                                type="text"
                                value={transportInfo.carRegistration}
                                onChange={(e) => setTransportInfo({ ...transportInfo, carRegistration: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
                                placeholder="เช่น 1กข-1234"
                                title="ทะเบียนรถ"
                                list="car-registrations-list"
                                aria-label="Enter car registration"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">ประเภทรถ</label>
                            <select
                                value={transportInfo.vehicleType}
                                onChange={(e) => setTransportInfo({ ...transportInfo, vehicleType: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
                                title="เลือกประเภทรถ"
                                aria-label="Select vehicle type"
                            >
                                <option value="">ระบุประเภท...</option>
                                {VEHICLE_TYPES.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อคนขับ</label>
                            <input
                                type="text"
                                value={transportInfo.driverName}
                                onChange={(e) => setTransportInfo({ ...transportInfo, driverName: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
                                placeholder="ชื่อ-นามสกุล"
                                title="ชื่อคนขับ"
                                list="driver-names-list"
                                aria-label="Enter driver name"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">บริษัทขนส่ง</label>
                            <input
                                type="text"
                                value={transportInfo.transportCompany}
                                onChange={(e) => setTransportInfo({ ...transportInfo, transportCompany: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
                                placeholder="ชื่อบริษัท"
                                title="บริษัทขนส่ง"
                                list="transport-companies-list"
                                aria-label="Enter transport company"
                            />
                        </div>
                    </div>

                    {/* Datalists for Autocomplete Suggestions */}
                    <datalist id="car-registrations-list">
                        {suggestions?.carRegistrations.map(reg => <option key={reg} value={reg} />)}
                    </datalist>
                    <datalist id="driver-names-list">
                        {suggestions?.driverNames.map(name => <option key={name} value={name} />)}
                    </datalist>
                    <datalist id="transport-companies-list">
                        {suggestions?.transportCompanies.map(comp => <option key={comp} value={comp} />)}
                    </datalist>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">รายการพาเลท</label>
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={index} className="flex gap-2 items-start">
                                <div className="flex-1">
                                    <select
                                        value={item.palletId}
                                        onChange={(e) => handleItemChange(index, 'palletId', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        title={`เลือกประเภทพาเลทที่ ${index + 1}`}
                                        aria-label={`Select pallet type for item ${index + 1}`}
                                        required
                                    >
                                        <option value="">เลือกพาเลท</option>
                                        {PALLET_TYPES.map(pallet => (
                                            <option key={pallet.id} value={pallet.id} className="text-slate-900">
                                                {pallet.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-24">
                                    <input
                                        type="number"
                                        value={item.qty}
                                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Qty"
                                        title={`จำนวนพาเลทที่ ${index + 1}`}
                                        aria-label={`Quantity for item ${index + 1}`}
                                        min="1"
                                        required
                                    />
                                </div>
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="p-3 text-slate-400 hover:text-red-500 transition-colors"
                                        title="ลบรายการ"
                                        aria-label="Remove item"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={handleAddItem}
                        className="mt-3 text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                        <Plus size={16} />
                        เพิ่มรายการ
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={isProcessing}
                    className={`w-full py-4 rounded-xl font-black transition-all shadow-xl flex items-center justify-center gap-2 ${isProcessing ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
                >
                    {isProcessing ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Save size={20} />
                    )}
                    {isProcessing ? 'กำลังประมวลผล...' : 'Register Movement'}
                </button>
            </form>
        </div>
    );
};

export default MovementForm;
