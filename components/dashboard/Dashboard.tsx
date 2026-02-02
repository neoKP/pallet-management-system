import React, { useMemo } from 'react';
import {
    AlertCircle,
    Package,
    Flame,
    Box,
    Layers,
    ShieldCheck,
    Recycle
} from 'lucide-react';
import { Stock, BranchId, Transaction, User, PalletId } from '../../types';
import StatsCard from './StatsCard';
import StockVisualizer from './StockVisualizer';
import { BRANCHES, EXTERNAL_PARTNERS, PALLET_TYPES } from '../../constants';
import { getAgingRentalAnalysis } from '../../services/analyticsService';
import { useStock } from '../../contexts/StockContext';
import { NeoAIBriefing } from './NeoAIBriefing';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { format, subDays, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale';

interface DashboardProps {
    stock: Stock;
    selectedBranch: BranchId | 'ALL';
    transactions: Transaction[];
    addTransaction: (transaction: Partial<Transaction>) => void;
    currentUser: User | null;
}

const DashboardTrendChart = React.memo(({ transactions, selectedBranch }: { transactions: Transaction[], selectedBranch: string }) => {
    const data = useMemo(() => {
        const days = Array.from({ length: 14 }, (_, i) => subDays(new Date(), 13 - i));

        return days.map(date => {
            const dayTxs = transactions.filter(t =>
                isSameDay(new Date(t.date), date) &&
                (selectedBranch === 'ALL' || t.source === selectedBranch || t.dest === selectedBranch)
            );

            return {
                date: format(date, 'd MMM', { locale: th }),
                in: dayTxs.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.qty, 0),
                out: dayTxs.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.qty, 0),
            };
        });
    }, [transactions, selectedBranch]);

    return (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 mt-6 overflow-hidden">
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Package size={18} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-800">Movement Trend</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">แนวโน้มการเคลื่อนย้ายพาเลท (14 วันล่าสุด)</p>
                </div>
            </div>
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={data} accessibilityLayer>
                        <defs>
                            <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '1rem',
                                border: 'none',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                fontSize: '12px',
                                fontWeight: '900'
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="in"
                            stroke="#10b981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorIn)"
                            name="รับเข้า (IN)"
                        />
                        <Area
                            type="monotone"
                            dataKey="out"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorOut)"
                            name="จ่ายออก (OUT)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});

const Dashboard: React.FC<DashboardProps> = ({ stock, selectedBranch, transactions, currentUser }) => {
    const { thresholds } = useStock();
    const agingAnalysis = useMemo(() => getAgingRentalAnalysis(transactions), [transactions]);

    // DEBUG: Log HI-Q stock per branch to console
    React.useEffect(() => {
        console.log('=== DEBUG: HI-Q Stock Per Branch ===');
        const branches: BranchId[] = ['hub_nw', 'sai3', 'kpp', 'plk', 'cm', 'ekp', 'ms', 'maintenance_stock'];
        let totalHiq = 0;
        branches.forEach(branchId => {
            const hiqQty = stock[branchId]?.hiq || 0;
            totalHiq += hiqQty;
            console.log(`${branchId}: ${hiqQty} ตัว`);
        });
        console.log(`>>> TOTAL HI-Q (from stock state): ${totalHiq} ตัว`);
        console.log('=====================================');

        // Expose a global function to fix stock values
        (window as any).fixStock = async (branchId: string, palletId: string, newValue: number) => {
            try {
                const db = (window as any).firebase.database();
                const { ref, update } = (window as any).firebase.utils;
                const stockRef = ref(db, `stock/${branchId}`);
                await update(stockRef, { [palletId]: newValue });
                console.log(`✅ Updated ${branchId}/${palletId} to ${newValue}`);
                alert(`สำเร็จ! แก้ไข ${branchId} ${palletId} เป็น ${newValue} แล้ว`);
            } catch (err) {
                console.error('❌ Error updating stock:', err);
                alert('เกิดข้อผิดพลาด: ' + err);
            }
        };
        console.log('🔧 พิมพ์คำสั่งนี้เพื่อแก้ไขสต็อก: fixStock("sai3", "hiq", -308)');
    }, [stock]);

    const stockOverview = useMemo(() => {
        const confirmed: Record<string, number> = {};
        const pending: Record<string, number> = {};

        const activeBranchIds = BRANCHES.map(b => b.id);

        if (selectedBranch === 'ALL') {
            const allowedBranchIds = ['hub_nw', 'sai3', 'kpp', 'cm', 'plk', 'maintenance_stock', 'ekp', 'ms'];
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

            transactions.forEach(t => {
                if (t.status === 'PENDING' && allowedBranchIds.includes(t.dest)) {
                    pending[t.palletId] = (pending[t.palletId] || 0) + (t.qty as number);
                }
            });
        } else {
            const branchStock = stock[selectedBranch as BranchId] || {};
            Object.entries(branchStock).forEach(([pid, qty]) => {
                confirmed[pid] = qty as number;
            });

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
        let fleetTotal = 0;
        let fleetPending = 0;

        palletIds.forEach(pid => {
            const v = getVal(pid);
            result[pid] = v;

            // All pallets in this list are considered physical stock in branches
            fleetTotal += v.total;
            fleetPending += v.pending;
        });

        return {
            ...result,
            totalStock: fleetTotal,
            totalPending: fleetPending,
            loscamRed: result['loscam_red'],
            loscamYellow: result['loscam_yellow'],
            loscamBlue: result['loscam_blue'],
            hiq: result['hiq'],
            general: result['general'],
            plastic: result['plastic_circular']
        };
    }, [stockOverview]);

    const alerts = useMemo(() => {
        const activeAlerts: any[] = [];
        if (!thresholds) return activeAlerts;

        const branchThresholds = thresholds[selectedBranch === 'ALL' ? 'ALL' : selectedBranch];
        if (!branchThresholds) return activeAlerts;

        Object.entries(branchThresholds).forEach(([pId, limits]: [string, any]) => {
            const currentStats = stats[pId as keyof typeof stats] as any;
            const currentQty = currentStats?.total || 0;
            const palletInfo = PALLET_TYPES.find(p => p.id === pId);

            if (limits.max > 0 && currentQty > limits.max) {
                activeAlerts.push({
                    type: 'MAX',
                    palletName: palletInfo?.name || pId,
                    qty: currentQty,
                    limit: limits.max,
                    color: 'text-red-600',
                    bgColor: 'bg-red-50',
                    borderColor: 'border-red-200'
                });
            } else if (limits.min > 0 && currentQty < limits.min) {
                activeAlerts.push({
                    type: 'MIN',
                    palletName: palletInfo?.name || pId,
                    qty: currentQty,
                    limit: limits.min,
                    color: 'text-amber-600',
                    bgColor: 'bg-amber-50',
                    borderColor: 'border-amber-200'
                });
            }
        });

        return activeAlerts;
    }, [thresholds, selectedBranch, stats]);

    const handleExportPDF = async () => {
        try {
            // @ts-ignore
            const Swal = (await import('sweetalert2')).default;
            Swal.fire({ title: 'กำลัง Export PDF...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            const kpis = {
                totalTransactions: transactions.length,
                totalPalletsInStock: stats.totalStock,
                totalPalletsInTransit: stats.totalPending,
                totalMovements: transactions.reduce((sum, t) => sum + t.qty, 0),
                utilizationRate: 85, // Dummy for main dashboard
                maintenanceRate: 2.4, // Dummy
                trend: 'stable' as const,
                trendPercentage: 0
            };

            const { exportAnalyticsToPDF } = await import('../../utils/analyticsExport');
            await exportAnalyticsToPDF(
                // @ts-ignore
                kpis,
                'current',
                new Date(),
                new Date(),
                false // light mode for export
            );
            Swal.fire({ icon: 'success', title: 'Export สำเร็จ!', timer: 3000 });
        } catch (error) {
            console.error(error);
            // @ts-ignore
            const Swal = (await import('sweetalert2')).default;
            Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถ Export PDF ได้' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
                        Command <span className="text-indigo-600">Center</span>
                    </h1>
                    <p className="text-sm font-medium text-slate-500">Real-time Pallet Network Monitor & Control</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportPDF}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                    >
                        <AlertCircle className="w-3 h-3" /> นำออก (Export PDF)
                    </button>
                </div>
            </div>

            {alerts.length > 0 && (
                <div className="space-y-3">
                    {alerts.map((alert, idx) => (
                        <div key={idx} className={`${alert.bgColor} border ${alert.borderColor} rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2`}>
                            <AlertCircle className={alert.color} />
                            <div>
                                <h3 className={`${alert.color.replace('text-', 'text-')} font-bold`}>
                                    แจ้งเตือนระดับสต็อก ({alert.type === 'MAX' ? 'เกินกำหนด' : 'ต่ำกว่าเกณฑ์'})
                                </h3>
                                <p className={`${alert.color} text-sm mt-1 font-medium`}>
                                    พาเลท {alert.palletName} ปัจจุบันมี {alert.qty} ตัว
                                    {alert.type === 'MAX'
                                        ? ` (สูงกว่าค่า Max ที่ตั้งไว้ ${alert.limit} ตัว)`
                                        : ` (ต่ำกว่าค่า Min ที่ตั้งไว้ ${alert.limit} ตัว)`}
                                    กรุณาตรวจสอบและดำเนินการ
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}


            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                <StatsCard
                    title="ยอดรวมสต็อกในสาขา (Fleet)"
                    value={stats.totalStock}
                    confirmedValue={stats.totalStock - stats.totalPending}
                    pendingValue={stats.totalPending}
                    icon={Package}
                    color="bg-slate-900"
                    textColor="text-slate-900"
                    subtext="Excluding Partner Balances"
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
                    alert={alerts.some(a => a.palletName.includes('Red'))}
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
                    title="HI-Q (ในสาขา)"
                    value={stats.hiq.total}
                    confirmedValue={stats.hiq.confirmed}
                    pendingValue={stats.hiq.pending}
                    icon={ShieldCheck}
                    color="bg-orange-500"
                    textColor="text-orange-600"
                    subtext={stats.hiq.total < 0 ? "⚠️ มีการส่งคืนมากกว่ารับเข้า" : "Physical Stock"}
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

            <DashboardTrendChart transactions={transactions} selectedBranch={selectedBranch} />

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800">Executive Partner Summary</h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">สรุปยอดค้างและเรทค่าเช่าปัจจุบัน</p>
                        </div>
                    </div>
                </div>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                                <th className="p-4 text-left font-black uppercase tracking-widest text-[10px]">คู่ค้า (Partner)</th>
                                <th className="p-4 text-center font-black uppercase tracking-widest text-[10px]">สต็อกคงเหลือ (ยอดต้องคืน)</th>
                                <th className="p-4 text-center font-black uppercase tracking-widest text-[10px]">เรทราคาปัจจุบัน</th>
                                <th className="p-4 text-left font-black uppercase tracking-widest text-[10px]">หมายเหตุ / สถานะ (Status)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {['loscam_wangnoi', 'sino', 'lamsoon', 'ufc', 'loxley', 'kopee', 'hiq_th'].map(partnerId => {
                                const partner = [...EXTERNAL_PARTNERS, { id: 'loscam_wangnoi', name: 'Loscam (Main Account)', type: 'provider' }].find(p => p.id === partnerId);
                                if (!partner) return null;

                                const partnerPallets = Object.entries(agingAnalysis.partnerSummaries)
                                    .filter(([key]) => key.startsWith(partnerId + '_'))
                                    .map(([, s]) => s);

                                const totalDebt = partnerPallets.reduce((sum, s) => sum + (s.openQty || 0), 0);
                                const totalRent = partnerPallets.reduce((sum, s) => sum + (s.rent || 0), 0);
                                const maxRate = Math.max(...partnerPallets.map(s => s.currentRate || 0), 0);

                                return (
                                    <tr key={partnerId} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-black text-slate-900">{partnerId === 'loscam_wangnoi' ? 'Loscam (Main Account)' : partner.name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">
                                                {partnerId === 'loscam_wangnoi' ? 'Aggregated Account' :
                                                    partnerId === 'sino' ? 'ยืมใช้ / คืนตามกำหนด' : 'ส่วนงานลูกค้า (Customer)'}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`text-xl font-black ${totalDebt !== 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                                                {totalDebt.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] ml-1 font-bold text-slate-400">ตัว</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {totalRent > 0 ? (
                                                <div className="inline-flex items-center px-3 py-1 bg-red-50 text-red-700 rounded-full font-black text-xs">
                                                    ฿{totalRent.toLocaleString()}
                                                </div>
                                            ) : partnerId === 'loscam_wangnoi' ? (
                                                <div className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-black text-xs">
                                                    ฿{maxRate.toFixed(2)} / วัน
                                                </div>
                                            ) : partnerId === 'sino' ? (
                                                <div className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-black text-xs">
                                                    ฟรี (10 วัน)
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-500 rounded-full font-black text-xs">
                                                    ไม่มีค่าเช่า
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1">
                                                {partnerPallets.length > 0 ? partnerPallets.map((s, idx) => (
                                                    <span key={idx} className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${s.openQty !== 0 ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-300'}`}>
                                                        {s.palletId.replace('loscam_', '').toUpperCase()}: {s.openQty} ตัว
                                                    </span>
                                                )) : <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Normal (No Debt)</span>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {['loscam_wangnoi', 'sino', 'lamsoon', 'ufc', 'loxley', 'kopee', 'hiq_th'].map(partnerId => {
                        const partner = [...EXTERNAL_PARTNERS, { id: 'loscam_wangnoi', name: 'Loscam (Main Account)', type: 'provider' }].find(p => p.id === partnerId);
                        if (!partner) return null;

                        const partnerPallets = Object.entries(agingAnalysis.partnerSummaries)
                            .filter(([key]) => key.startsWith(partnerId + '_'))
                            .map(([, s]) => s);

                        const totalDebt = partnerPallets.reduce((sum, s) => sum + (s.openQty || 0), 0);
                        const totalRent = partnerPallets.reduce((sum, s) => sum + (s.rent || 0), 0);
                        const maxRate = Math.max(...partnerPallets.map(s => s.currentRate || 0), 0);

                        return (
                            <div key={partnerId} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="font-black text-slate-900 text-sm">{partnerId === 'loscam_wangnoi' ? 'Loscam (Main Account)' : partner.name}</div>
                                        <div className="text-[9px] text-slate-400 font-bold uppercase">
                                            {partnerId === 'loscam_wangnoi' ? 'Aggregated' : partnerId === 'sino' ? 'Sino Pacific' : 'Customer'}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-lg font-black ${totalDebt !== 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                                            {totalDebt.toLocaleString()}
                                            <span className="text-[10px] ml-1 font-bold text-slate-400 uppercase">Qty</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-[10px] font-bold text-slate-400">Current Rate:</div>
                                    {totalRent > 0 ? (
                                        <div className="px-3 py-1 bg-red-50 text-red-700 rounded-full font-black text-xs">
                                            ฿{totalRent.toLocaleString()}
                                        </div>
                                    ) : partnerId === 'loscam_wangnoi' ? (
                                        <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-black text-xs">
                                            ฿{maxRate.toFixed(2)}/Day
                                        </div>
                                    ) : (
                                        <div className="px-3 py-1 bg-slate-200 text-slate-500 rounded-full font-black text-xs">
                                            {partnerId === 'sino' ? 'Free 10D' : 'No Rental'}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {partnerPallets.map((s, idx) => (
                                        <span key={idx} className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${s.openQty !== 0 ? 'bg-white text-slate-600 border border-slate-100' : 'bg-transparent text-slate-300'}`}>
                                            {s.palletId.replace('loscam_', '').toUpperCase()}: {s.openQty}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

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
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
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
                                .filter(b => ['hub_nw', 'sai3', 'kpp', 'cm', 'plk', 'maintenance_stock', 'ekp', 'ms'].includes(b.id))
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

                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                    {BRANCHES
                        .filter(b => ['hub_nw', 'sai3', 'kpp', 'cm', 'plk', 'maintenance_stock', 'ekp', 'ms'].includes(b.id))
                        .map(branch => {
                            const branchStock = stock[branch.id] || {};
                            const getQty = (id: PalletId) => branchStock[id] || 0;
                            const total = getQty('loscam_red') + getQty('loscam_yellow') + getQty('loscam_blue') +
                                getQty('hiq') + getQty('general') + getQty('plastic_circular');

                            return (
                                <div key={branch.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-bold text-slate-900">{branch.name}</span>
                                        <span className="px-3 py-1 bg-white rounded-full text-xs font-black text-slate-800 shadow-sm border border-slate-100">
                                            Total: {total}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="text-center p-2 bg-white rounded-lg border border-slate-50">
                                            <div className="text-[9px] font-bold text-red-500 uppercase">RED</div>
                                            <div className="text-sm font-black text-slate-700">{getQty('loscam_red')}</div>
                                        </div>
                                        <div className="text-center p-2 bg-white rounded-lg border border-slate-50">
                                            <div className="text-[9px] font-bold text-amber-500 uppercase">YEL</div>
                                            <div className="text-sm font-black text-slate-700">{getQty('loscam_yellow')}</div>
                                        </div>
                                        <div className="text-center p-2 bg-white rounded-lg border border-slate-50">
                                            <div className="text-[9px] font-bold text-blue-500 uppercase">BLU</div>
                                            <div className="text-sm font-black text-slate-700">{getQty('loscam_blue')}</div>
                                        </div>
                                        <div className="text-center p-2 bg-white rounded-lg border border-slate-50">
                                            <div className="text-[9px] font-bold text-orange-500 uppercase">HIQ</div>
                                            <div className="text-sm font-black text-slate-700">{getQty('hiq')}</div>
                                        </div>
                                        <div className="text-center p-2 bg-white rounded-lg border border-slate-50">
                                            <div className="text-[9px] font-bold text-slate-500 uppercase">GEN</div>
                                            <div className="text-sm font-black text-slate-700">{getQty('general')}</div>
                                        </div>
                                        <div className="text-center p-2 bg-white rounded-lg border border-slate-50">
                                            <div className="text-[9px] font-bold text-teal-500 uppercase">PLA</div>
                                            <div className="text-sm font-black text-slate-700">{getQty('plastic_circular')}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>

            <StockVisualizer
                currentStock={Object.fromEntries(
                    Object.entries(stockOverview.confirmed).map(([k, v]) => [k, v + (stockOverview.pending[k] || 0)])
                )}
                totalStock={stats.totalStock}
            />
        </div >
    );
};

export default Dashboard;
