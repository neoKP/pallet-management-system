import React, { useMemo, useState } from 'react';
import {
    Clock,
    Truck
} from 'lucide-react';
import { Transaction, BranchId, User, PalletId } from '../../types';
import { useStock } from '../../contexts/StockContext';
import RecentTransactionsTable from '../dashboard/RecentTransactionsTable';
import InTransitTable from '../dashboard/InTransitTable';
import TransactionTimelineModal from '../movements/TransactionTimelineModal';
import DocumentPreviewModal from '../movements/DocumentPreviewModal';
import { handleExportToExcel } from '../../utils/excelExport';
import StockAdjustmentModal from '../dashboard/StockAdjustmentModal';
// @ts-ignore
import Swal from 'sweetalert2';

interface HistoryTabProps {
    transactions: Transaction[];
    selectedBranch: BranchId | 'ALL';
    currentUser: User | null;
}

const HistoryTab: React.FC<HistoryTabProps> = ({ transactions, selectedBranch, currentUser }) => {
    const { deleteTransaction, adjustStock, stock } = useStock();

    // Timeline State
    const [timelineTxs, setTimelineTxs] = useState<Transaction[] | null>(null);

    // Print State
    const [isPrintOpen, setIsPrintOpen] = useState(false);
    const [printData, setPrintData] = useState<any>(null);

    // Adjustment Modal State
    const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);

    const displayTransactions = useMemo(() => {
        let filtered = [...transactions];
        if (selectedBranch !== 'ALL') {
            filtered = filtered.filter(t => t.source === selectedBranch || t.dest === selectedBranch);
        }
        return filtered.sort((a, b) => b.id - a.id);
    }, [transactions, selectedBranch]);

    const handleViewTimeline = (tx: Transaction) => {
        const group = transactions.filter(t => t.docNo === tx.docNo);
        setTimelineTxs(group.length > 0 ? group : [tx]);
    };

    const handlePrintDoc = (mainTx: Transaction) => {
        const group = transactions.filter(t => t.docNo === mainTx.docNo);
        const data = {
            source: mainTx.source,
            dest: mainTx.dest,
            docNo: mainTx.docNo,
            date: mainTx.date,
            carRegistration: mainTx.carRegistration,
            driverName: mainTx.driverName,
            transportCompany: mainTx.transportCompany,
            referenceDocNo: mainTx.referenceDocNo,
            note: mainTx.note,
            items: group.map(t => ({ palletId: t.palletId, qty: t.qty }))
        };
        setPrintData(data);
        setIsPrintOpen(true);
    };

    const handleDelete = (txId: number) => {
        if (Swal) {
            Swal.fire({
                title: 'ยืนยันการลบรายการ?',
                text: "รายการจะถูกขีดฆ่าและทำเครื่องหมายว่ายกเลิก",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'ลบรายการ',
                cancelButtonText: 'ยกเลิก'
            }).then((result: any) => {
                if (result.isConfirmed) {
                    deleteTransaction(txId);
                    Swal.fire(
                        'ลบสำเร็จ!',
                        'รายการถูกยกเลิกแล้ว',
                        'success'
                    );
                }
            });
        }
    };

    const handleAdjustmentSubmit = async (data: { type: 'IN' | 'OUT' | 'ABSOLUTE'; branchId: string; palletId: PalletId; qty: number; note: string }) => {
        try {
            // Calculate the target stock value based on adjustment type
            const currentQty = stock[data.branchId as BranchId]?.[data.palletId] || 0;
            let finalQty: number;

            if (data.type === 'ABSOLUTE') {
                finalQty = data.qty; // Set directly to the input value
            } else if (data.type === 'IN') {
                finalQty = currentQty + data.qty; // Add to current
            } else {
                finalQty = currentQty - data.qty; // Subtract from current
            }

            // Always use adjustStock for stability - it directly updates Firebase stock
            await adjustStock({
                targetId: data.branchId,
                palletId: data.palletId,
                newQty: finalQty,
                reason: `[${data.type}] ${data.note}`,
                userName: currentUser?.name || 'Unknown'
            });

            setIsAdjModalOpen(false);
            Swal.fire({
                icon: 'success',
                title: 'สำเร็จ',
                text: `ปรับปรุงสต็อกเรียบร้อยแล้ว (${currentQty} → ${finalQty})`,
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถปรับปรุงสต็อกได้!',
                text: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#d33',
            });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <StockAdjustmentModal
                isOpen={isAdjModalOpen}
                onClose={() => setIsAdjModalOpen(false)}
                onSubmit={handleAdjustmentSubmit}
                currentBranch={selectedBranch}
                stock={stock}
                transactions={transactions}
            />

            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Clock size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Inventory Logs</h2>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">ประวัติการเคลื่อนย้ายและรายการระหว่างทาง</p>
                </div>
            </div>

            <InTransitTable
                transactions={transactions}
                selectedBranch={selectedBranch}
            />

            <RecentTransactionsTable
                displayTransactions={displayTransactions}
                selectedBranch={selectedBranch}
                currentUser={currentUser}
                onViewTimeline={handleViewTimeline}
                onPrintDoc={handlePrintDoc}
                onDelete={handleDelete}
                onExport={() => handleExportToExcel(displayTransactions, selectedBranch)}
                onOpenAdjModal={() => setIsAdjModalOpen(true)}
            />

            {timelineTxs && (
                <TransactionTimelineModal
                    isOpen={!!timelineTxs}
                    onClose={() => setTimelineTxs(null)}
                    transactions={timelineTxs}
                />
            )}

            <DocumentPreviewModal
                isOpen={isPrintOpen}
                onClose={() => {
                    setIsPrintOpen(false);
                    setPrintData(null);
                }}
                onConfirm={() => {
                    setIsPrintOpen(false);
                    setPrintData(null);
                }}
                data={printData}
            />
        </div>
    );
};

export default HistoryTab;
