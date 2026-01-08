import React, { useMemo, useState } from 'react';
import {
    AlertCircle,
    Package,
    Flame,
    Box,
    Layers,
    ShieldCheck,
    Recycle
} from 'lucide-react';
import { Stock, BranchId, Transaction, PalletId, User } from '../../types';
import { useStock } from '../../contexts/StockContext';
import StatsCard from './StatsCard';
import StockAdjustmentModal from './StockAdjustmentModal';
import TransactionTimelineModal from '../movements/TransactionTimelineModal';
import DocumentPreviewModal from '../movements/DocumentPreviewModal';
import StockVisualizer from './StockVisualizer';
import RecentTransactionsTable from './RecentTransactionsTable';
import { handleExportToExcel } from '../../utils/excelExport';
import { BRANCHES } from '../../constants';
// @ts-ignore
import Swal from 'sweetalert2';

interface DashboardProps {
    stock: Stock;
    selectedBranch: BranchId | 'ALL';
    transactions: Transaction[];
    addTransaction: (transaction: Partial<Transaction>) => void;
    currentUser: User | null;
}

const Dashboard: React.FC<DashboardProps> = ({ stock, selectedBranch, transactions, addTransaction, currentUser }) => {
    const { deleteTransaction } = useStock();
    const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);

    // Timeline State
    const [timelineTxs, setTimelineTxs] = useState<Transaction[] | null>(null);

    // Print State
    const [isPrintOpen, setIsPrintOpen] = useState(false);
    const [printData, setPrintData] = useState<any>(null);

    const handleViewTimeline = (tx: Transaction) => {
        const group = transactions.filter(t => t.docNo === tx.docNo);
        setTimelineTxs(group.length > 0 ? group : [tx]);
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

    const stockOverview = useMemo(() => {
        const confirmed: Record<string, number> = {};
        const pending: Record<string, number> = {};

        const activeBranchIds = BRANCHES.map(b => b.id);

        if (selectedBranch === 'ALL') {
            // Calculate Sum of All Branch Stocks
            activeBranchIds.forEach(branchId => {
                const branchStock = stock[branchId];
                if (branchStock) {
                    Object.entries(branchStock).forEach(([pid, qty]) => {
                        confirmed[pid] = (confirmed[pid] || 0) + (qty as number);
                    });
                }
            });

            // Calculate Sum of All PENDING transactions (In-Transit)
            transactions.forEach(t => {
                if (t.status === 'PENDING') {
                    pending[t.palletId] = (pending[t.palletId] || 0) + (t.qty as number);
                }
            });
        } else {
            // Specific Branch Confirmed Stock
            const branchStock = stock[selectedBranch as BranchId] || {};
            Object.entries(branchStock).forEach(([pid, qty]) => {
                confirmed[pid] = qty as number;
            });

            // Pending items specifically FOR this branch (Incoming)
            transactions.forEach(t => {
                if (t.dest === selectedBranch && t.status === 'PENDING') {
                    pending[t.palletId] = (pending[t.palletId] || 0) + (t.qty as number);
                }
            });
        }

        return { confirmed, pending };
    }, [stock, selectedBranch, transactions]);

    const stats = useMemo(() => {
        const getVal = (pid: string) => ({
            confirmed: stockOverview.confirmed[pid] || 0,
            pending: stockOverview.pending[pid] || 0,
            total: (stockOverview.confirmed[pid] || 0) + (stockOverview.pending[pid] || 0)
        });

        const palletIds = ['loscam_red', 'loscam_yellow', 'loscam_blue', 'hiq', 'general', 'plastic_circular'];
        const result: any = {};
        let grandTotal = 0;
        let grandPending = 0;

        palletIds.forEach(pid => {
            const v = getVal(pid);
            result[pid] = v;
            grandTotal += v.total;
            grandPending += v.pending;
        });

        return {
            totalStock: grandTotal,
            totalPending: grandPending,
            loscamRed: result['loscam_red'],
            loscamYellow: result['loscam_yellow'],
            loscamBlue: result['loscam_blue'],
            hiq: result['hiq'],
            general: result['general'],
            plastic: result['plastic_circular']
        };
    }, [stockOverview]);

    const displayTransactions = useMemo(() => {
        let filtered = [...transactions];
        if (selectedBranch !== 'ALL') {
            filtered = filtered.filter(t => t.source === selectedBranch || t.dest === selectedBranch);
        }
        return filtered.sort((a, b) => b.id - a.id);
    }, [transactions, selectedBranch]);

    const isRedAlert = stats.loscamRed.total > 500;

    const handleAdjustmentSubmit = async (data: { type: 'IN' | 'OUT'; branchId: string; palletId: PalletId; qty: number; note: string }) => {
        try {
            await (addTransaction({
                type: 'ADJUST',
                source: data.type === 'IN' ? 'ADJUSTMENT' : data.branchId,
                dest: data.type === 'IN' ? data.branchId : 'ADJUSTMENT',
                palletId: data.palletId,
                qty: data.qty,
                note: data.note,
                status: 'COMPLETED'
            }) as any);

            setIsAdjModalOpen(false);
            Swal.fire({
                icon: 'success',
                title: 'สำเร็จ',
                text: 'ปรับปรุงสต็อกเรียบร้อยแล้ว',
                timer: 1500,
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
        <div className="space-y-6">
            <StockAdjustmentModal
                isOpen={isAdjModalOpen}
                onClose={() => setIsAdjModalOpen(false)}
                onSubmit={handleAdjustmentSubmit}
                currentBranch={selectedBranch}
            />

            {isRedAlert && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-red-900 font-bold">แจ้งเตือนระดับสต็อก (Alert)</h3>
                        <p className="text-red-700 text-sm mt-1">
                            พาเลท Loscam Red มีจำนวนสูงเกินมาตรฐาน ({stats.loscamRed.total} units). กรุณาตรวจสอบหรือระบายออก
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                <StatsCard
                    title="ยอดรวมทั้งสิ้น"
                    value={stats.totalStock}
                    confirmedValue={stats.totalStock - stats.totalPending}
                    pendingValue={stats.totalPending}
                    icon={Package}
                    color="bg-slate-900"
                    textColor="text-slate-900"
                    subtext="All Pallets"
                />
                <StatsCard
                    title="Loscam Red"
                    value={stats.loscamRed.total}
                    confirmedValue={stats.loscamRed.confirmed}
                    pendingValue={stats.loscamRed.pending}
                    icon={Flame}
                    color="bg-red-600"
                    textColor="text-red-600"
                    subtext="Critical"
                    alert={isRedAlert}
                />
                <StatsCard
                    title="Loscam Blue"
                    value={stats.loscamBlue.total}
                    confirmedValue={stats.loscamBlue.confirmed}
                    pendingValue={stats.loscamBlue.pending}
                    icon={Box}
                    color="bg-blue-600"
                    textColor="text-blue-600"
                    subtext="General"
                />
                <StatsCard
                    title="Loscam Yellow"
                    value={stats.loscamYellow.total}
                    confirmedValue={stats.loscamYellow.confirmed}
                    pendingValue={stats.loscamYellow.pending}
                    icon={Layers}
                    color="bg-amber-400"
                    textColor="text-amber-600"
                    subtext="Standard"
                />
                <StatsCard
                    title="HI-Q"
                    value={stats.hiq.total}
                    confirmedValue={stats.hiq.confirmed}
                    pendingValue={stats.hiq.pending}
                    icon={ShieldCheck}
                    color="bg-orange-500"
                    textColor="text-orange-600"
                    subtext="Special"
                />
                <StatsCard
                    title="พาเลทหมุนเวียน (ไม้/คละสี)"
                    value={stats.general.total}
                    confirmedValue={stats.general.confirmed}
                    pendingValue={stats.general.pending}
                    icon={Package}
                    color="bg-gray-400"
                    textColor="text-gray-600"
                    subtext="General"
                />
                <StatsCard
                    title="พาเลทพลาสติก"
                    value={stats.plastic.total}
                    confirmedValue={stats.plastic.confirmed}
                    pendingValue={stats.plastic.pending}
                    icon={Recycle}
                    color="bg-teal-500"
                    textColor="text-teal-600"
                    subtext="Circular"
                />
            </div>

            <StockVisualizer
                currentStock={Object.fromEntries(
                    Object.entries(stockOverview.confirmed).map(([k, v]) => [k, v + (stockOverview.pending[k] || 0)])
                )}
                totalStock={stats.totalStock}
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

export default Dashboard;
