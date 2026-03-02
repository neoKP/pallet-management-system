import React, { useMemo } from 'react';
import { AlertCircle, Package } from 'lucide-react';
import { BranchId, Stock, Transaction, User } from '../../types';
import { BRANCHES, PALLET_TYPES } from '../../constants';
import StatsCard from './StatsCard';
import { useStock } from '../../contexts/StockContext';

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Inventory Overview</h1>
          <p className="text-sm font-medium text-slate-500">ดูยอด Physical Stock (รวมระหว่างทาง)</p>
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
    </div>
  );
};

export default InventoryOverviewTab;
