import React, { useState, useMemo } from 'react';
import { BranchId, Transaction, TransactionType, PalletId, User } from '../types';
import { useStock } from '../contexts/StockContext';
// @ts-ignore
import Swal from 'sweetalert2';
import { AUTOMATION_RULES, EXTERNAL_PARTNERS, BRANCHES } from '../constants';

export function useMovementLogic(selectedBranch: BranchId, transactions: Transaction[]) {
    const { addMovementBatch, confirmTransactionsBatch } = useStock();

    const [subTab, setSubTab] = useState<'movement' | 'requests'>('movement');
    const [mode, setMode] = useState<'standard' | 'quick'>('standard');
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

    const handleVerifyDocument = (txGroup: Transaction[]) => {
        const tx = txGroup[0];
        const data = {
            type: tx.type,
            source: tx.source,
            dest: tx.dest,
            items: txGroup.map(t => ({ palletId: t.palletId, qty: t.qty })),
            docNo: tx.docNo,
            date: tx.date,
            carRegistration: tx.carRegistration,
            driverName: tx.driverName,
            transportCompany: tx.transportCompany,
            referenceDocNo: tx.referenceDocNo,
            note: tx.note
        };
        setPreviewData(data);
        setIsPreviewOpen(true);
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

        // Rule for Sino: OUT only at hub_nw
        if (transactionType === 'OUT' && target === 'sino' && selectedBranch !== 'hub_nw') {
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถทำรายการได้',
                text: 'การคืนพาเลทให้ Sino สามารถทำได้ที่สาขานครสวรรค์ (Hub NW) เท่านั้น',
                confirmButtonText: 'รับทราบ',
                confirmButtonColor: '#d33',
            });
            return;
        }

        // Rule for Lascam (Loscam Wangnoi): OUT only at hub_nw
        if (transactionType === 'OUT' && target === 'loscam_wangnoi' && selectedBranch !== 'hub_nw') {
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถทำรายการได้',
                text: 'การจ่ายออกในนาม Loscam วังน้อย สามารถทำได้ที่สาขานครสวรรค์ (Hub NW) เท่านั้น',
                confirmButtonText: 'รับทราบ',
                confirmButtonColor: '#d33',
            });
            return;
        }

        // Rule for Neo Corp: IN only (returns must go to Wangnoi)
        if (transactionType === 'OUT' && target === 'neo_corp') {
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถทำรายการได้',
                text: 'การจ่ายออกในนาม Neo Corp ไม่อนุญาตในระบบ (กรุณาใช้ "Loscam วังน้อย" สำหรับการคืนของ)',
                confirmButtonText: 'รับทราบ',
                confirmButtonColor: '#d33',
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

        // Version 2.0.0 Automation Logic
        let status: 'PENDING' | 'COMPLETED' = 'PENDING';

        // Sai 3 Auto Confirm (Incoming/Outgoing)
        if (selectedBranch === 'sai3' && AUTOMATION_RULES.sai3.partnersWithAutoFlow.includes(target)) {
            status = 'COMPLETED';
        }

        const srcPartner = EXTERNAL_PARTNERS.find(p => p.id === (transactionType === 'IN' ? target : selectedBranch));
        const dstPartner = EXTERNAL_PARTNERS.find(p => p.id === (transactionType === 'IN' ? selectedBranch : target));

        let display_source = srcPartner ? (srcPartner.name) : (BRANCHES.find(b => b.id === (transactionType === 'IN' ? target : selectedBranch))?.name || (transactionType === 'IN' ? target : selectedBranch));
        let display_dest = dstPartner ? (dstPartner.name) : (BRANCHES.find(b => b.id === (transactionType === 'IN' ? selectedBranch : target))?.name || (transactionType === 'IN' ? selectedBranch : target));

        // Special NW Hub Mapping for Lascam
        if (selectedBranch === 'hub_nw' && transactionType === 'OUT' && target === 'loscam_wangnoi') {
            display_dest = 'บ. นีโอ คอร์ปอเรท';
        }

        const data = {
            type: transactionType as TransactionType,
            source: transactionType === 'IN' ? target : selectedBranch,
            dest: transactionType === 'IN' ? selectedBranch : target,
            display_source,
            display_dest,
            items: validItems.map(i => ({
                palletId: i.palletId as PalletId,
                qty: parseInt(i.qty)
            })),
            docNo,
            date: transactionDate,
            referenceDocNo,
            status,
            ...transportInfo
        };

        if (transactionType === 'OUT' && status !== 'COMPLETED') {
            setPreviewData(data);
            setIsPreviewOpen(true);
        } else {
            saveTransaction(data);
        }
    };

    const saveTransaction = async (data: any) => {
        try {
            await addMovementBatch(data);

            // Handle Secondary Auto-Transaction (NW Case)
            if (selectedBranch === 'hub_nw' && data.type === 'IN') {
                const nwRules = AUTOMATION_RULES.hub_nw;
                let autoOutDest = '';

                if (data.source === nwRules.loscam.provider) {
                    autoOutDest = nwRules.loscam.autoDispatchAs;
                } else if (data.source === nwRules.sino.provider) {
                    autoOutDest = nwRules.sino.autoDispatchAs;
                }

                if (autoOutDest) {
                    const autoOutData = {
                        ...data,
                        type: 'OUT',
                        source: 'hub_nw',
                        dest: autoOutDest,
                        docNo: data.docNo + '-AUTO',
                        note: `Auto-generated from ${data.docNo}`,
                        status: 'COMPLETED' // Auto out is usually immediate
                    };
                    await addMovementBatch(autoOutData);
                }
            }

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

    const handleQuickSubmit = async (
        partnerId: string,
        palletId: PalletId,
        type: TransactionType,
        qty: number,
        additionalData?: {
            date: string;
            referenceDocNo: string;
            carRegistration: string;
            vehicleType: string;
            driverName: string;
            transportCompany: string;
        }
    ) => {
        if (!partnerId || !palletId || qty <= 0) return;

        // Rule for Sino: OUT only at hub_nw
        if (type === 'OUT' && partnerId === 'sino' && selectedBranch !== 'hub_nw') {
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถทำรายการได้',
                text: 'การคืนพาเลทให้ Sino สามารถทำได้ที่สาขานครสวรรค์ (Hub NW) เท่านั้น',
                confirmButtonText: 'รับทราบ',
                confirmButtonColor: '#d33',
            });
            return;
        }

        const transactionDate = additionalData?.date || new Date().toISOString().split('T')[0];
        const datePart = transactionDate.replace(/-/g, '');
        const existingDocNos = Array.from(new Set(transactions
            .filter(t => t.docNo && t.docNo.includes(datePart))
            .map(t => t.docNo)));
        const running = (existingDocNos.length + 1).toString().padStart(3, '0');
        const prefix = 'QL'; // Quick Loop
        const docNo = `${prefix}-${datePart}-${running}`;

        // Auto-status for Sai 3 partners
        let status: 'PENDING' | 'COMPLETED' = 'PENDING';
        if (selectedBranch === 'sai3' && AUTOMATION_RULES.sai3.partnersWithAutoFlow.includes(partnerId)) {
            status = 'COMPLETED';
        }

        const srcPartner = EXTERNAL_PARTNERS.find(p => p.id === (type === 'IN' ? partnerId : selectedBranch));
        const dstPartner = EXTERNAL_PARTNERS.find(p => p.id === (type === 'IN' ? selectedBranch : partnerId));

        let display_source = srcPartner ? (srcPartner.name) : (BRANCHES.find(b => b.id === (type === 'IN' ? partnerId : selectedBranch))?.name || (type === 'IN' ? partnerId : selectedBranch));
        let display_dest = dstPartner ? (dstPartner.name) : (BRANCHES.find(b => b.id === (type === 'IN' ? selectedBranch : partnerId))?.name || (type === 'IN' ? selectedBranch : partnerId));

        // Special NW Hub Mapping for Lascam
        if (selectedBranch === 'hub_nw' && type === 'OUT' && partnerId === 'loscam_wangnoi') {
            display_dest = 'บ. นีโอ คอร์ปอเรท';
        }

        const data = {
            type,
            source: type === 'IN' ? partnerId : selectedBranch,
            dest: type === 'IN' ? selectedBranch : partnerId,
            display_source,
            display_dest,
            items: [{ palletId, qty }],
            docNo,
            date: transactionDate,
            referenceDocNo: additionalData?.referenceDocNo || '',
            carRegistration: additionalData?.carRegistration || '',
            vehicleType: additionalData?.vehicleType || '',
            driverName: additionalData?.driverName || '',
            transportCompany: additionalData?.transportCompany || '',
            status,
            note: 'Quick Loop Entry'
        };

        await saveTransaction(data);
    };

    return {
        subTab, setSubTab,
        mode, setMode,
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
        handleViewTimeline, handleVerifyDocument, handleSubmit, handleConfirmSave,
        handleBatchConfirm, handleConfirmReceive,
        handleQuickSubmit
    };
}
