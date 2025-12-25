import React, { useMemo, useState } from 'react';
import {
    AlertCircle,
    Package,
    Flame,
    Box,
    Layers,
    BarChart3,
    History as HistoryIcon,
    Download,
    Clock,
    Trash2
} from 'lucide-react';
import { Stock, BranchId, Transaction, PalletId, User } from '../../types';
import { useStock } from '../../contexts/StockContext';
import StatsCard from './StatsCard';
import StockAdjustmentModal from './StockAdjustmentModal';
import TransactionTimelineModal from '../movements/TransactionTimelineModal';
import * as XLSX from 'xlsx';

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
    const [timelineTx, setTimelineTx] = useState<Transaction | null>(null);
    const [isTimelineOpen, setIsTimelineOpen] = useState(false);

    const handleViewTimeline = (tx: Transaction) => {
        setTimelineTx(tx);
        setIsTimelineOpen(true);
    };

    const handleDelete = (txId: number) => {
        // @ts-ignore
        const Swal = window.Swal;
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
        } else {
            if (confirm('ยืนยันการลบรายการ?')) {
                deleteTransaction(txId);
            }
        }
    };

    const currentStock = useMemo(() => {
        if (selectedBranch === 'ALL') {
            const total: Record<string, number> = {};
            Object.values(stock).forEach(branchStock => {
                Object.entries(branchStock).forEach(([pid, qty]) => {
                    total[pid] = (total[pid] || 0) + (qty as number);
                });
            });
            return total;
        }
        return stock[selectedBranch as BranchId] || {};
    }, [stock, selectedBranch]);

    const stats = useMemo(() => {
        const totalStock = Object.values(currentStock).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
        const loscamRed = currentStock['loscam_red'] || 0;
        const loscamYellow = currentStock['loscam_yellow'] || 0;
        const loscamBlue = currentStock['loscam_blue'] || 0;
        return { totalStock, loscamRed, loscamYellow, loscamBlue };
    }, [currentStock]);

    const displayTransactions = useMemo(() => {
        let filtered = [...transactions];
        if (selectedBranch !== 'ALL') {
            filtered = filtered.filter(t => t.source === selectedBranch || t.dest === selectedBranch);
        }
        return filtered
            // Show both COMPLETED and PENDING to allow tracking status
            .sort((a, b) => b.id - a.id);
    }, [transactions, selectedBranch]);

    const isRedAlert = stats.loscamRed > 500;

    // Extracted styles to avoid inline style warnings
    const redBarStyle = { '--bar-width': `${stats.totalStock > 0 ? (stats.loscamRed / stats.totalStock) * 100 : 0}%` } as React.CSSProperties;
    const yellowBarStyle = { '--bar-width': `${stats.totalStock > 0 ? (stats.loscamYellow / stats.totalStock) * 100 : 0}%` } as React.CSSProperties;
    const blueBarStyle = { '--bar-width': `${stats.totalStock > 0 ? (stats.loscamBlue / stats.totalStock) * 100 : 0}%` } as React.CSSProperties;

    const handleExport = () => {
        const data = displayTransactions.map(t => ({
            Date: t.date,
            DocNo: t.docNo,
            Type: t.type,
            Source: t.source,
            Destination: t.dest,
            Pallet: t.palletId,
            Qty: t.qty,
            Note: t.note || '',
            RefDoc: t.referenceDocNo || '',
            CarReg: t.carRegistration || '',
            Driver: t.driverName || '',
            TransCo: t.transportCompany || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Transactions");
        XLSX.writeFile(wb, `inventory_log_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleAdjustmentSubmit = (data: { type: 'IN' | 'OUT'; branchId: string; palletId: PalletId; qty: number; note: string }) => {
        addTransaction({
            type: 'ADJUST',
            source: data.type === 'IN' ? 'ADJUSTMENT' : data.branchId,
            dest: data.type === 'IN' ? data.branchId : 'ADJUSTMENT',
            palletId: data.palletId,
            qty: data.qty,
            note: data.note,
            status: 'COMPLETED'
        });
    };

    return (
        <div className="space-y-6">
            {/* Modal */}
            <StockAdjustmentModal
                isOpen={isAdjModalOpen}
                onClose={() => setIsAdjModalOpen(false)}
                onSubmit={handleAdjustmentSubmit}
                currentBranch={selectedBranch}
            />

            {/* 1. Alert Banner (Top Priority) */}
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

            {/* 2. Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                    title="Loscam Yellow"
                    value={stats.loscamYellow}
                    icon={Layers}
                    color="bg-amber-400"
                    textColor="text-amber-600"
                    subtext="Standard"
                />
                <StatsCard
                    title="Loscam Blue"
                    value={stats.loscamBlue}
                    icon={Box}
                    color="bg-blue-600"
                    textColor="text-blue-600"
                    subtext="General"
                />
            </div>

            {/* 3. Stock Visualizer (Chart) - Simplified Bar */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-6">
                    <BarChart3 className="text-slate-400" size={20} />
                    <h2 className="text-lg font-black text-slate-800">ภาพรวมสต็อก (Stock Visualizer)</h2>
                </div>

                {/* Visual Bars */}
                <div className="space-y-4">
                    {/* Red */}
                    <div>
                        <div className="flex justify-between text-sm font-bold mb-1">
                            <span className="text-slate-600 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span> Loscam Red
                            </span>
                            <span className="text-slate-900">{stats.loscamRed}</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            {/* eslint-disable-next-line */}
                            <div className="h-full bg-red-500 rounded-full transition-all duration-1000 w-[var(--bar-width)]" {...{ style: redBarStyle }}></div>
                        </div>
                    </div>
                    {/* Yellow */}
                    <div>
                        <div className="flex justify-between text-sm font-bold mb-1">
                            <span className="text-slate-600 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-400"></span> Loscam Yellow
                            </span>
                            <span className="text-slate-900">{stats.loscamYellow}</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            {/* eslint-disable-next-line */}
                            <div className="h-full bg-amber-400 rounded-full transition-all duration-1000 w-[var(--bar-width)]" {...{ style: yellowBarStyle }}></div>
                        </div>
                    </div>
                    {/* Blue */}
                    <div>
                        <div className="flex justify-between text-sm font-bold mb-1">
                            <span className="text-slate-600 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Loscam Blue
                            </span>
                            <span className="text-slate-900">{stats.loscamBlue}</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            {/* eslint-disable-next-line */}
                            <div className="h-full bg-blue-500 rounded-full transition-all duration-1000 w-[var(--bar-width)]" {...{ style: blueBarStyle }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Transactions List (Inventory Tracking) */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <HistoryIcon className="text-slate-400" size={20} />
                        <h2 className="text-lg font-black text-slate-800">Inventory Tracking System</h2>
                    </div>
                    <div className="flex gap-2">
                        {currentUser?.role === 'ADMIN' && (
                            <button
                                onClick={() => setIsAdjModalOpen(true)}
                                className="px-3 py-1.5 text-xs font-bold bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                            >
                                ปรับปรุงยอด (Adj)
                            </button>
                        )}
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                        >
                            <Download size={14} /> Export Excel
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                            <tr>
                                <th className="p-4">Date/Time</th>
                                <th className="p-4">Doc No.</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Reference</th>
                                <th className="p-4">Transport</th>
                                <th className="p-4">Details</th>
                                <th className="p-4 text-center">รับ (In)</th>
                                <th className="p-4 text-center">จ่าย (Out)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {displayTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-400">No transactions found.</td>
                                </tr>
                            ) : (
                                displayTransactions.map((tx) => {
                                    const isAdjustment = tx.type === 'ADJUST';
                                    let qtyIn, qtyOut;

                                    if (isAdjustment) {
                                        // If ADJUST, infer IN/OUT based on source
                                        if (tx.source === 'ADJUSTMENT' || tx.source === 'SYSTEM_ADJUST' || tx.source === 'SYSTEM') {
                                            qtyIn = tx.qty;
                                            qtyOut = '-';
                                        } else {
                                            qtyIn = '-';
                                            qtyOut = tx.qty;
                                        }
                                    } else {
                                        qtyIn = (tx.type === 'IN' || tx.type === 'EXT-IN' as any) ? tx.qty : '-'; // EXT-IN handled by generic type match usually? Type is just string in DB sometimes. Using strict checks.
                                        // Wait, simple check: is dest the current branch?
                                        // But table shows GLOBAL transactions if ALL selected?
                                        // Logic: "IN" column means ADDED to the RELEVANT branch (Source->Dest).
                                        // Actually, standard: IN type = In. OUT type = Out.
                                        // ADJUST type: ?
                                        qtyIn = (tx.type === 'IN') ? tx.qty : '-';
                                        qtyOut = (tx.type === 'OUT') ? tx.qty : '-';
                                    }

                                    // Better visual logic for ADJUST
                                    if (tx.type === 'ADJUST') {
                                        // If generated by this tool, we look at source.
                                        if (tx.source === 'ADJUSTMENT') {
                                            qtyIn = tx.qty;
                                            qtyOut = '-';
                                        } else {
                                            qtyIn = '-';
                                            qtyOut = tx.qty;
                                        }
                                    }

                                    const isCancelled = tx.status === 'CANCELLED';

                                    return (
                                        <tr key={tx.docNo + tx.id} className={`transition-colors ${isCancelled ? 'bg-red-50/30' : 'hover:bg-slate-50/50'}`}>
                                            <td className={`p-4 text-slate-500 whitespace-nowrap ${isCancelled ? 'line-through decoration-red-300 opacity-60' : ''}`}>
                                                {new Date(tx.date).toLocaleDateString('th-TH')}
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className={`font-mono font-medium ${isCancelled ? 'text-slate-400 line-through decoration-red-300' : 'text-blue-600'}`}>
                                                        {tx.docNo}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleViewTimeline(tx)}
                                                            className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded border border-slate-200 hover:border-blue-200 text-[10px] font-bold transition-all flex items-center gap-1"
                                                            title="View Timeline"
                                                        >
                                                            <Clock size={10} /> Timeline
                                                        </button>
                                                        {currentUser?.role === 'ADMIN' && !isCancelled && (
                                                            <button
                                                                onClick={() => handleDelete(tx.id)}
                                                                className="p-1 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded border border-slate-200 hover:border-red-200 transition-colors"
                                                                title="Delete Transaction"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={`p-4 text-slate-900 font-bold whitespace-nowrap ${isCancelled ? 'opacity-50' : ''}`}>
                                                {isCancelled ? (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] bg-red-100 text-red-600 font-black">
                                                        CANCELLED
                                                    </span>
                                                ) : (
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] ${tx.type === 'IN' ? 'bg-emerald-100 text-emerald-700' :
                                                        tx.type === 'OUT' ? 'bg-orange-100 text-orange-700' :
                                                            tx.type === 'ADJUST' ? 'bg-amber-100 text-amber-700' :
                                                                'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {tx.type}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`p-4 text-slate-600 ${isCancelled ? 'line-through opacity-50' : ''}`}>
                                                {tx.referenceDocNo || '-'}
                                            </td>
                                            <td className={`p-4 text-slate-600 text-xs ${isCancelled ? 'line-through opacity-50' : ''}`}>
                                                <div className="flex flex-col gap-0.5">
                                                    {tx.carRegistration && <span className="font-bold">{tx.carRegistration}</span>}
                                                    {tx.driverName && <span>{tx.driverName}</span>}
                                                    {tx.transportCompany && <span className="text-[10px] text-slate-400">{tx.transportCompany}</span>}
                                                </div>
                                            </td>
                                            <td className={`p-4 text-slate-600 ${isCancelled ? 'line-through opacity-50' : ''}`}>
                                                <div className="font-medium text-slate-800">{tx.palletId}</div>
                                                <div className="text-xs text-slate-400">
                                                    {tx.source} <span className="mx-1">→</span> {tx.dest}
                                                </div>
                                                {tx.note && <div className="text-[10px] text-slate-400 mt-1 italic">"{tx.note}"</div>}
                                            </td>
                                            <td className={`p-4 text-center font-black ${isCancelled ? 'text-slate-400 line-through opacity-50' : 'text-emerald-600 bg-emerald-50/30'}`}>
                                                {qtyIn}
                                            </td>
                                            <td className={`p-4 text-center font-black ${isCancelled ? 'text-slate-400 line-through opacity-50' : 'text-red-600 bg-red-50/30'}`}>
                                                {qtyOut}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {timelineTx && (
                <TransactionTimelineModal
                    isOpen={isTimelineOpen}
                    onClose={() => setIsTimelineOpen(false)}
                    transaction={timelineTx}
                />
            )}
        </div>
    );
};

export default Dashboard;
