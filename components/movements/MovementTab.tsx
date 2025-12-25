import React, { useState, useMemo } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Save, CheckCircle, Truck, Plus, Trash2, Car, User as UserIcon, Building, FileText } from 'lucide-react';
import { BRANCHES, EXTERNAL_PARTNERS, PALLET_TYPES } from '../../constants';
import { BranchId, Transaction, TransactionType, PalletId, Stock, User } from '../../types';
import { useStock } from '../../contexts/StockContext';

interface MovementTabProps {
    selectedBranch: BranchId;
    transactions: Transaction[];
    addTransaction: (data: Partial<Transaction>) => void;
    stock?: Stock;
    currentUser?: User;
}

const MovementTab: React.FC<MovementTabProps> = ({ selectedBranch, transactions }) => {
    const { confirmTransaction, addMovementBatch } = useStock();
    const [transactionType, setTransactionType] = useState<TransactionType>('IN');
    const [target, setTarget] = useState('');
    const [referenceDocNo, setReferenceDocNo] = useState('');
    const [items, setItems] = useState<{ palletId: PalletId | ''; qty: string }[]>([
        { palletId: '', qty: '' }
    ]);

    // Transport Info State
    const [transportInfo, setTransportInfo] = useState({
        carRegistration: '',
        vehicleType: '',
        driverName: '',
        transportCompany: ''
    });

    // Group transactions by DocNo
    const { pendingGroups, historyGroups } = useMemo(() => {
        const pGroups: Record<string, Transaction[]> = {};
        const hGroups: Record<string, Transaction[]> = {};

        // Sort mainly by ID desc to see newest first
        const sorted = [...transactions].sort((a, b) => b.id - a.id);

        sorted.forEach(tx => {
            const docNo = tx.docNo || `UNKNOWN-${tx.id}`;

            // Pending Logic
            if (tx.dest === selectedBranch && tx.status === 'PENDING') {
                if (!pGroups[docNo]) pGroups[docNo] = [];
                pGroups[docNo].push(tx);
            }

            // History Logic (Everything visible to this branch, either source or dest)
            if (tx.source === selectedBranch || tx.dest === selectedBranch) {
                if (!hGroups[docNo]) hGroups[docNo] = [];
                hGroups[docNo].push(tx);
            }
        });

        // Convert to arrays for mapping
        return {
            pendingGroups: Object.values(pGroups),
            historyGroups: Object.values(hGroups).sort((a, b) => b[0].id - a[0].id),
        };
    }, [transactions, selectedBranch]);

    const handleAddItem = () => {
        setItems([...items, { palletId: '', qty: '' }]);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleItemChange = (index: number, field: 'palletId' | 'qty', value: string) => {
        const newItems = [...items];
        if (field === 'palletId') {
            newItems[index].palletId = value as PalletId;
        } else {
            newItems[index].qty = value;
        }
        setItems(newItems);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        // @ts-ignore
        const Swal = window.Swal;

        if (!target) {
            if (Swal) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณาเลือกปลายทาง/ต้นทาง',
                    confirmButtonText: 'เข้าใจแล้ว',
                    confirmButtonColor: '#3085d6',
                });
            } else {
                alert('กรุณาเลือกปลายทาง/ต้นทาง');
            }
            return;
        }

        const validItems = items.filter(i => i.palletId && parseInt(i.qty) > 0);
        if (validItems.length === 0) {
            if (Swal) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณาระบุจำนวนและประเภทพาเลทอย่างน้อย 1 รายการ',
                    confirmButtonText: 'เข้าใจแล้ว',
                    confirmButtonColor: '#3085d6',
                });
            } else {
                alert('กรุณาระบุจำนวนและประเภทพาเลทอย่างน้อย 1 รายการ');
            }
            return;
        }

        const data = {
            type: transactionType,
            source: transactionType === 'IN' ? target : selectedBranch,
            dest: transactionType === 'IN' ? selectedBranch : target,
            items: validItems.map(i => ({
                palletId: i.palletId as PalletId,
                qty: parseInt(i.qty)
            })),
            referenceDocNo,
            ...transportInfo
        };

        addMovementBatch(data);

        // Reset form
        setTarget('');
        setReferenceDocNo('');
        setItems([{ palletId: '', qty: '' }]);
        setTransportInfo({
            carRegistration: '',
            vehicleType: '',
            driverName: '',
            transportCompany: ''
        });
        if (Swal) {
            Swal.fire({
                icon: 'success',
                title: 'บันทึกสำเร็จ!',
                text: 'รายการเคลื่อนย้ายถูกบันทึกเรียบร้อยแล้ว',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            alert('บันทึกสำเร็จ!');
        }
    };

    const handleBatchConfirm = (txs: Transaction[]) => {
        const totalQty = txs.reduce((sum, t) => sum + t.qty, 0);
        const source = txs[0].source;
        // @ts-ignore
        const Swal = window.Swal;

        if (Swal) {
            Swal.fire({
                title: 'ยืนยันการรับของ?',
                html: `คุณต้องการยืนยันการรับพาเลททั้งหมด <b>${totalQty}</b> ตัว<br/>จาก <b>${source}</b> ใช่หรือไม่?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#ef4444',
                confirmButtonText: 'ยืนยัน, รับของ',
                cancelButtonText: 'ยกเลิก'
            }).then((result: any) => {
                if (result.isConfirmed) {
                    txs.forEach(tx => confirmTransaction(tx.id));
                    Swal.fire({
                        icon: 'success',
                        title: 'เรียบร้อย!',
                        text: 'ยืนยันการรับของเสร็จสมบูรณ์',
                        timer: 1500,
                        showConfirmButton: false
                    });
                }
            });
        } else {
            if (window.confirm(`Confirm receipt of ${totalQty} pallets from ${source}?`)) {
                txs.forEach(tx => confirmTransaction(tx.id));
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Pending Transfers Section */}
            {pendingGroups.length > 0 && (
                <div className="glass p-6 rounded-3xl border border-orange-200 bg-orange-50/50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-orange-100 rounded-xl text-orange-600">
                            <Truck size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900">Incoming Deliveries</h2>
                            <p className="text-sm text-slate-500">Items sent from other branches waiting for acceptance</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingGroups.map((group) => {
                            const mainTx = group[0];
                            return (
                                <div key={mainTx.docNo} className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-lg">
                                                {mainTx.docNo}
                                            </span>
                                            <span className="text-xs text-slate-400 font-medium">{mainTx.date}</span>
                                        </div>
                                        <div className="space-y-2 mb-4 border-t border-slate-100 pt-2">
                                            <div className="text-sm text-slate-600">
                                                <span className="font-bold text-slate-800">From:</span> {BRANCHES.find(b => b.id === mainTx.source)?.name || mainTx.source}
                                            </div>
                                            {(mainTx.carRegistration || mainTx.transportCompany) && (
                                                <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded space-y-1">
                                                    {mainTx.transportCompany && <div className="flex items-center gap-1"><Building size={12} /> {mainTx.transportCompany}</div>}
                                                    {mainTx.carRegistration && <div className="flex items-center gap-1"><Car size={12} /> {mainTx.carRegistration} {(mainTx.vehicleType) ? `(${mainTx.vehicleType})` : ''}</div>}
                                                    {mainTx.driverName && <div className="flex items-center gap-1"><UserIcon size={12} /> {mainTx.driverName}</div>}
                                                </div>
                                            )}
                                            {mainTx.referenceDocNo && (
                                                <div className="text-xs font-mono text-slate-500 bg-blue-50 border border-blue-100 p-1.5 rounded flex items-center gap-1 my-2">
                                                    <FileText size={10} /> Ref: {mainTx.referenceDocNo}
                                                </div>
                                            )}

                                            {/* List all items in this doc */}
                                            <div className="bg-slate-50 rounded-lg p-2 space-y-1">
                                                {Object.values(group.reduce((acc, item) => {
                                                    if (!acc[item.palletId]) {
                                                        acc[item.palletId] = { ...item, qty: 0 };
                                                    }
                                                    acc[item.palletId].qty += item.qty;
                                                    return acc;
                                                }, {} as Record<string, Transaction>)).map((tx, idx) => (
                                                    <div key={idx} className="flex justify-between text-sm">
                                                        <span className="text-slate-600">{PALLET_TYPES.find(p => p.id === tx.palletId)?.name}</span>
                                                        <span className="font-black text-orange-600">x{tx.qty}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleBatchConfirm(group)}
                                        className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle size={16} />
                                        Confirm All
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form */}
                <div className="glass p-6 rounded-3xl border border-slate-200 bg-white">
                    <h2 className="text-xl font-black text-slate-900 mb-6">Record Movement</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
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
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                {transactionType === 'IN' ? 'รับจาก' : 'จ่ายไปยัง'}
                            </label>
                            <select
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
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
                                {EXTERNAL_PARTNERS.map(partner => (
                                    <option key={partner.id} value={partner.id} className="text-slate-900">
                                        {partner.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                เลขที่เอกสารอ้างอิง (Reference Doc No.)
                            </label>
                            <input
                                type="text"
                                value={referenceDocNo}
                                onChange={(e) => setReferenceDocNo(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                placeholder="เช่น DO-2023-001 (ถ้ามี)"
                            />
                        </div>

                        {/* Transport Information Section */}
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
                                        <option value="4w">รถ 4 ล้อ</option>
                                        <option value="6w">รถ 6 ล้อ</option>
                                        <option value="10w">รถ 10 ล้อ</option>
                                        <option value="trailer">รถเทรลเลอร์</option>
                                        <option value="container">รถตู้คอนเทนเนอร์</option>
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
                                    />
                                </div>
                            </div>
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
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2"
                        >
                            <Save size={20} />
                            Register Movement
                        </button>
                    </form>
                </div>

                {/* Transaction History */}
                <div className="glass p-6 rounded-3xl border border-slate-200 bg-white">
                    <h2 className="text-xl font-black text-slate-900 mb-4">Transaction History</h2>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                        {historyGroups.map((group, idx) => {
                            const tx = group[0];
                            // Determine status for badge (if any in group are pending, show waiting)
                            const isPending = group.some(t => t.status === 'PENDING');

                            return (
                                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex flex-col">
                                            <div className="flex gap-2 mb-1">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-bold w-fit ${tx.type === 'IN' ? 'bg-green-100 text-green-700' :
                                                    tx.type === 'OUT' ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {tx.type}
                                                </span>
                                                {isPending && (
                                                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-orange-100 text-orange-700">
                                                        WAITING
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs font-mono font-bold text-slate-500">{tx.docNo || '-'}</span>
                                        </div>
                                        <span className="text-xs text-slate-400">{tx.date}</span>
                                    </div>
                                    <div className="text-sm text-slate-600">
                                        <div className="mb-2"><span className="font-bold text-slate-800">Route:</span> {tx.source} → {tx.dest}</div>
                                        {(tx.carRegistration || tx.transportCompany) && (
                                            <div className="mb-2 text-xs text-slate-500 bg-white border border-slate-200 p-2 rounded space-y-1">
                                                {tx.transportCompany && <div className="flex items-center gap-1"><Building size={10} /> {tx.transportCompany}</div>}
                                                {tx.carRegistration && <div className="flex items-center gap-1"><Car size={10} /> {tx.carRegistration} {(tx.vehicleType) ? `(${tx.vehicleType})` : ''}</div>}
                                                {tx.driverName && <div className="flex items-center gap-1"><UserIcon size={10} /> {tx.driverName}</div>}
                                            </div>
                                        )}
                                        {tx.referenceDocNo && (
                                            <div className="mb-2 text-xs font-mono text-slate-500 bg-blue-50 border border-blue-100 p-1.5 rounded flex items-center gap-1">
                                                <FileText size={10} /> Ref: {tx.referenceDocNo}
                                            </div>
                                        )}
                                        <div className="bg-white rounded border border-slate-200 p-2 space-y-1">
                                            {Object.values(group.reduce((acc, item) => {
                                                if (!acc[item.palletId]) {
                                                    acc[item.palletId] = { ...item, qty: 0 };
                                                }
                                                acc[item.palletId].qty += item.qty;
                                                return acc;
                                            }, {} as Record<string, Transaction>)).map((item, i) => (
                                                <div key={i} className="flex justify-between">
                                                    <span className="text-slate-700 text-xs">{PALLET_TYPES.find(p => p.id === item.palletId)?.name}</span>
                                                    <span className="font-bold text-slate-900 text-xs">{item.qty}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MovementTab;
