import React, { useState, useEffect } from 'react';
import { BranchId, PalletId, PalletRequest, User, PalletRequestType } from '../types';
import { useStock } from '../contexts/StockContext';
import { BRANCHES, EXTERNAL_PARTNERS, PALLET_TYPES } from '../constants';
// @ts-ignore
import Swal from 'sweetalert2';

export function usePalletRequestLogic(selectedBranch: BranchId, currentUser?: User) {
    const { palletRequests, createPalletRequest, updatePalletRequest, addMovementBatch, stock } = useStock();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [requestItems, setRequestItems] = useState<{ palletId: PalletId | ''; qty: string }[]>([
        { palletId: '', qty: '' }
    ]);
    const [newRequestMeta, setNewRequestMeta] = useState({
        purpose: '',
        priority: 'NORMAL' as 'NORMAL' | 'URGENT',
        targetBranchId: '',
        requestType: 'PUSH' as PalletRequestType,
        note: '',
        branchId: selectedBranch // Keep track for the form
    });
    const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

    useEffect(() => {
        setNewRequestMeta(prev => ({ ...prev, branchId: selectedBranch }));
    }, [selectedBranch]);

    const isHub = selectedBranch === 'hub_nw' || currentUser?.role === 'ADMIN';

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

        // If not hub, default destination is hub.
        const finalTarget = newRequestMeta.targetBranchId || (isHub ? '' : 'hub_nw');

        if (!finalTarget) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาระบุสาขา',
                text: 'กรุณาระบุสาขาที่เกี่ยวข้องกับการดำเนินการนี้',
            });
            return;
        }

        const reqData: any = {
            branchId: selectedBranch,
            items: validItems.map(i => ({ palletId: i.palletId as PalletId, qty: parseInt(i.qty) })),
            purpose: newRequestMeta.purpose,
            priority: newRequestMeta.priority,
            requestType: newRequestMeta.requestType,
            targetBranchId: finalTarget,
            note: newRequestMeta.note,
        };

        if (editingRequestId) {
            const original = palletRequests.find(r => r.id === editingRequestId);
            if (original) {
                updatePalletRequest({ ...original, ...reqData });
                Swal.fire('สำเร็จ!', 'แก้ไขคำขอเรียบร้อยแล้ว', 'success');
            }
        } else {
            createPalletRequest(reqData);
            Swal.fire({
                icon: 'success',
                title: 'ส่งคำขอแล้ว',
                text: 'รายการคำขอของคุณถูกบันทึกลงระบบแล้ว',
                timer: 2000,
                showConfirmButton: false
            });
        }

        handleCloseModal();
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingRequestId(null);
        setRequestItems([{ palletId: '', qty: '' }]);
        setNewRequestMeta({
            purpose: '',
            priority: 'NORMAL',
            targetBranchId: '',
            requestType: 'PUSH',
            note: '',
            branchId: selectedBranch
        });
    };

    const handleApprove = (req: PalletRequest) => {
        const sourceBranchId = req.requestType === 'PULL' ? (req.targetBranchId as BranchId) : req.branchId;

        const insufficientItems = req.items.filter(item => {
            const available = stock[sourceBranchId]?.[item.palletId] || 0;
            return item.qty > available;
        });

        if (insufficientItems.length > 0) {
            const details = insufficientItems.map(i => {
                const name = PALLET_TYPES.find(p => p.id === i.palletId)?.name || i.palletId;
                const have = stock[sourceBranchId]?.[i.palletId] || 0;
                return `${name}: มีในสต๊อก ${have} (ต้องการ ${i.qty})`;
            }).join('\n');

            const sourceBranchName = BRANCHES.find(b => b.id === sourceBranchId)?.name || sourceBranchId;

            Swal.fire({
                icon: 'error',
                title: 'สต๊อกต้นทางไม่เพียงพอ!',
                text: `ไม่สามารถอนุมัติได้เนื่องจากยอดในสต๊อกของ ${sourceBranchName} ต่ำกว่าที่จะส่ง:\n${details}\n\nกรุณา "แก้ไข" ยอดพาเลท หรือ "เปลี่ยนประเภท (Push/Pull)" ให้ถูกต้อง`,
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#d33',
            });
            return;
        }

        Swal.fire({
            title: 'ยืนยันการอนุมัติ?',
            text: `อนุมัติคำขอ ${req.requestNo} (${req.requestType})`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'อนุมัติ',
            cancelButtonText: 'ยกเลิก'
        }).then((result: any) => {
            if (result.isConfirmed) {
                updatePalletRequest({ ...req, status: 'APPROVED' });
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
                updatePalletRequest({ ...req, status: 'REJECTED', note: result.value ? `REJECT REASON: ${result.value}` : req.note });
                Swal.fire('บันทึกแล้ว', 'ปฏิเสธคำขอเรียบร้อยแล้ว', 'info');
            }
        });
    };

    const handleEdit = (req: PalletRequest) => {
        setEditingRequestId(req.id);
        setRequestItems(req.items.map(i => ({ palletId: i.palletId, qty: i.qty.toString() })));
        setNewRequestMeta({
            purpose: req.purpose,
            priority: req.priority,
            targetBranchId: req.targetBranchId || '',
            requestType: req.requestType || 'PUSH',
            note: req.note || '',
            branchId: req.branchId
        });
        setIsModalOpen(true);
    };

    const handleShip = (req: PalletRequest) => {
        const sourceId = req.requestType === 'PULL' ? (req.targetBranchId as BranchId) : req.branchId;
        const destId = req.requestType === 'PULL' ? req.branchId : (req.targetBranchId || 'hub_nw' as BranchId);

        const sourceName = BRANCHES.find(b => b.id === sourceId)?.name || sourceId;
        const destName = ALL_DESTINATIONS.find(d => d.id === destId)?.name || destId;

        Swal.fire({
            title: 'ดำเนินการส่งมอบ?',
            text: `ระบบจะสร้างรายการความเคลื่อนไหวจาก ${sourceName} ไปยัง ${destName}`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'ดำเนินการทันที',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#3b82f6',
        }).then(async (result: any) => {
            if (result.isConfirmed) {
                try {
                    const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
                    let docPrefix = 'RET';
                    if (req.requestType === 'PULL') docPrefix = 'COLL';
                    else if (req.branchId === 'hub_nw') docPrefix = 'DIST';

                    const docNo = `${docPrefix}-OUT-${datePart}-${req.requestNo.split('-').pop()}`;

                    await addMovementBatch({
                        type: 'OUT',
                        source: sourceId,
                        dest: destId,
                        items: req.items,
                        docNo,
                        referenceDocNo: req.requestNo,
                        note: `Processed from ${req.requestType} Request ${req.requestNo} - ${req.purpose}`
                    });

                    await updatePalletRequest({ ...req, status: 'SHIPPED', processDocNo: docNo });
                    Swal.fire({
                        icon: 'success',
                        title: 'จัดส่งแล้ว!',
                        text: `สร้างเลขที่เอกสาร ${docNo}`,
                        confirmButtonText: 'ตกลง',
                        confirmButtonColor: '#10b981',
                    });
                } catch (error: any) {
                    Swal.fire({
                        icon: 'error',
                        title: 'ไม่สามารถดำเนินการได้!',
                        text: error.message || 'เกิดข้อผิดพลาดในการทำรายการ',
                        confirmButtonText: 'ตกลง',
                        confirmButtonColor: '#d33',
                    });
                }
            }
        });
    };

    const displayRequests = isHub
        ? [...palletRequests].sort((a, b) => b.id.localeCompare(a.id))
        : palletRequests.filter(r => r.branchId === selectedBranch || r.targetBranchId === selectedBranch).sort((a, b) => b.id.localeCompare(a.id));

    return {
        isModalOpen, setIsModalOpen,
        requestItems, setRequestItems,
        newRequestMeta, setNewRequestMeta,
        editingRequestId,
        isHub,
        ALL_DESTINATIONS,
        handleAddItem, handleRemoveItem, handleItemChange,
        handleCreateRequest, handleApprove, handleReject, handleShip, handleEdit,
        handleCloseModal,
        displayRequests
    };
}
