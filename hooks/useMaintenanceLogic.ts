import React, { useState } from 'react';
import { Stock, BranchId, PalletId, Transaction } from '../types';
import { PALLET_TYPES } from '../constants';
// @ts-ignore
import Swal from 'sweetalert2';

export function useMaintenanceLogic(
    stock: Stock,
    selectedBranch: BranchId,
    onBatchMaintenance: (data: any) => void,
    onAddTransaction: (transaction: Partial<Transaction>) => void
) {
    const [subTab, setSubTab] = useState<'inbound' | 'process'>('inbound');
    const [isProcessing, setIsProcessing] = useState(false);

    // Inbound State
    const [inboundForm, setInboundForm] = useState({
        palletId: 'loscam_red' as PalletId,
        qty: '',
        note: '',
        sourceBranchId: selectedBranch as BranchId
    });

    // Process State
    const [batchItems, setBatchItems] = useState<{ palletId: PalletId; qty: number }[]>([]);
    const [fixedQty, setFixedQty] = useState(0);
    const [scrappedQty, setScrappedQty] = useState(0);
    const [targetPalletId, setTargetPalletId] = useState<PalletId>('general');
    const [targetBranchId, setTargetBranchId] = useState<BranchId>(selectedBranch);
    const [note, setNote] = useState('');

    const pendingStock = stock['maintenance_stock'] || {};
    const totalProcessed = batchItems.reduce((sum, item) => sum + item.qty, 0);

    const handleInboundSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isProcessing) return;

        const qty = parseInt(inboundForm.qty);
        if (qty <= 0) return;

        try {
            setIsProcessing(true);
            await (onAddTransaction({
                type: 'OUT',
                source: inboundForm.sourceBranchId,
                dest: 'maintenance_stock',
                palletId: inboundForm.palletId,
                qty: qty,
                note: inboundForm.note || 'ส่งซ่อม'
            }) as any);

            Swal.fire({
                icon: 'success',
                title: 'สำเร็จ',
                text: 'ส่งเข้าคลังซ่อมเรียบร้อย',
                timer: 2000,
                showConfirmButton: false
            });
            setInboundForm({ ...inboundForm, qty: '', note: '' });
        } catch (error: any) {
            console.error("Inbound submit failed:", error);
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถส่งซ่อมได้!',
                text: error.message || 'เกิดข้อผิดพลาดในการส่งเข้าคลังซ่อม',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#d33',
            });
        } finally {
            setIsProcessing(false);
        }
    };

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isProcessing) return;

        for (const item of batchItems) {
            const currentPending = pendingStock[item.palletId] || 0;
            if (item.qty > currentPending) {
                Swal.fire({
                    icon: 'error',
                    title: 'จำนวนไม่พอ',
                    text: `จำนวน ${PALLET_TYPES.find(p => p.id === item.palletId)?.name} ในคลังซ่อมมีไม่พอ (มี: ${currentPending}, จะซ่อม: ${item.qty})`
                });
                return;
            }
        }

        if (fixedQty + scrappedQty !== totalProcessed) {
            Swal.fire({
                icon: 'warning',
                title: 'ยอดไม่ตรง',
                text: 'ยอดรวม (ซ่อมได้ + ทิ้ง) ต้องเท่ากับจำนวนที่เบิกมาซ่อม'
            });
            return;
        }

        try {
            setIsProcessing(true);
            await (onBatchMaintenance({
                items: batchItems,
                fixedQty,
                scrappedQty,
                targetPalletId,
                targetBranchId,
                note,
                branchId: 'maintenance_stock'
            }) as any);

            setBatchItems([]);
            setFixedQty(0);
            setScrappedQty(0);
            setTargetPalletId('general');
            setTargetBranchId(selectedBranch);
            setNote('');
            Swal.fire({
                icon: 'success',
                title: 'สำเร็จ',
                text: 'บันทึกผลการซ่อมสำเร็จ!',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error: any) {
            console.error("Maintenance submit failed:", error);
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถดำเนินการซ่อมได้!',
                text: error.message || 'เกิดข้อผิดพลาดในการบันทึกผลการซ่อม',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#d33',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        subTab, setSubTab,
        isProcessing,
        inboundForm, setInboundForm,
        batchItems, addBatchItem, removeBatchItem, updateBatchItem,
        fixedQty, setFixedQty,
        scrappedQty, setScrappedQty,
        targetPalletId, setTargetPalletId,
        targetBranchId, setTargetBranchId,
        note, setNote,
        pendingStock, totalProcessed,
        handleInboundSubmit, handleSubmit
    };
}
