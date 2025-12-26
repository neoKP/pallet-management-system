import React, { useState, useMemo } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Save, CheckCircle, Truck, Plus, Trash2, Car, User as UserIcon, Building, FileText, Clock, ArrowRightLeft, ClipboardList } from 'lucide-react';
import ReceiveModal from './ReceiveModal';
import TransactionTimelineModal from './TransactionTimelineModal';
import DocumentPreviewModal from './DocumentPreviewModal';
import PalletRequestTab from './PalletRequestTab';
// @ts-ignore
import Swal from 'sweetalert2';
import { BRANCHES, EXTERNAL_PARTNERS, PALLET_TYPES, VEHICLE_TYPES } from '../../constants';
import { BranchId, Transaction, TransactionType, PalletId, Stock, User } from '../../types';
import { useStock } from '../../contexts/StockContext';

interface MovementTabProps {
    selectedBranch: BranchId;
    transactions: Transaction[];
    addTransaction: (data: Partial<Transaction>) => void;
    stock?: Stock;
    currentUser?: User;
}

const MovementTab: React.FC<MovementTabProps> = ({ selectedBranch, transactions, currentUser }) => {
    const { confirmTransactionsBatch, addMovementBatch } = useStock();
    const [subTab, setSubTab] = useState<'movement' | 'requests'>('movement');
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

    // Verification Modal State
    const [verifyingGroup, setVerifyingGroup] = useState<Transaction[] | null>(null);
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);

    // Timeline Modal State
    const [timelineTx, setTimelineTx] = useState<Transaction | null>(null);
    const [isTimelineOpen, setIsTimelineOpen] = useState(false);

    // Document Preview State
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);

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

            // History Logic (Everything visible to this branch, either source or dest, excluding CANCELLED)
            if (tx.status !== 'CANCELLED' && (tx.source === selectedBranch || tx.dest === selectedBranch)) {
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

    const handleViewTimeline = (tx: Transaction) => {
        setTimelineTx(tx);
        setIsTimelineOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
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

        // Generate DocNo logic (simplified)
        const dateStr = new Date().toISOString().split('T')[0];
        const datePart = dateStr.replace(/-/g, '');
        const existingDocNos = Array.from(new Set(transactions
            .filter(t => t.docNo && t.docNo.includes(datePart))
            .map(t => t.docNo)));
        const running = (existingDocNos.length + 1).toString().padStart(3, '0');
        const prefix = 'INT';
        const docNo = `${prefix}-${datePart}-${running}`;

        const data = {
            type: transactionType as TransactionType,
            source: transactionType === 'IN' ? target : selectedBranch,
            dest: transactionType === 'IN' ? selectedBranch : target,
            items: validItems.map(i => ({
                palletId: i.palletId as PalletId,
                qty: parseInt(i.qty)
            })),
            docNo,
            date: new Date().toISOString(), // Use full ISO for data
            referenceDocNo,
            ...transportInfo
        };

        // If it's OUT (Dispatch), show Preview.
        // If IN (Receive), usually we scan or quick add? 
        // User request: "In the *recording dispatch* step (บันทึกจ่ายออก), show pdf".
        if (transactionType === 'OUT') {
            setPreviewData(data);
            setIsPreviewOpen(true);
        } else {
            // Check if IN logic needs preview? User said "Dispatch".
            // proceed with save for IN
            saveTransaction(data);
        }
    };

    const saveTransaction = async (data: any) => {
        try {
            await addMovementBatch(data);

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

            // Close preview if open
            setIsPreviewOpen(false);
            setPreviewData(null);

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
        } catch (error) {
            console.error("Save failed:", error);
            if (Swal) {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด!',
                    text: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                });
            } else {
                alert('เกิดข้อผิดพลาด! ไม่สามารถบันทึกข้อมูลได้');
            }
        }
    };

    const handleConfirmSave = () => {
        if (previewData) {
            saveTransaction(previewData);
        }
    };

    const handleBatchConfirm = (txs: Transaction[]) => {
        setVerifyingGroup(txs);
        setIsReceiveModalOpen(true);
    };

    const handleConfirmReceive = (txs: Transaction[]) => {
        confirmTransactionsBatch(txs.map(t => t.id));
        if (Swal) {
            Swal.fire({
                icon: 'success',
                title: 'เรียบร้อย!',
                text: 'ยืนยันการรับของเสร็จสมบูรณ์',
                timer: 1500,
                showConfirmButton: false
            });
        }
        setVerifyingGroup(null);
        setIsReceiveModalOpen(false);
    };

    return (
        <div className="space-y-6">
            {/* Sub-tab Navigation */}
            <div className="flex gap-4 border-b border-slate-200 pb-1">
                <button
                    onClick={() => setSubTab('movement')}
                    className={`pb-3 px-2 text-sm font-bold transition-all relative ${subTab === 'movement' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <ArrowRightLeft size={16} />
                        Record Movement
                    </div>
                    {subTab === 'movement' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                </button>
                <button
                    onClick={() => setSubTab('requests')}
                    className={`pb-3 px-2 text-sm font-bold transition-all relative ${subTab === 'requests' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <ClipboardList size={16} />
                        Pallet Requests
                    </div>
                    {subTab === 'requests' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                </button>
            </div>

            {subTab === 'movement' ? (
                <>
                    {/* Pending Transfers Section */}
                    {pendingGroups.length > 0 && (
                        <div className="glass p-6 rounded-3xl border border-orange-200 bg-orange-50/50">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-orange-100 rounded-xl text-orange-600">
                                    <Truck size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-900">Incoming Deliveries (รอรับเข้า)</h2>
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
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleViewTimeline(mainTx)}
                                                            className="p-1 px-2 text-xs font-bold bg-slate-50 text-slate-400 hover:bg-white hover:text-blue-600 rounded-lg transition-all border border-transparent hover:border-blue-100 shadow-sm hover:shadow active:scale-95 flex items-center gap-1"
                                                            title="View Timeline"
                                                        >
                                                            <Clock size={14} /> Timeline
                                                        </button>
                                                        <span className="text-xs text-slate-400 font-medium">{mainTx.date}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2 mb-4 border-t border-slate-100 pt-2">
                                                    <div className="text-sm text-slate-600">
                                                        <span className="font-bold text-slate-800">From:</span> {BRANCHES.find(b => b.id === mainTx.source)?.name || mainTx.source}
                                                    </div>
                                                    {(mainTx.carRegistration || mainTx.transportCompany) && (
                                                        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded space-y-1">
                                                            {mainTx.transportCompany && <div className="flex items-center gap-1"><Building size={12} /> {mainTx.transportCompany}</div>}
                                                            {mainTx.carRegistration && <div className="flex items-center gap-1"><Car size={12} /> {mainTx.carRegistration} {(mainTx.vehicleType) ? `(${VEHICLE_TYPES.find(v => v.id === mainTx.vehicleType)?.name || mainTx.vehicleType})` : ''}</div>}
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
                                                ตรวจสอบ & รับของ
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <ReceiveModal
                        isOpen={isReceiveModalOpen}
                        onClose={() => setIsReceiveModalOpen(false)}
                        group={verifyingGroup || []}
                        onConfirm={handleConfirmReceive}
                    />

                    {timelineTx && (
                        <TransactionTimelineModal
                            isOpen={isTimelineOpen}
                            onClose={() => setIsTimelineOpen(false)}
                            transaction={timelineTx}
                        />
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
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-xs text-slate-400">{tx.date}</span>
                                                    <button
                                                        onClick={() => handleViewTimeline(tx)}
                                                        className="text-xs flex items-center gap-1 text-slate-400 font-bold hover:text-blue-600 transition-colors"
                                                        title="View Timeline"
                                                    >
                                                        <Clock size={12} /> Timeline
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="text-sm text-slate-600">
                                                <div className="mb-2"><span className="font-bold text-slate-800">Route:</span> {tx.source} → {tx.dest}</div>
                                                {(tx.carRegistration || tx.transportCompany) && (
                                                    <div className="mb-2 text-xs text-slate-500 bg-white border border-slate-200 p-2 rounded space-y-1">
                                                        {tx.transportCompany && <div className="flex items-center gap-1"><Building size={10} /> {tx.transportCompany}</div>}
                                                        {tx.carRegistration && <div className="flex items-center gap-1"><Car size={10} /> {tx.carRegistration} {(tx.vehicleType) ? `(${VEHICLE_TYPES.find(v => v.id === tx.vehicleType)?.name || tx.vehicleType})` : ''}</div>}
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

                </>
            ) : (
                <PalletRequestTab selectedBranch={selectedBranch} currentUser={currentUser} />
            )}

            {/* Document Preview Modal */}
            <DocumentPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                onConfirm={handleConfirmSave}
                data={previewData}
            />
        </div>
    );
};

export default MovementTab;
