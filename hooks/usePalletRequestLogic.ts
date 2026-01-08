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

        const newReq: any = {
            branchId: selectedBranch,
            items: validItems.map(i => ({ palletId: i.palletId as PalletId, qty: parseInt(i.qty) })),
            purpose: newRequestMeta.purpose,
            priority: newRequestMeta.priority,
            requestType: newRequestMeta.requestType,
            targetBranchId: finalTarget,
            note: newRequestMeta.note,
        };

        createPalletRequest(newReq);

        setIsModalOpen(false);
        setRequestItems([{ palletId: '', qty: '' }]);
        setNewRequestMeta({
            purpose: '',
            priority: 'NORMAL',
            targetBranchId: '',
            requestType: 'PUSH',
            note: '',
            branchId: selectedBranch
        });

        Swal.fire({
            icon: 'success',
            title: 'ส่งคำขอแล้ว',
            text: 'รายการคำขอของคุณถูกบันทึกลงระบบแล้ว',
            timer: 2000,
            showConfirmButton: false
        });
    };

    const handleApprove = (req: PalletRequest) => {
        // Source depends on Request Type
        const sourceBranchId = req.requestType === 'PULL' ? (req.targetBranchId as BranchId) : req.branchId;

        // Check if requested items exceed Source branch stock
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
                text: `ไม่สามารถอนุมัติได้เนื่องจากยอดในสต๊อกของ ${sourceBranchName} ต่ำกว่าที่จะส่ง:\n${details}\n\nกรุณา "แก้ไข" ยอดพาเลทก่อนอนุมัติ`,
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
        if (req.items.length === 0) return;

        const sourceBranchId = req.requestType === 'PULL' ? (req.targetBranchId as BranchId) : req.branchId;
        const firstItem = req.items[0];
        const palletName = PALLET_TYPES.find(p => p.id === firstItem.palletId)?.name || firstItem.palletId;
        const available = stock[sourceBranchId]?.[firstItem.palletId] || 0;

        Swal.fire({
            title: 'แก้ไขจำนวนพาเลท',
            text: `${palletName} (สต๊อกต้นทาง ${sourceBranchId} มี ${available})`,
            input: 'number',
            inputValue: firstItem.qty,
            showCancelButton: true,
            confirmButtonText: 'บันทึกการแก้ไข',
            inputValidator: (value: string) => {
                if (!value || parseInt(value) <= 0) {
                    return 'กรุณาระบุจำนวนที่ถูกต้อง';
                }
                return null;
            }
        }).then((result: any) => {
            if (result.isConfirmed) {
                const newItems = [...req.items];
                newItems[0] = { ...newItems[0], qty: parseInt(result.value) };
                updatePalletRequest({ ...req, items: newItems });
                Swal.fire('แก้ไขแล้ว!', 'ปรับการขอพาเลทเรียบร้อยแล้ว', 'success');
            }
        });
    };

    const handleShip = (req: PalletRequest) => {
        // Logic for PUSH vs PULL
        // PUSH: Requester (branchId) -> Target (targetBranchId) [Standard Return]
        // PULL: Target (targetBranchId) -> Requester (branchId) [Collection from Hub]

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
        isHub,
        ALL_DESTINATIONS,
        handleAddItem, handleRemoveItem, handleItemChange,
        handleCreateRequest, handleApprove, handleReject, handleShip, handleEdit,
        displayRequests
    };
}
