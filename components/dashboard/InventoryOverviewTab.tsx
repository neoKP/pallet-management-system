import React, { useMemo, useState } from 'react';
import { AlertCircle, Package, ShieldCheck, Scale } from 'lucide-react';
import { BranchId, Stock, Transaction, User } from '../../types';
import { BRANCHES, PALLET_TYPES, EXTERNAL_PARTNERS } from '../../constants';
import StatsCard from './StatsCard';
import { useStock } from '../../contexts/StockContext';
import { getAgingRentalAnalysis } from '../../services/analyticsService';

interface InventoryOverviewTabProps {
  stock: Stock;
  selectedBranch: BranchId | 'ALL';
  transactions: Transaction[];
  currentUser: User | null;
}

export const InventoryOverviewTab: React.FC<InventoryOverviewTabProps> = ({
  stock,
  selectedBranch,
  transactions,
}) => {
  const { thresholds } = useStock();
  const agingAnalysis = useMemo(() => getAgingRentalAnalysis(transactions), [transactions]);
  const [viewTab, setViewTab] = useState<'stock' | 'executive' | 'difference'>('stock');

  const stockOverview = useMemo(() => {
    const confirmed: Record<string, number> = {};
    const pending: Record<string, number> = {};

    const activeBranchIds = BRANCHES.map(b => b.id);

    if (selectedBranch === 'ALL') {
      const allowedBranchIds = ['hub_nw', 'sai3', 'kpp', 'cm', 'plk', 'maintenance_stock', 'scrap_stock', 'ekp', 'ms'];
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

    const result: any = {};
    let fleetTotal = 0;
    let fleetPending = 0;

    PALLET_TYPES.forEach(pt => {
      const v = getVal(pt.id);
      result[pt.id] = v;
      fleetTotal += v.total;
      fleetPending += v.pending;
    });

    return {
      ...result,
      totalStock: fleetTotal,
      totalPending: fleetPending,
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

  const execTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.values(agingAnalysis.partnerSummaries || {}).forEach((s: any) => {
      if (s.palletId) {
        totals[s.palletId] = (totals[s.palletId] || 0) + (s.openQty || 0);
      }
    });
    return totals;
  }, [agingAnalysis]);

  const diffRows = useMemo(() => {
    return PALLET_TYPES.map(pt => {
      const stockTotal = (stats[pt.id] as any)?.total || 0;
      const execTotal = execTotals[pt.id] || 0;
      const diff = stockTotal + execTotal;
      return { ...pt, stockTotal, execTotal, diff };
    });
  }, [execTotals, stats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-1">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Inventory Overview</h1>
          <p className="text-sm font-medium text-slate-500">ดูยอด Physical Stock (รวมระหว่างทาง)</p>
        </div>
        <div className="flex gap-2 bg-white/80 backdrop-blur rounded-full p-1 border border-slate-200 shadow-sm w-full md:w-auto">
          {[
            { id: 'stock', label: 'Stock Overview' },
            { id: 'executive', label: 'Executive Summary' },
            { id: 'difference', label: 'Difference' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setViewTab(t.id as 'stock' | 'executive' | 'difference')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${viewTab === t.id
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {viewTab === 'difference' ? (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Scale size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Difference (Stock − Executive)</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">ส่วนต่างต่อชนิดพาเลท: Stock Overview ลบ Executive Partner Summary</p>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                  <th className="p-3 text-left font-black uppercase tracking-widest text-[10px]">ชนิดพาเลท</th>
                  <th className="p-3 text-center font-black uppercase tracking-widest text-[10px]">Stock Overview (รวม Pending)</th>
                  <th className="p-3 text-center font-black uppercase tracking-widest text-[10px]">Executive Summary (ยอดค้าง)</th>
                  <th className="p-3 text-center font-black uppercase tracking-widest text-[10px]">ส่วนต่าง (Stock − Exec)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {diffRows.map(row => {
                  const diffColor = row.diff > 0
                    ? 'text-emerald-600'
                    : row.diff < 0
                    ? 'text-red-600'
                    : 'text-slate-400';
                  const diffBg = row.diff > 0
                    ? 'bg-emerald-50'
                    : row.diff < 0
                    ? 'bg-red-50'
                    : 'bg-slate-50';
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full inline-block ${row.color}`} />
                          <div>
                            <div className="font-black text-slate-900">{row.name}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{row.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-black text-slate-900">{row.stockTotal.toLocaleString()}</span>
                        <span className="text-[10px] ml-1 font-bold text-slate-400">ตัว</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-black text-slate-700">{row.execTotal.toLocaleString()}</span>
                        <span className="text-[10px] ml-1 font-bold text-slate-400">ตัว</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full font-black text-sm ${diffBg} ${diffColor}`}>
                          {row.diff > 0 ? '+' : ''}{row.diff.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="p-3 font-black text-slate-800 text-[11px] uppercase tracking-widest">รวมทั้งหมด</td>
                  <td className="p-3 text-center font-black text-slate-900">
                    {diffRows.reduce((s, r) => s + r.stockTotal, 0).toLocaleString()}
                    <span className="text-[10px] ml-1 font-bold text-slate-400">ตัว</span>
                  </td>
                  <td className="p-3 text-center font-black text-slate-700">
                    {diffRows.reduce((s, r) => s + r.execTotal, 0).toLocaleString()}
                    <span className="text-[10px] ml-1 font-bold text-slate-400">ตัว</span>
                  </td>
                  <td className="p-3 text-center">
                    {(() => {
                      const totalDiff = diffRows.reduce((s, r) => s + r.diff, 0);
                      const totalColor = totalDiff > 0 ? 'text-emerald-600 bg-emerald-50' : totalDiff < 0 ? 'text-red-600 bg-red-50' : 'text-slate-400 bg-slate-50';
                      return (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full font-black text-sm ${totalColor}`}>
                          {totalDiff > 0 ? '+' : ''}{totalDiff.toLocaleString()}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {diffRows.map(row => {
              const diffColor = row.diff > 0
                ? 'text-emerald-600'
                : row.diff < 0
                ? 'text-red-600'
                : 'text-slate-400';
              return (
                <div key={row.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full inline-block ${row.color}`} />
                      <div>
                        <div className="font-black text-slate-900 text-sm">{row.name}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase">{row.id}</div>
                      </div>
                    </div>
                    <div className={`text-xl font-black ${diffColor}`}>
                      {row.diff > 0 ? '+' : ''}{row.diff.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Stock: <strong className="text-slate-800">{row.stockTotal.toLocaleString()}</strong></span>
                    <span>Executive: <strong className="text-slate-800">{row.execTotal.toLocaleString()}</strong></span>
                  </div>
                </div>
              );
            })}
            <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center">
                <div className="font-black text-slate-700 text-sm uppercase tracking-widest">รวมทั้งหมด</div>
                {(() => {
                  const totalDiff = diffRows.reduce((s, r) => s + r.diff, 0);
                  const totalColor = totalDiff > 0 ? 'text-emerald-600' : totalDiff < 0 ? 'text-red-600' : 'text-slate-400';
                  return <div className={`text-xl font-black ${totalColor}`}>{totalDiff > 0 ? '+' : ''}{totalDiff.toLocaleString()}</div>;
                })()}
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>Stock: <strong className="text-slate-800">{diffRows.reduce((s, r) => s + r.stockTotal, 0).toLocaleString()}</strong></span>
                <span>Executive: <strong className="text-slate-800">{diffRows.reduce((s, r) => s + r.execTotal, 0).toLocaleString()}</strong></span>
              </div>
            </div>
          </div>
        </div>
      ) : viewTab === 'executive' ? (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
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
                  const partner = [...EXTERNAL_PARTNERS, { id: 'loscam_wangnoi', name: 'Loscam (Main Account)', type: 'provider' } as any].find(p => p.id === partnerId);
                  if (!partner) return null;

                  const partnerPallets = Object.entries(agingAnalysis.partnerSummaries)
                    .filter(([key]) => key.startsWith(partnerId + '_'))
                    .map(([, s]) => s as any);

                  const totalDebt = partnerPallets.reduce((sum, s) => sum + (s.openQty || 0), 0);
                  const totalRent = partnerPallets.reduce((sum, s) => sum + (s.rent || 0), 0);
                  const maxRate = Math.max(...partnerPallets.map(s => s.currentRate || 0), 0);

                  return (
                    <tr key={partnerId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-black text-slate-900">{partnerId === 'loscam_wangnoi' ? 'Loscam (Main Account)' : partner.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">
                          {partnerId === 'loscam_wangnoi' ? 'Aggregated Account' :
                            partnerId === 'sino' ? 'ยืมใช้ / คืนตามกำหนด' :
                            partner.type === 'provider' ? 'เรายืมจากเขา (Provider)' : 'ส่วนงานลูกค้า (Customer)'}
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
              const partner = [...EXTERNAL_PARTNERS, { id: 'loscam_wangnoi', name: 'Loscam (Main Account)', type: 'provider' } as any].find(p => p.id === partnerId);
              if (!partner) return null;

              const partnerPallets = Object.entries(agingAnalysis.partnerSummaries)
                .filter(([key]) => key.startsWith(partnerId + '_'))
                .map(([, s]) => s as any);

              const totalDebt = partnerPallets.reduce((sum, s) => sum + (s.openQty || 0), 0);
              const totalRent = partnerPallets.reduce((sum, s) => sum + (s.rent || 0), 0);
              const maxRate = Math.max(...partnerPallets.map(s => s.currentRate || 0), 0);

              return (
                <div key={partnerId} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-black text-slate-900 text-sm">{partnerId === 'loscam_wangnoi' ? 'Loscam (Main Account)' : partner.name}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase">
                        {partnerId === 'loscam_wangnoi' ? 'Aggregated' : partnerId === 'sino' ? 'Sino Pacific' : partner.type === 'provider' ? 'Provider' : 'Customer'}
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
      ) : (
        <>
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
            {PALLET_TYPES.map(pt => {
              const palletStats = stats[pt.id] || { total: 0, confirmed: 0, pending: 0 };
              const colorMap: Record<string, string> = {
                'bg-red-600': 'text-red-600', 'bg-yellow-400': 'text-amber-600', 'bg-blue-400': 'text-blue-600',
                'bg-orange-500': 'text-orange-600', 'bg-gray-400': 'text-gray-600', 'bg-teal-500': 'text-teal-600',
                'bg-indigo-500': 'text-indigo-600',
              };
              return (
                <StatsCard
                  key={pt.id}
                  title={pt.name}
                  value={palletStats.total}
                  confirmedValue={palletStats.confirmed}
                  pendingValue={palletStats.pending}
                  icon={Package}
                  color={pt.color}
                  textColor={colorMap[pt.color] || 'text-slate-600'}
                  subtext={palletStats.total < 0 ? "⚠️ สต็อกติดลบ" : "Physical Stock"}
                  alert={alerts.some(a => a.palletName.includes(pt.name))}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default InventoryOverviewTab;
