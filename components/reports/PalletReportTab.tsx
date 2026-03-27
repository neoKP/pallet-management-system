import React, { useMemo, useState } from 'react';
import { Package, Users, Building2, ChevronDown, ChevronUp, TrendingUp, AlertTriangle, CheckCircle, Clock, Wrench } from 'lucide-react';
import { Stock, Transaction, BranchId, PalletId } from '../../types';
import { BRANCHES, PALLET_TYPES, EXTERNAL_PARTNERS } from '../../constants';
import { calculatePartnerBalance } from '../../utils/businessLogic';

interface PalletReportTabProps {
  stock: Stock;
  transactions: Transaction[];
}

const PALLET_GROUPS = [
  {
    id: 'loscam_red',
    label: 'Loscam (สีแดง)',
    color: 'from-red-500 to-red-600',
    lightColor: 'bg-red-50 border-red-100',
    textColor: 'text-red-600',
    pallets: ['loscam_red'] as PalletId[],
    customerPartners: ['lamsoon', 'ufc', 'loxley', 'kopee', 'neo_corp'],
    providerPartners: ['loscam_wangnoi', 'sino'],
  },
  {
    id: 'loscam_yellow',
    label: 'Loscam (สีเหลือง)',
    color: 'from-yellow-400 to-yellow-500',
    lightColor: 'bg-yellow-50 border-yellow-100',
    textColor: 'text-yellow-600',
    pallets: ['loscam_yellow'] as PalletId[],
    customerPartners: ['loxley'],
    providerPartners: [],
  },
  {
    id: 'loscam_blue',
    label: 'Loscam (สีฟ้า)',
    color: 'from-blue-400 to-blue-500',
    lightColor: 'bg-blue-50 border-blue-100',
    textColor: 'text-blue-600',
    pallets: ['loscam_blue'] as PalletId[],
    customerPartners: ['ufc', 'loxley'],
    providerPartners: ['sino'],
  },
  {
    id: 'hiq',
    label: 'HI-Q',
    color: 'from-orange-500 to-orange-600',
    lightColor: 'bg-orange-50 border-orange-100',
    textColor: 'text-orange-600',
    pallets: ['hiq'] as PalletId[],
    customerPartners: [],
    providerPartners: ['hiq_th'],
  },
  {
    id: 'general',
    label: 'พาเลทหมุนเวียน (ไม้/คละสี)',
    color: 'from-gray-500 to-gray-600',
    lightColor: 'bg-gray-50 border-gray-100',
    textColor: 'text-gray-600',
    pallets: ['general'] as PalletId[],
    customerPartners: [],
    providerPartners: [],
  },
  {
    id: 'plastic',
    label: 'พาเลทพลาสติก (หมุนเวียน)',
    color: 'from-teal-500 to-teal-600',
    lightColor: 'bg-teal-50 border-teal-100',
    textColor: 'text-teal-600',
    pallets: ['plastic_circular'] as PalletId[],
    customerPartners: [],
    providerPartners: [],
  },
  {
    id: 'cargo_net',
    label: 'ตาข่ายคลุมสินค้า (Cargo Net)',
    color: 'from-indigo-500 to-indigo-600',
    lightColor: 'bg-indigo-50 border-indigo-100',
    textColor: 'text-indigo-600',
    pallets: ['cargo_net'] as PalletId[],
    customerPartners: [],
    providerPartners: [],
  },
];

const OPERATION_BRANCHES = BRANCHES.filter(b => b.id !== 'maintenance_stock');

interface SectionCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  color?: string;
}
const SectionCard: React.FC<SectionCardProps> = ({ icon, label, value, sub, color = 'text-slate-900' }) => (
  <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
    <div className="shrink-0">{icon}</div>
    <div className="min-w-0">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
      <div className={`text-xl font-black ${color}`}>{value.toLocaleString()} <span className="text-xs font-bold text-slate-400">ตัว</span></div>
      {sub && <div className="text-[10px] text-slate-400 font-medium">{sub}</div>}
    </div>
  </div>
);

interface PalletGroupReportProps {
  group: typeof PALLET_GROUPS[0];
  stock: Stock;
  transactions: Transaction[];
}

const PalletGroupReport: React.FC<PalletGroupReportProps> = ({ group, stock, transactions }) => {
  const [showBranchBreakdown, setShowBranchBreakdown] = useState(false);
  const [showPartnerBreakdown, setShowPartnerBreakdown] = useState(false);

  const data = useMemo(() => {
    let accountNeo = 0;
    let maintenanceQty = 0;
    let pendingQty = 0;

    group.pallets.forEach(palletId => {
      OPERATION_BRANCHES.forEach(branch => {
        const qty = (stock[branch.id as BranchId] as any)?.[palletId] || 0;
        accountNeo += qty;
      });
      const mQty = (stock['maintenance_stock'] as any)?.[palletId] || 0;
      maintenanceQty += mQty;
    });

    transactions.forEach(t => {
      if (t.status === 'PENDING' && group.pallets.includes(t.palletId as PalletId)) {
        pendingQty += t.qty;
      }
    });

    const readyQty = accountNeo - pendingQty;

    const customerDebts: { partnerId: string; name: string; palletId: string; qty: number }[] = [];
    group.customerPartners.forEach(partnerId => {
      const partner = EXTERNAL_PARTNERS.find(p => p.id === partnerId);
      if (!partner) return;
      group.pallets.forEach(palletId => {
        const balance = calculatePartnerBalance(transactions, partnerId, palletId);
        if (balance !== 0) {
          customerDebts.push({
            partnerId,
            name: partner.name,
            palletId,
            qty: Math.abs(balance),
          });
        }
      });
    });

    const totalCustomerDebt = customerDebts.reduce((s, d) => s + d.qty, 0);
    const grandTotal = accountNeo + totalCustomerDebt + pendingQty;

    const branchBreakdown = OPERATION_BRANCHES.map(branch => {
      let qty = 0;
      group.pallets.forEach(palletId => {
        qty += (stock[branch.id as BranchId] as any)?.[palletId] || 0;
      });
      return { branchId: branch.id, name: branch.name, qty };
    }).filter(b => b.qty > 0);

    const palletBreakdown = group.pallets.map(palletId => {
      const pt = PALLET_TYPES.find(p => p.id === palletId);
      let qty = 0;
      BRANCHES.forEach(branch => {
        qty += (stock[branch.id as BranchId] as any)?.[palletId] || 0;
      });
      return { palletId, name: pt?.name || palletId, qty };
    }).filter(p => p.qty > 0);

    return {
      accountNeo,
      readyQty,
      pendingQty,
      maintenanceQty,
      customerDebts,
      totalCustomerDebt,
      grandTotal,
      branchBreakdown,
      palletBreakdown,
    };
  }, [group, stock, transactions]);

  const hasData = data.grandTotal > 0 || data.maintenanceQty > 0;

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${group.color} p-6`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <Package size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{group.label}</h2>
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-0.5">
              รวมทั้งหมด {data.grandTotal.toLocaleString()} ตัว
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {!hasData ? (
          <div className="text-center py-8 text-slate-300">
            <Package size={40} className="mx-auto mb-2 opacity-40" />
            <p className="font-bold text-slate-400">ไม่มีข้อมูลพาเลทในกลุ่มนี้</p>
          </div>
        ) : (
          <>
            {/* Section 1: Account Neo */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-1 h-5 rounded-full bg-gradient-to-b ${group.color}`} />
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Account Neo (สต็อกในสาขา)</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <SectionCard
                  icon={<CheckCircle size={18} className="text-emerald-500" />}
                  label="พาเลทสมบูรณ์ (พร้อมใช้)"
                  value={data.readyQty}
                  color="text-emerald-700"
                />
                <SectionCard
                  icon={<Clock size={18} className="text-amber-500" />}
                  label="พาเลทหมุนเวียน (ระหว่างทาง)"
                  value={data.pendingQty}
                  sub="PENDING transactions"
                  color="text-amber-700"
                />
                <SectionCard
                  icon={<Wrench size={18} className="text-red-500" />}
                  label="พาเลยเสีย / รอซ่อม"
                  value={data.maintenanceQty}
                  sub="คลังซ่อมบำรุง"
                  color="text-red-700"
                />
              </div>
            </div>

            {/* Section 2: Customer Debt */}
            {data.customerDebts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-1 h-5 rounded-full bg-gradient-to-b ${group.color}`} />
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Pallet ที่ยืมจาก Customer</h3>
                  <span className={`ml-auto text-xs font-black px-3 py-1 rounded-full ${group.lightColor} ${group.textColor} border`}>
                    รวม {data.totalCustomerDebt.toLocaleString()} ตัว
                  </span>
                </div>
                <button
                  onClick={() => setShowPartnerBreakdown(!showPartnerBreakdown)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-slate-400" />
                    <span className="text-sm font-bold text-slate-600">
                      {data.customerDebts.length} รายการ แยกตามคู่ค้า
                    </span>
                  </div>
                  {showPartnerBreakdown ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>
                {showPartnerBreakdown && (
                  <div className="mt-2 space-y-2">
                    {data.customerDebts.map((d, idx) => {
                      const palletInfo = PALLET_TYPES.find(p => p.id === d.palletId);
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                          <div>
                            <div className="font-black text-slate-800 text-sm">{d.name}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{palletInfo?.name || d.palletId}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-900">{d.qty.toLocaleString()}</span>
                            <span className="text-[10px] ml-1 font-bold text-slate-400">ตัว</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Section 3: Grand Total */}
            <div className={`rounded-2xl p-5 border-2 ${group.lightColor} border-dashed`}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-black uppercase tracking-widest text-slate-500">รวม {group.label} ทั้งหมด</div>
                <div className={`text-3xl font-black ${group.textColor}`}>
                  {data.grandTotal.toLocaleString()}
                  <span className="text-sm font-bold text-slate-400 ml-1">ตัว</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white/60 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500" />
                    <span className="text-sm font-bold text-slate-700">สต็อกในสาขา</span>
                  </div>
                  <span className="text-sm font-black text-emerald-700">{data.accountNeo.toLocaleString()}</span>
                </div>
                {data.totalCustomerDebt > 0 && (
                  <div className="flex items-center justify-between bg-white/60 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-indigo-500" />
                      <span className="text-sm font-bold text-slate-700">ยืมจาก Customer</span>
                    </div>
                    <span className="text-sm font-black text-indigo-700">{data.totalCustomerDebt.toLocaleString()}</span>
                  </div>
                )}
                {data.pendingQty > 0 && (
                  <div className="flex items-center justify-between bg-white/60 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-amber-500" />
                      <span className="text-sm font-bold text-slate-700">หมุนเวียน (ระหว่างทาง)</span>
                    </div>
                    <span className="text-sm font-black text-amber-700">{data.pendingQty.toLocaleString()}</span>
                  </div>
                )}
                {data.maintenanceQty > 0 && (
                  <div className="flex items-center justify-between bg-white/60 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Wrench size={14} className="text-red-500" />
                      <span className="text-sm font-bold text-slate-700">รอซ่อม</span>
                    </div>
                    <span className="text-sm font-black text-red-700">{data.maintenanceQty.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Branch Breakdown */}
            {data.branchBreakdown.length > 0 && (
              <div>
                <button
                  onClick={() => setShowBranchBreakdown(!showBranchBreakdown)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-slate-400" />
                    <span className="text-sm font-bold text-slate-600">แยกตามสาขา</span>
                  </div>
                  {showBranchBreakdown ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>
                {showBranchBreakdown && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-3 text-left font-black text-[10px] uppercase tracking-widest text-slate-400">สาขา</th>
                          {group.pallets.length > 1 && group.pallets.map(palletId => {
                            const pt = PALLET_TYPES.find(p => p.id === palletId);
                            return (
                              <th key={palletId} className="p-3 text-center font-black text-[10px] uppercase tracking-widest text-slate-400">
                                {pt?.name.replace('Loscam ', '') || palletId}
                              </th>
                            );
                          })}
                          <th className="p-3 text-center font-black text-[10px] uppercase tracking-widest text-slate-400">รวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {OPERATION_BRANCHES.map(branch => {
                          const palletQtys = group.pallets.map(palletId => ({
                            palletId,
                            qty: (stock[branch.id as BranchId] as any)?.[palletId] || 0,
                          }));
                          const branchTotal = palletQtys.reduce((s, p) => s + p.qty, 0);
                          if (branchTotal === 0) return null;
                          return (
                            <tr key={branch.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3">
                                <div className="font-bold text-slate-800 text-xs">{branch.name}</div>
                                <div className="text-[9px] text-slate-400 font-bold uppercase">{branch.id}</div>
                              </td>
                              {group.pallets.length > 1 && palletQtys.map(p => (
                                <td key={p.palletId} className="p-3 text-center">
                                  <span className={`font-black text-sm ${p.qty > 0 ? 'text-slate-900' : 'text-slate-200'}`}>
                                    {p.qty.toLocaleString()}
                                  </span>
                                </td>
                              ))}
                              <td className="p-3 text-center">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full font-black text-sm ${group.lightColor} ${group.textColor} border`}>
                                  {branchTotal.toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {/* maintenance row */}
                        {data.maintenanceQty > 0 && (
                          <tr className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-red-700 text-xs">คลังซ่อมบำรุง</div>
                              <div className="text-[9px] text-slate-400 font-bold uppercase">maintenance_stock</div>
                            </td>
                            {group.pallets.length > 1 && group.pallets.map(palletId => {
                              const qty = (stock['maintenance_stock'] as any)?.[palletId] || 0;
                              return (
                                <td key={palletId} className="p-3 text-center">
                                  <span className={`font-black text-sm ${qty > 0 ? 'text-red-700' : 'text-slate-200'}`}>
                                    {qty.toLocaleString()}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="p-3 text-center">
                              <span className="inline-flex items-center px-3 py-1 rounded-full font-black text-sm bg-red-50 text-red-600 border border-red-100">
                                {data.maintenanceQty.toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const PalletReportTab: React.FC<PalletReportTabProps> = ({ stock, transactions }) => {
  const summary = useMemo(() => {
    let totalAll = 0;
    PALLET_TYPES.forEach(pt => {
      BRANCHES.forEach(branch => {
        totalAll += (stock[branch.id as BranchId] as any)?.[pt.id] || 0;
      });
    });
    return { totalAll };
  }, [stock]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Pallet Report</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">สรุปสถานะพาเลทแยกตามประเภท สาขา และคู่ค้า</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
          <TrendingUp size={18} className="text-blue-600" />
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">รวมพาเลททุกชนิดในสาขา</div>
            <div className="text-2xl font-black text-slate-900">{summary.totalAll.toLocaleString()} <span className="text-sm font-bold text-slate-400">ตัว</span></div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <CheckCircle size={14} className="text-emerald-500" /> พาเลทสมบูรณ์ = stock ในสาขา (ไม่รวม pending)
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Clock size={14} className="text-amber-500" /> หมุนเวียน = PENDING transactions
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Wrench size={14} className="text-red-500" /> รอซ่อม = คลังซ่อมบำรุง
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Users size={14} className="text-indigo-500" /> Customer Debt = ยอดที่ลูกค้ายืมอยู่
        </div>
      </div>

      {/* Report Groups */}
      {PALLET_GROUPS.map(group => (
        <PalletGroupReport
          key={group.id}
          group={group}
          stock={stock}
          transactions={transactions}
        />
      ))}
    </div>
  );
};

export default PalletReportTab;
