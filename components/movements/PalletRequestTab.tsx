import React, { useState } from 'react';
import { Send, Clock, CheckCircle, XCircle, AlertCircle, Plus, ClipboardList, Trash2 } from 'lucide-react';
import { useStock } from '../../contexts/StockContext';
import { BRANCHES, PALLET_TYPES, EXTERNAL_PARTNERS } from '../../constants';
import { BranchId, PalletId, PalletRequest, User } from '../../types';
// @ts-ignore
import Swal from 'sweetalert2';
import * as telegramService from '../../services/telegramService';

interface PalletRequestTabProps {
    selectedBranch: BranchId;
    currentUser?: User;
}

const PalletRequestTab: React.FC<PalletRequestTabProps> = ({ selectedBranch, currentUser }) => {
    const { palletRequests, createPalletRequest, updatePalletRequestStatus, addMovementBatch, config } = useStock();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [requestItems, setRequestItems] = useState<{ palletId: PalletId | ''; qty: string }[]>([
        { palletId: '', qty: '' }
    ]);
    const [newRequestMeta, setNewRequestMeta] = useState({
        purpose: '',
        priority: 'NORMAL' as 'NORMAL' | 'URGENT',
        targetBranchId: '',
        note: ''
    });

    const isHub = selectedBranch === 'hub_nks' || currentUser?.branchId === 'hub_nks';

    const ALL_DESTINATIONS = [
        ...BRANCHES.map(b => ({ id: b.id, name: b.name })),
        ...EXTERNAL_PARTNERS.map(p => ({ id: p.id, name: p.name }))
    ];

    const handleAddItem = () => {
        setRequestItems([...requestItems, { palletId: '', qty: '' }]);
    };

    const handleRemoveItem = (index: number) => {
        if (requestItems.length > 1) {
            setRequestItems(requestItems.filter((_, i) => i !== index));
        }
    };

    const handleItemChange = (index: number, field: 'palletId' | 'qty', value: string) => {
        const newItems = [...requestItems];
        if (field === 'palletId') {
            newItems[index].palletId = value as PalletId;
        } else {
            newItems[index].qty = value;
        }
        setRequestItems(newItems);
    };

    const handleCreateRequest = (e: React.FormEvent) => {
        e.preventDefault();

        const validItems = requestItems.filter(i => i.palletId && parseInt(i.qty) > 0);

        if (validItems.length === 0 || !newRequestMeta.purpose) {
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน',
            });
            return;
        }

        const newReq = {
            branchId: selectedBranch,
            items: validItems.map(i => ({ palletId: i.palletId as PalletId, qty: parseInt(i.qty) })),
            purpose: newRequestMeta.purpose,
            priority: newRequestMeta.priority,
            targetBranchId: newRequestMeta.targetBranchId,
            note: newRequestMeta.note,
            requestNo: '' // Will be set by createPalletRequest, but we can't get it immediately easily without refactoring createPalletRequest to return data or using the context update.
        };

        createPalletRequest(newReq);

        // Telegram Notification
        if (config.telegramChatId) {
            const branchName = BRANCHES.find(b => b.id === selectedBranch)?.name || 'Unknown';
            const targetName = ALL_DESTINATIONS.find(d => d.id === newRequestMeta.targetBranchId)?.name;
            // Note: Since requestNo is generated inside, we might need a workaround or just accept a placeholder until it syncs.
            // Better to pass the formatted message.
            const message = telegramService.formatPalletRequest(
                { ...newReq, requestNo: 'รอระบบยืนยัน...' },
                branchName,
                targetName
            );
            telegramService.sendMessage(config.telegramChatId, message);
        }

        setIsModalOpen(false);
        setRequestItems([{ palletId: '', qty: '' }]);
        setNewRequestMeta({ purpose: '', priority: 'NORMAL', targetBranchId: '', note: '' });

        Swal.fire({
            icon: 'success',
            title: 'ส่งคำขอแล้ว',
            text: 'คำขอของคุณถูกส่งไปยังสาขานครสวรรค์แล้ว',
            timer: 2000,
            showConfirmButton: false
        });
    };

    const handleApprove = (req: PalletRequest) => {
        Swal.fire({
            title: 'ยืนยันการอนุมัติ?',
            text: `อนุมัติคำขอ ${req.requestNo} จาก ${BRANCHES.find(b => b.id === req.branchId)?.name}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'อนุมัติ',
            cancelButtonText: 'ยกเลิก'
        }).then((result: any) => {
            if (result.isConfirmed) {
                updatePalletRequestStatus(req.id, 'APPROVED');
                Swal.fire('สำเร็จ!', 'อนุมัติคำขอเรียบร้อยแล้ว', 'success');
            }
        });
    };

    const handleReject = (req: PalletRequest) => {
        Swal.fire({
            title: 'ปฏิเสธคำขอ?',
            input: 'text',
            inputLabel: 'เหตุผลการปฏิเสธ',
            showCancelButton: true,
            confirmButtonText: 'ปฏิเสธคำขอ',
            confirmButtonColor: '#d33',
        }).then((result: any) => {
            if (result.isConfirmed) {
                updatePalletRequestStatus(req.id, 'REJECTED', result.value);
                Swal.fire('บันทึกแล้ว', 'ปฏิเสธคำขอเรียบร้อยแล้ว', 'info');
            }
        });
    };

    const handleShip = (req: PalletRequest) => {
        Swal.fire({
            title: 'ดำเนินการส่งมอบ?',
            text: `ระบบจะสร้างรายการ 'จ่ายออก' (OUT) อัตโนมัติไปยัง ${BRANCHES.find(b => b.id === req.branchId)?.name}`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'ส่งมอบทันที',
        }).then((result: any) => {
            if (result.isConfirmed) {
                const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
                const docNo = `REQ-OUT-${datePart}-${req.requestNo.split('-').pop()}`;
                const targetName = ALL_DESTINATIONS.find(d => d.id === req.targetBranchId)?.name || 'ไม่ระบุ';

                addMovementBatch({
                    type: 'OUT',
                    source: 'hub_nks',
                    dest: req.branchId,
                    items: req.items,
                    docNo,
                    referenceDocNo: req.requestNo,
                    note: `Processed from request ${req.requestNo} [To: ${targetName}] - ${req.purpose}`
                });

                updatePalletRequestStatus(req.id, 'SHIPPED', docNo);

                // Telegram Notification
                if (config.telegramChatId) {
                    const message = telegramService.formatShipmentNotification(req, docNo);
                    telegramService.sendMessage(config.telegramChatId, message);
                }

                Swal.fire('จัดส่งแล้ว!', `สร้างเลขที่เอกสาร ${docNo}`, 'success');
            }
        });
    };

    const statusBadge = (status: PalletRequest['status']) => {
        switch (status) {
            case 'PENDING': return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-bold">รอตรวจสอบ</span>;
            case 'APPROVED': return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">อนุมัติแล้ว</span>;
            case 'SHIPPED': return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">ส่งมอบแล้ว</span>;
            case 'REJECTED': return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">ถูกปฏิเสธ</span>;
            default: return null;
        }
    };

    // Filter requests based on branch visibility
    const displayRequests = isHub
        ? [...palletRequests].sort((a, b) => b.id.localeCompare(a.id)) // Hub sees all
        : palletRequests.filter(r => r.branchId === selectedBranch).sort((a, b) => b.id.localeCompare(a.id));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-slate-900">Pallet Return Requests</h2>
                    <p className="text-sm text-slate-500">ระบบร้องขอการส่งคืนพาเลทจากสาขานครสวรรค์</p>
                </div>
                {!isHub && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                    >
                        <Plus size={18} /> สร้างคำขอใหม่
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayRequests.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <ClipboardList size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold">ไม่มีรายการคำขอในขณะนี้</p>
                    </div>
                ) : (
                    displayRequests.map((req) => (
                        <div key={req.id} className={`bg-white rounded-3xl border-2 transition-all p-5 shadow-sm ${req.priority === 'URGENT' ? 'border-red-100' : 'border-slate-100'
                            }`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-mono font-bold text-slate-400">{req.requestNo}</span>
                                        {statusBadge(req.status)}
                                    </div>
                                    <h3 className="font-black text-slate-900">{BRANCHES.find(b => b.id === req.branchId)?.name}</h3>
                                </div>
                                {req.priority === 'URGENT' && (
                                    <span className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full ring-1 ring-red-200">
                                        <AlertCircle size={10} /> URGENT
                                    </span>
                                )}
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-4 mb-4 space-y-3">
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">รายการพาเลท:</span>
                                    {req.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600">{PALLET_TYPES.find(p => p.id === item.palletId)?.name}</span>
                                            <span className="font-black text-blue-600">x{item.qty}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-2 border-t border-slate-200/50 space-y-2">
                                    {req.targetBranchId && (
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">ปลายทางส่งคืน:</span>
                                            <p className="text-sm text-blue-700 font-black">{ALL_DESTINATIONS.find(d => d.id === req.targetBranchId)?.name}</p>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">วัตถุประสงค์:</span>
                                        <p className="text-sm text-slate-700 font-medium">{req.purpose}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="text-[10px] text-slate-400 flex justify-between px-1">
                                    <span>วันที่: {req.date}</span>
                                    {req.processDocNo && <span className="text-blue-500 font-bold">Ref: {req.processDocNo}</span>}
                                </div>

                                {isHub && req.status === 'PENDING' && (
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => handleApprove(req)}
                                            className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all border border-blue-100"
                                        >
                                            อนุมัติ
                                        </button>
                                        <button
                                            onClick={() => handleReject(req)}
                                            className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all border border-red-100"
                                            title="ปฏิเสธคำขอ"
                                            aria-label="Reject request"
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    </div>
                                )}

                                {isHub && req.status === 'APPROVED' && (
                                    <button
                                        onClick={() => handleShip(req)}
                                        className="w-full mt-2 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <Send size={16} /> บันทึกจ่ายออก (Send OUT)
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Request Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-black text-slate-900">สร้างคำขอรับพาเลท</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                                title="ปิดหน้าต่าง"
                                aria-label="Close modal"
                            >
                                <Plus size={24} className="rotate-45 text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateRequest} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
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
            )}
        </div>
    );
};

export default PalletRequestTab;
