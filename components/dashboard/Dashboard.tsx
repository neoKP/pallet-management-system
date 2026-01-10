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
            // Filter specific branches for 'ALL' view (Northern Group + Maintenance + EKP)
            const allowedBranchIds = ['hub_nw', 'kpp', 'cm', 'plk', 'maintenance_stock', 'ekp', 'ms'];

            // Calculate Sum of specific Branch Stocks
            activeBranchIds.forEach(branchId => {
                if (allowedBranchIds.includes(branchId)) {
                    const branchStock = stock[branchId];
                    if (branchStock) {
                        Object.entries(branchStock).forEach(([pid, qty]) => {
                            confirmed[pid] = (confirmed[pid] || 0) + (qty as number);
                        });
                    }
                }
            });

            // Calculate Sum of PENDING transactions (In-Transit) destined for these branches
            transactions.forEach(t => {
                if (t.status === 'PENDING' && allowedBranchIds.includes(t.dest)) {
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

            {selectedBranch === 'ALL' && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Layers size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800">Branch Stock Breakdown</h3>
                            <p className="text-sm text-slate-500">รายละเอียดสต็อกรายสาขา (Detailed Stock per Branch)</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                                    <th className="p-4 text-left font-bold rounded-tl-xl">Branch Name</th>
                                    <th className="p-4 text-center font-bold text-red-600">Loscam Red</th>
                                    <th className="p-4 text-center font-bold text-amber-500">Loscam Yellow</th>
                                    <th className="p-4 text-center font-bold text-blue-600">Loscam Blue</th>
                                    <th className="p-4 text-center font-bold text-orange-500">HI-Q</th>
                                    <th className="p-4 text-center font-bold text-slate-600">General</th>
                                    <th className="p-4 text-center font-bold text-teal-600 rounded-tr-xl">Plastic</th>
                                    <th className="p-4 text-center font-black text-slate-800">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {BRANCHES
                                    .filter(b => ['hub_nw', 'kpp', 'cm', 'plk', 'maintenance_stock', 'ekp', 'ms'].includes(b.id))
                                    .map(branch => {
                                        const branchStock = stock[branch.id] || {};
                                        const getQty = (id: PalletId) => branchStock[id] || 0;
                                        const total = getQty('loscam_red') + getQty('loscam_yellow') + getQty('loscam_blue') +
                                            getQty('hiq') + getQty('general') + getQty('plastic_circular');

                                        return (
                                            <tr key={branch.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="p-4 font-bold text-slate-800 border-r border-slate-50">{branch.name}</td>
                                                <td className="p-4 text-center font-mono text-slate-600">{getQty('loscam_red')}</td>
                                                <td className="p-4 text-center font-mono text-slate-600">{getQty('loscam_yellow')}</td>
                                                <td className="p-4 text-center font-mono text-slate-600">{getQty('loscam_blue')}</td>
                                                <td className="p-4 text-center font-mono text-slate-600">{getQty('hiq')}</td>
                                                <td className="p-4 text-center font-mono text-slate-600">{getQty('general')}</td>
                                                <td className="p-4 text-center font-mono text-slate-600">{getQty('plastic_circular')}</td>
                                                <td className="p-4 text-center font-black text-slate-900 bg-slate-50/50">{total}</td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                            <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-200">
                                <tr>
                                    <td className="p-4 text-right">GRAND TOTAL</td>
                                    <td className="p-4 text-center">{stats.loscamRed.confirmed}</td>
                                    <td className="p-4 text-center">{stats.loscamYellow.confirmed}</td>
                                    <td className="p-4 text-center">{stats.loscamBlue.confirmed}</td>
                                    <td className="p-4 text-center">{stats.hiq.confirmed}</td>
                                    <td className="p-4 text-center">{stats.general.confirmed}</td>
                                    <td className="p-4 text-center">{stats.plastic.confirmed}</td>
                                    <td className="p-4 text-center">{stats.totalStock - stats.totalPending}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

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
