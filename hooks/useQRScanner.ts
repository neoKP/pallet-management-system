import { useState, useEffect } from 'react';
import { Transaction, User } from '../types';
// @ts-ignore
import Swal from 'sweetalert2';

export const useQRScanner = (
    currentUser: User | null,
    transactions: Transaction[],
    confirmTransactionsBatch: (txIdsOrAdjustments: (number | { id: number; palletId: any; qty: number })[]) => void,
    setActiveTab: (tab: any) => void
) => {
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [queuedReceiveDocNo, setQueuedReceiveDocNo] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const docNo = queuedReceiveDocNo || params.get('receive');

        if (docNo && currentUser) {
            // Find transactions for this docNo that are PENDING and for the current branch
            const pendingTxs = transactions.filter(t =>
                t.docNo === docNo &&
                t.status === 'PENDING' &&
                t.dest === currentUser.branchId
            );

            if (pendingTxs.length > 0) {
                // Clear param from URL and state
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
                setQueuedReceiveDocNo(null);

                const itemsDescription = pendingTxs.map(t =>
                    `• ${t.palletId}: ${t.qty} ตัว`
                ).join('\n');

                Swal.fire({
                    title: 'สแกนรับพาเลทด่วน',
                    html: `ยืนยันการรับพาเลทจากเอกสาร <b>${docNo}</b><br/><br/>` +
                        `<div class="text-left bg-slate-50 p-4 rounded-xl border border-slate-100 font-bold text-slate-700 whitespace-pre-line">${itemsDescription}</div>`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#2563eb',
                    cancelButtonColor: '#64748b',
                    confirmButtonText: 'ยืนยันการรับของทั้งหมด',
                    cancelButtonText: 'ยังไม่ได้รับ',
                    reverseButtons: true
                }).then((result: any) => {
                    if (result.isConfirmed) {
                        confirmTransactionsBatch(pendingTxs.map(t => t.id));
                        Swal.fire({
                            title: 'สำเร็จ!',
                            text: 'บันทึกการรับพาเลทเรียบร้อยแล้ว',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        setActiveTab('dashboard');
                    }
                });
            } else if (transactions.length > 0) {
                // If we have transactions but no pending ones found for this user/doc
                const anyTx = transactions.find(t => t.docNo === docNo);
                if (anyTx) {
                    if (anyTx.status === 'COMPLETED') {
                        const newUrl = window.location.pathname;
                        window.history.replaceState({}, '', newUrl);
                        setQueuedReceiveDocNo(null);
                        Swal.fire('แจ้งเตือน', 'เอกสารนี้ถูกบันทึกรับเข้าเรียบร้อยแล้ว', 'info');
                    } else if (anyTx.dest !== currentUser.branchId) {
                        // Not for this branch
                        const newUrl = window.location.pathname;
                        window.history.replaceState({}, '', newUrl);
                        setQueuedReceiveDocNo(null);
                        Swal.fire('ข้อผิดพลาด', 'เอกสารนี้ไม่ใช่ของสาขาคุณ', 'error');
                    }
                }
            }
        }
    }, [currentUser, transactions, confirmTransactionsBatch, queuedReceiveDocNo, setActiveTab]);

    const handleScanSuccess = (decodedText: string) => {
        setIsScannerOpen(false);

        // Try to extract docNo from URL or use as is
        let docNo = decodedText;
        try {
            if (decodedText.includes('?receive=')) {
                const url = new URL(decodedText);
                docNo = url.searchParams.get('receive') || decodedText;
            }
        } catch (e) {
            // Not a valid URL, use as raw text
        }

        setQueuedReceiveDocNo(docNo);
    };

    return {
        isScannerOpen,
        setIsScannerOpen,
        handleScanSuccess
    };
};
