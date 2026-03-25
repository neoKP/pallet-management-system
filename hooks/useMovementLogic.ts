import React, { useState, useMemo } from 'react';
import { BranchId, Transaction, TransactionType, PalletId, User } from '../types';
import { useStock } from '../contexts/StockContext';
// @ts-ignore
import Swal from 'sweetalert2';
import { AUTOMATION_RULES, EXTERNAL_PARTNERS, BRANCHES } from '../constants';

// Double-Deduction Alert: เวลาที่ตรวจสอบการทำรายการซ้ำ (1 นาที = 60000ms)
const DUPLICATE_CHECK_WINDOW_MS = 60000;

export function useMovementLogic(selectedBranch: BranchId, transactions: Transaction[]) {
    const { addMovementBatch, confirmTransactionsBatch, deleteTransaction, isDataLoaded } = useStock();

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
    const [isProcessing, setIsProcessing] = useState(false);

    const suggestions = useMemo(() => {
        const registrations = new Set<string>();
        const drivers = new Set<string>();
        const companies = new Set<string>();

        transactions.forEach(tx => {
            if (tx.carRegistration) registrations.add(tx.carRegistration);
            if (tx.driverName) drivers.add(tx.driverName);
            if (tx.transportCompany) companies.add(tx.transportCompany);
        });

        return {
            carRegistrations: Array.from(registrations).sort(),
            driverNames: Array.from(drivers).sort(),
            transportCompanies: Array.from(companies).sort()
        };
    }, [transactions]);

    const { pendingGroups, historyGroups } = useMemo(() => {
        const pGroups: Record<string, Transaction[]> = {};
        const hGroups: Record<string, Transaction[]> = {};

        const sorted = [...transactions].sort((a, b) => b.id - a.id);

        const cancelledDocNos = new Set(
            transactions.filter(t => t.status === 'CANCELLED').map(t => t.docNo).filter(Boolean)
        );

        sorted.forEach(tx => {
            const docNo = tx.docNo || `UNKNOWN-${tx.id}`;

            if (tx.dest === selectedBranch && tx.status === 'PENDING' && !cancelledDocNos.has(tx.docNo)) {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 🔒 Loading Guard: ป้องกันบันทึกก่อนข้อมูลโหลดเสร็จ
        if (!isDataLoaded) {
            Swal.fire({
                icon: 'warning',
                title: 'ระบบกำลังโหลดข้อมูล',
                text: 'ระบบกำลังโหลดข้อมูลประวัติ กรุณารอสักครู่แล้วลองใหม่',
                confirmButtonText: 'เข้าใจแล้ว',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

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

        // Dynamic Branch Restriction Check using Partner's branchRestriction config
        const targetPartner = EXTERNAL_PARTNERS.find(p => p.id === target);
        if (targetPartner?.branchRestriction) {
            const restriction = transactionType === 'IN' 
                ? targetPartner.branchRestriction.in 
                : targetPartner.branchRestriction.out;
            
            let isAllowed = false;
            if (restriction === 'all') {
                isAllowed = true;
            } else if (restriction === 'none') {
                isAllowed = false;
            } else if (Array.isArray(restriction)) {
                isAllowed = restriction.includes(selectedBranch);
            }

            if (!isAllowed) {
                const actionText = transactionType === 'IN' ? 'รับเข้าจาก' : 'จ่ายออกไป';
                const allowedBranches = Array.isArray(restriction) 
                    ? restriction.map(b => BRANCHES.find(br => br.id === b)?.name || b).join(', ')
                    : 'ไม่มีสาขาที่อนุญาต';
                
                Swal.fire({
                    icon: 'error',
                    title: 'ไม่สามารถทำรายการได้',
                    text: `การ${actionText} ${targetPartner.name} สามารถทำได้ที่: ${allowedBranches}`,
                    confirmButtonText: 'รับทราบ',
                    confirmButtonColor: '#d33',
                });
                return;
            }
        }

        const datePart = transactionDate.replace(/-/g, '');
        const actualSource = transactionType === 'IN' ? target : selectedBranch;
        const actualDest = transactionType === 'IN' ? selectedBranch : target;
        const isSourceBranch = BRANCHES.some(b => b.id === actualSource);
        const isDestBranch = BRANCHES.some(b => b.id === actualDest);
        const prefix = (isSourceBranch && isDestBranch) ? 'INT' : (!isSourceBranch && isDestBranch ? 'EXT-IN' : 'EXT-OUT');
        const existingDocNos = Array.from(new Set(transactions
            .filter(t => t.docNo && t.docNo.startsWith(`${prefix}-${datePart}`))
            .map(t => t.docNo)));
        const running = (existingDocNos.length + 1).toString().padStart(3, '0');
        const docNo = `${prefix}-${datePart}-${running}`;

        // Version 2.0.0 Automation Logic - Auto-Confirm OUT only (IN always requires manual confirm)
        let status: 'PENDING' | 'COMPLETED' = 'PENDING';

        // Only OUT transactions can be auto-confirmed
        if (transactionType === 'OUT') {
            // Sai 3 Auto Confirm (ล่ำสูง, UFC, Loxley, โคพี่, HI-Q)
            if (selectedBranch === 'sai3' && AUTOMATION_RULES.sai3.partnersWithAutoFlow.includes(target)) {
                status = 'COMPLETED';
            }
            // All Branches Auto Confirm (Sino)
            if (AUTOMATION_RULES.allBranches?.partnersWithAutoFlow?.includes(target)) {
                status = 'COMPLETED';
            }
            // Loscam Main: Auto-Confirm OUT only (to loscam_wangnoi at hub_nw)
            if (target === 'loscam_wangnoi' && selectedBranch === 'hub_nw') {
                status = 'COMPLETED';
            }
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
        if (isProcessing) return;

        // ⚠️ Double-Deduction Alert: ตรวจสอบการทำรายการซ้ำภายใน 1 นาที
        const now = new Date().getTime();
        const recentDuplicates = transactions.filter(tx => {
            const txTime = new Date(tx.date).getTime();
            const isRecent = (now - txTime) < DUPLICATE_CHECK_WINDOW_MS;
            const isSameDocNo = data.referenceDocNo && tx.referenceDocNo === data.referenceDocNo;
            const isSameSourceDest = tx.source === data.source && tx.dest === data.dest;
            const isSameType = tx.type === data.type;
            return isRecent && (isSameDocNo || (isSameSourceDest && isSameType));
        });

        if (recentDuplicates.length > 0) {
            const lastTx = recentDuplicates[0];
            const result = await Swal.fire({
                icon: 'warning',
                title: '⚠️ คำเตือน: พบรายการที่อาจซ้ำ',
                html: `
                    <p>ระบบพบว่ามีการตัดสต็อกสำหรับรายการนี้เมื่อสักครู่นี้</p>
                    <p><strong>เลขที่เอกสาร:</strong> ${lastTx.docNo}</p>
                    <p><strong>เวลา:</strong> ${new Date(lastTx.date).toLocaleString('th-TH')}</p>
                    <hr/>
                    <p>คุณแน่ใจหรือไม่ว่าต้องการบันทึกซ้ำ?</p>
                `,
                showCancelButton: true,
                confirmButtonText: 'ยืนยันบันทึก',
                cancelButtonText: 'ยกเลิก',
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
            });

            if (!result.isConfirmed) {
                return;
            }
        }

        try {
            setIsProcessing(true);
            await addMovementBatch(data);

            // Handle Secondary Auto-Transaction (NW Case) - Sino only
            if (selectedBranch === 'hub_nw' && data.type === 'IN') {
                const nwRules = AUTOMATION_RULES.hub_nw;
                let autoOutDest = '';

                // Only Sino has auto-transaction, Loscam Main does NOT
                if (data.source === nwRules.sino.provider) {
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
        } finally {
            setIsProcessing(false);
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

    const handleConfirmReceive = async (txs: Transaction[]) => {
        if (isProcessing) return;
        try {
            setIsProcessing(true);
            await confirmTransactionsBatch(txs, verifyingGroup || undefined);
            Swal.fire({
                icon: 'success',
                title: 'เรียบร้อย!',
                text: 'ยืนยันการรับของเสร็จสมบูรณ์',
                timer: 1500,
                showConfirmButton: false
            });
            setVerifyingGroup(null);
            setIsReceiveModalOpen(false);
        } catch (error: any) {
            console.error("Confirm receive failed:", error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด!',
                text: 'ไม่สามารถยืนยันการรับของได้ กรุณาลองใหม่อีกครั้ง',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#d33',
            });
        } finally {
            setIsProcessing(false);
        }
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
        const prefix = type === 'IN' ? 'QL-IN' : 'QL-OUT';
        const existingDocNos = Array.from(new Set(transactions
            .filter(t => t.docNo && t.docNo.startsWith(`${prefix}-${datePart}`))
            .map(t => t.docNo)));
        const running = (existingDocNos.length + 1).toString().padStart(3, '0');
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

    const handleDeleteGroup = (txGroup: Transaction[]) => {
        Swal.fire({
            title: 'ยืนยันการลบ?',
            text: `ต้องการลบรายการเลขที่ ${txGroup[0].docNo} ทั้งหมดหรือไม่? ยอดสต๊อกจะถูกปรับคืนโดยอัตโนมัติ`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ลบข้อมูล',
            cancelButtonText: 'ยกเลิก'
        }).then((result: any) => {
            if (result.isConfirmed) {
                txGroup.forEach(tx => deleteTransaction(tx.id));
                Swal.fire(
                    'ลบสำเร็จ!',
                    'รายการถูกยกเลิกและคืนยอดสต๊อกแล้ว',
                    'success'
                );
            }
        });
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
        isProcessing,
        timelineTx, setTimelineTx,
        isTimelineOpen, setIsTimelineOpen,
        isPreviewOpen, setIsPreviewOpen,
        previewData, setPreviewData,
        pendingGroups, historyGroups,
        suggestions,
        handleAddItem, handleRemoveItem, handleItemChange,
        handleViewTimeline, handleVerifyDocument, handleSubmit, handleConfirmSave,
        handleBatchConfirm, handleConfirmReceive,
        handleQuickSubmit,
        handleDeleteGroup
    };
}
