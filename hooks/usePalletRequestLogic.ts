import React, { useState } from 'react';
import { BranchId, PalletId, PalletRequest, User } from '../types';
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
        note: ''
    });

    const isHub = selectedBranch === 'hub_nw' || currentUser?.branchId === 'hub_nw';

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

        // If not hub, default destination is hub. If hub, must select destination.
        const finalTarget = newRequestMeta.targetBranchId || (isHub ? '' : 'hub_nw');

        if (!finalTarget) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาระบุปลายทาง',
                text: 'สำหรับสาขา NW กรุณาระบุปลายทางที่จะส่งพาเลทไป',
            });
            return;
        }

        const newReq = {
            branchId: selectedBranch,
            items: validItems.map(i => ({ palletId: i.palletId as PalletId, qty: parseInt(i.qty) })),
            purpose: newRequestMeta.purpose,
            priority: newRequestMeta.priority,
            targetBranchId: finalTarget,
            note: newRequestMeta.note,
            requestNo: ''
        };

        createPalletRequest(newReq);

        setIsModalOpen(false);
        setRequestItems([{ palletId: '', qty: '' }]);
        setNewRequestMeta({ purpose: '', priority: 'NORMAL', targetBranchId: '', note: '' });

        Swal.fire({
            icon: 'success',
            title: 'ส่งคำขอแล้ว',
            text: isHub ? 'บันทึกรายการส่งมอบแล้ว' : 'คำขอของคุณถูกส่งไปยังสาขา NW แล้ว',
            timer: 2000,
            showConfirmButton: false
        });
    };

    const handleApprove = (req: PalletRequest) => {
        // Check if requested items exceed Source branch stock (the requester)
        const insufficientItems = req.items.filter(item => {
            const available = stock[req.branchId]?.[item.palletId] || 0;
            return item.qty > available;
        });

        if (insufficientItems.length > 0) {
            const details = insufficientItems.map(i => {
                const name = PALLET_TYPES.find(p => p.id === i.palletId)?.name || i.palletId;
                const have = stock[req.branchId]?.[i.palletId] || 0;
                return `${name}: มีในสต๊อก ${have} (ขอมา ${i.qty})`;
            }).join('\n');

            const sourceBranchName = BRANCHES.find(b => b.id === req.branchId)?.name || req.branchId;

            Swal.fire({
                icon: 'error',
                title: 'สต๊อกสาขาต้นทางไม่เพียงพอ!',
                text: `ไม่สามารถอนุมัติได้เนื่องจากยอดในสต๊อกของ ${sourceBranchName} ต่ำกว่าที่จะส่ง:\n${details}\n\nกรุณา "แก้ไข" ยอดพาเลทก่อนอนุมัติ`,
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#d33',
            });
            return;
        }

        Swal.fire({
            title: 'ยืนยันการอนุมัติ?',
            text: `อนุมัติคำขอ ${req.requestNo} จาก ${BRANCHES.find(b => b.id === req.branchId)?.name}`,
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

        const firstItem = req.items[0];
        const palletName = PALLET_TYPES.find(p => p.id === firstItem.palletId)?.name || firstItem.palletId;
        const available = stock[req.branchId]?.[firstItem.palletId] || 0;

        Swal.fire({
            title: 'แก้ไขจำนวนพาเลท',
            text: `${palletName} (สต๊อกต้นทางมี ${available})`,
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
        const sourceName = BRANCHES.find(b => b.id === req.branchId)?.name || req.branchId;
        const destName = ALL_DESTINATIONS.find(d => d.id === req.targetBranchId)?.name || 'ไม่ระบุ';

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
                    const docType = req.branchId === 'hub_nw' ? 'DIST' : 'RET';
                    const docNo = `${docType}-OUT-${datePart}-${req.requestNo.split('-').pop()}`;

                    await addMovementBatch({
                        type: 'OUT',
                        source: req.branchId,
                        dest: req.targetBranchId || 'hub_nw',
                        items: req.items,
                        docNo,
                        referenceDocNo: req.requestNo,
                        note: `Processed from ${req.branchId === 'hub_nw' ? 'Distribution' : 'Return'} Request ${req.requestNo} - ${req.purpose}`
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
        : palletRequests.filter(r => r.branchId === selectedBranch).sort((a, b) => b.id.localeCompare(a.id));

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
