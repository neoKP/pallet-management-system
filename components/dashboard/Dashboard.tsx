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

    const currentStock = useMemo(() => {
        if (selectedBranch === 'ALL') {
            const total: Record<string, number> = {};
            const activeBranchIds = BRANCHES.map(b => b.id);

            activeBranchIds.forEach(branchId => {
                const branchStock = stock[branchId];
                if (branchStock) {
                    Object.entries(branchStock).forEach(([pid, qty]) => {
                        total[pid] = (total[pid] || 0) + (qty as number);
                    });
                }
            });

            transactions.forEach(t => {
                if (t.status === 'PENDING') {
                    total[t.palletId] = (total[t.palletId] || 0) + (t.qty as number);
                }
            });

            return total;
        }
        return stock[selectedBranch as BranchId] || {};
    }, [stock, selectedBranch, transactions]);

    const stats = useMemo(() => {
        const totalStock = Object.values(currentStock).reduce((a: number, b) => a + (typeof b === 'number' ? b : 0), 0);
        const loscamRed = (currentStock['loscam_red'] as number) || 0;
        const loscamYellow = (currentStock['loscam_yellow'] as number) || 0;
        const loscamBlue = (currentStock['loscam_blue'] as number) || 0;
        const hiq = (currentStock['hiq'] as number) || 0;
        const general = (currentStock['general'] as number) || 0;
        const plastic = (currentStock['plastic_circular'] as number) || 0;
        return { totalStock, loscamRed, loscamYellow, loscamBlue, hiq, general, plastic };
    }, [currentStock]);

    const displayTransactions = useMemo(() => {
        let filtered = [...transactions];
        if (selectedBranch !== 'ALL') {
            filtered = filtered.filter(t => t.source === selectedBranch || t.dest === selectedBranch);
        }
        return filtered.sort((a, b) => b.id - a.id);
    }, [transactions, selectedBranch]);

    const isRedAlert = stats.loscamRed > 500;

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
                            พาเลท Loscam Red มีจำนวนสูงเกินมาตรฐาน ({stats.loscamRed} units). กรุณาตรวจสอบหรือระบายออก
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                <StatsCard
                    title="ยอดรวมทั้งสิ้น"
                    value={stats.totalStock}
                    icon={Package}
                    color="bg-slate-900"
                    textColor="text-slate-900"
                    subtext="All Pallets"
                />
                <StatsCard
                    title="Loscam Red"
                    value={stats.loscamRed}
                    icon={Flame}
                    color="bg-red-600"
                    textColor="text-red-600"
                    subtext="Critical"
                    alert={isRedAlert}
                />
                <StatsCard
                    title="Loscam Blue"
                    value={stats.loscamBlue}
                    icon={Box}
                    color="bg-blue-600"
                    textColor="text-blue-600"
                    subtext="General"
                />
                <StatsCard
                    title="Loscam Yellow"
                    value={stats.loscamYellow}
                    icon={Layers}
                    color="bg-amber-400"
                    textColor="text-amber-600"
                    subtext="Standard"
                />
                <StatsCard
                    title="HI-Q"
                    value={stats.hiq}
                    icon={ShieldCheck}
                    color="bg-orange-500"
                    textColor="text-orange-600"
                    subtext="Special"
                />
                <StatsCard
                    title="พาเลทหมุนเวียน (ไม้/คละสี)"
                    value={stats.general}
                    icon={Package}
                    color="bg-gray-400"
                    textColor="text-gray-600"
                    subtext="General"
                />
                <StatsCard
                    title="พาเลทพลาสติก"
                    value={stats.plastic}
                    icon={Recycle}
                    color="bg-teal-500"
                    textColor="text-teal-600"
                    subtext="Circular"
                />
            </div>

            <StockVisualizer
                currentStock={currentStock}
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
