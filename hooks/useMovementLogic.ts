import React, { useState, useMemo } from 'react';
import { BranchId, Transaction, TransactionType, PalletId, User } from '../types';
import { useStock } from '../contexts/StockContext';
// @ts-ignore
import Swal from 'sweetalert2';

export function useMovementLogic(selectedBranch: BranchId, transactions: Transaction[]) {
    const { addMovementBatch, confirmTransactionsBatch } = useStock();

    const [subTab, setSubTab] = useState<'movement' | 'requests'>('movement');
    const [transactionType, setTransactionType] = useState<TransactionType>('IN');
    const [target, setTarget] = useState('');
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
    const [referenceDocNo, setReferenceDocNo] = useState('');
    const [items, setItems] = useState<{ palletId: PalletId | ''; qty: string }[]>([
        { palletId: '', qty: '' }
    ]);

    const [transportInfo, setTransportInfo] = useState({
        carRegistration: '',
        vehicleType: '',
        driverName: '',
        transportCompany: ''
    });

    const [verifyingGroup, setVerifyingGroup] = useState<Transaction[] | null>(null);
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const [timelineTx, setTimelineTx] = useState<Transaction | null>(null);
    const [isTimelineOpen, setIsTimelineOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);

    const { pendingGroups, historyGroups } = useMemo(() => {
        const pGroups: Record<string, Transaction[]> = {};
        const hGroups: Record<string, Transaction[]> = {};

        const sorted = [...transactions].sort((a, b) => b.id - a.id);

        sorted.forEach(tx => {
            const docNo = tx.docNo || `UNKNOWN-${tx.id}`;

            if (tx.dest === selectedBranch && tx.status === 'PENDING') {
                if (!pGroups[docNo]) pGroups[docNo] = [];
                pGroups[docNo].push(tx);
            }

            if (tx.status !== 'CANCELLED' && (tx.source === selectedBranch || tx.dest === selectedBranch)) {
                if (!hGroups[docNo]) hGroups[docNo] = [];
                hGroups[docNo].push(tx);
            }
        });

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

        if (!target) {
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'กรุณาเลือกปลายทาง/ต้นทาง',
                confirmButtonText: 'เข้าใจแล้ว',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        const validItems = items.filter(i => i.palletId && parseInt(i.qty) > 0);
        if (validItems.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'กรุณาระบุจำนวนและประเภทพาเลทอย่างน้อย 1 รายการ',
                confirmButtonText: 'เข้าใจแล้ว',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        const datePart = transactionDate.replace(/-/g, '');
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
            date: transactionDate,
            referenceDocNo,
            ...transportInfo
        };

        if (transactionType === 'OUT') {
            setPreviewData(data);
            setIsPreviewOpen(true);
        } else {
            saveTransaction(data);
        }
    };

    const saveTransaction = async (data: any) => {
        try {
            await addMovementBatch(data);

            setTarget('');
            setTransactionDate(new Date().toISOString().split('T')[0]);
            setReferenceDocNo('');
            setItems([{ palletId: '', qty: '' }]);
            setTransportInfo({
                carRegistration: '',
                vehicleType: '',
                driverName: '',
                transportCompany: ''
            });

            setIsPreviewOpen(false);
            setPreviewData(null);

            Swal.fire({
                icon: 'success',
                title: 'บันทึกสำเร็จ!',
                text: 'รายการเคลื่อนย้ายถูกบันทึกเรียบร้อยแล้ว',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error: any) {
            console.error("Save failed:", error);
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถทำรายการได้!',
                text: error.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#d33',
            });
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
        confirmTransactionsBatch(txs);
        Swal.fire({
            icon: 'success',
            title: 'เรียบร้อย!',
            text: 'ยืนยันการรับของเสร็จสมบูรณ์',
            timer: 1500,
            showConfirmButton: false
        });
        setVerifyingGroup(null);
        setIsReceiveModalOpen(false);
    };

    return {
        subTab, setSubTab,
        transactionType, setTransactionType,
        target, setTarget,
        transactionDate, setTransactionDate,
        referenceDocNo, setReferenceDocNo,
        items, setItems,
        transportInfo, setTransportInfo,
        verifyingGroup, setVerifyingGroup,
        isReceiveModalOpen, setIsReceiveModalOpen,
        timelineTx, setTimelineTx,
        isTimelineOpen, setIsTimelineOpen,
        isPreviewOpen, setIsPreviewOpen,
        previewData, setPreviewData,
        pendingGroups, historyGroups,
        handleAddItem, handleRemoveItem, handleItemChange,
        handleViewTimeline, handleSubmit, handleConfirmSave,
        handleBatchConfirm, handleConfirmReceive
    };
}
