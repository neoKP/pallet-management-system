import React, { useMemo, useState } from 'react';
import { Stock, BranchId, PalletId } from '../../types';
import { BRANCHES, PALLET_TYPES } from '../../constants';
import { BarChart, TrendingDown, TrendingUp, Minus, ChevronDown, ChevronUp } from 'lucide-react';

interface StockThresholdChartProps {
    stock: Stock;
    thresholds: any;
    selectedBranch: BranchId | 'ALL';
}

const PALLET_COLORS: Record<string, { bar: string }> = {
    loscam_red: { bar: '#ef4444' },
    loscam_yellow: { bar: '#f59e0b' },
    loscam_blue: { bar: '#3b82f6' },
    hiq: { bar: '#f97316' },
    general: { bar: '#6b7280' },
    plastic_circular: { bar: '#14b8a6' },
    cargo_net: { bar: '#6366f1' },
};

const BulletBar: React.FC<{
    current: number;
    min: number;
    max: number;
    color: string;
    label: string;
}> = ({ current, min, max, color, label }) => {
    const upperBound = Math.max(max * 1.3, current * 1.2, 100);
    const currentPct = Math.min((current / upperBound) * 100, 100);
    const minPct = min > 0 ? (min / upperBound) * 100 : 0;
    const maxPct = max > 0 ? (max / upperBound) * 100 : 0;

    let status: 'normal' | 'low' | 'high' = 'normal';
    if (min > 0 && current < min) status = 'low';
    if (max > 0 && current > max) status = 'high';

    const statusConfig = {
        normal: { icon: Minus, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'ปกติ' },
        low: { icon: TrendingDown, color: 'text-amber-500', bg: 'bg-amber-50', label: 'ต่ำกว่า Min' },
        high: { icon: TrendingUp, color: 'text-red-500', bg: 'bg-red-50', label: 'เกิน Max' },
    };

    const StatusIcon = statusConfig[status].icon;

    return (
        <div className="flex items-center gap-3 py-2">
            {/* ชื่อพาเลท */}
            <div className="w-20 flex-shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</span>
            </div>

            {/* กราฟ Bullet */}
            <div className="flex-1 relative h-7 bg-slate-100 rounded-lg overflow-visible">
                {/* พื้นที่ Min-Max (Safe Zone) */}
                {(min > 0 || max > 0) && (
                    <div
                        className="absolute top-0 h-full bg-emerald-100/60 rounded"
                        style={{
                            left: `${minPct}%`,
                            width: `${Math.max(maxPct - minPct, 0)}%`,
                        }}
                    />
                )}

                {/* แถบค่าปัจจุบัน */}
                <div
                    className="absolute top-1 h-5 rounded-md transition-all duration-700 ease-out"
                    style={{
                        width: `${Math.max(currentPct, 2)}%`,
                        backgroundColor: status === 'high' ? '#ef4444' : status === 'low' ? '#f59e0b' : color,
                        opacity: 0.85,
                    }}
                />

                {/* เส้น Min */}
                {min > 0 && (
                    <div
                        className="absolute top-0 h-full w-0.5 bg-amber-400 z-10"
                        style={{ left: `${minPct}%` }}
                        title={`Min: ${min}`}
                    >
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-amber-500 whitespace-nowrap">
                            {min}
                        </span>
                    </div>
                )}

                {/* เส้น Max */}
                {max > 0 && (
                    <div
                        className="absolute top-0 h-full w-0.5 bg-red-400 z-10"
                        style={{ left: `${maxPct}%` }}
                        title={`Max: ${max}`}
                    >
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-red-500 whitespace-nowrap">
                            {max}
                        </span>
                    </div>
                )}

                {/* ตัวเลขค่าปัจจุบัน */}
                <div
                    className="absolute top-1/2 z-20"
                    style={{ left: `${Math.max(currentPct, 2)}%`, transform: 'translate(-50%, -50%)' }}
                >
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-sm ${status === 'high' ? 'bg-red-600 text-white' : status === 'low' ? 'bg-amber-500 text-white' : 'bg-white text-slate-800 border border-slate-200'}`}>
                        {current}
                    </span>
                </div>
            </div>

            {/* สถานะ */}
            <div className={`flex-shrink-0 w-20 flex items-center gap-1 px-2 py-1 rounded-lg ${statusConfig[status].bg}`}>
                <StatusIcon size={12} className={statusConfig[status].color} />
                <span className={`text-[9px] font-bold ${statusConfig[status].color}`}>{statusConfig[status].label}</span>
            </div>
        </div>
    );
};

const StockThresholdChart: React.FC<StockThresholdChartProps> = ({ stock, thresholds, selectedBranch }) => {
    const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set(['hub_nw', 'sai3']));

    const activePallets = useMemo(() => {
        return PALLET_TYPES;
    }, []);

    const branchData = useMemo(() => {
        const displayBranches = BRANCHES.filter(b =>
            ['hub_nw', 'sai3', 'kpp', 'cm', 'plk', 'maintenance_stock', 'ekp', 'ms'].includes(b.id)
        );

        if (selectedBranch !== 'ALL') {
            return displayBranches.filter(b => b.id === selectedBranch);
        }
        return displayBranches;
    }, [selectedBranch]);

    const toggleBranch = (branchId: string) => {
        setExpandedBranches(prev => {
            const next = new Set(prev);
            if (next.has(branchId)) {
                next.delete(branchId);
            } else {
                next.add(branchId);
            }
            return next;
        });
    };

    const toggleAll = () => {
        if (expandedBranches.size === branchData.length) {
            setExpandedBranches(new Set());
        } else {
            setExpandedBranches(new Set(branchData.map(b => b.id)));
        }
    };

    if (!thresholds) return null;

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                        <BarChart size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800">Stock Level Monitor</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                            ระดับสต็อก Min / Max แต่ละสาขา
                        </p>
                    </div>
                </div>
                <button
                    onClick={toggleAll}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 transition-colors"
                >
                    {expandedBranches.size === branchData.length ? 'ย่อทั้งหมด' : 'ขยายทั้งหมด'}
                </button>
            </div>

            {/* คำอธิบายสัญลักษณ์ */}
            <div className="flex flex-wrap items-center gap-4 mb-5 px-3 py-2.5 bg-slate-50 rounded-xl text-[10px] font-bold">
                <div className="flex items-center gap-1.5">
                    <div className="w-6 h-2.5 bg-emerald-100 rounded border border-emerald-200" />
                    <span className="text-slate-500">Safe Zone (Min-Max)</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-0.5 h-3 bg-amber-400" />
                    <span className="text-amber-500">Min</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-0.5 h-3 bg-red-400" />
                    <span className="text-red-500">Max</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-6 h-2.5 rounded bg-slate-400" />
                    <span className="text-slate-500">ค่าปัจจุบัน</span>
                </div>
            </div>

            {/* รายสาขา */}
            <div className="space-y-3">
                {branchData.map(branch => {
                    const branchStock = stock[branch.id] || {};
                    const branchThresh = thresholds[branch.id] || thresholds['ALL'] || {};
                    const isExpanded = expandedBranches.has(branch.id);

                    // นับจำนวน alert
                    let alertCount = 0;
                    activePallets.forEach(p => {
                        const qty = (branchStock as any)[p.id] || 0;
                        const t = branchThresh[p.id] || { min: 0, max: 0 };
                        if ((t.min > 0 && qty < t.min) || (t.max > 0 && qty > t.max)) alertCount++;
                    });

                    return (
                        <div key={branch.id} className={`rounded-2xl border overflow-hidden transition-all ${alertCount > 0 ? 'border-red-200 bg-red-50/30' : 'border-slate-100 bg-slate-50/50'}`}>
                            {/* Header */}
                            <button
                                onClick={() => toggleBranch(branch.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-50/80 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="font-black text-slate-800">{branch.name}</span>
                                    {alertCount > 0 && (
                                        <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-black">
                                            ⚠ {alertCount} รายการ
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Mini summary เมื่อย่อ */}
                                    {!isExpanded && (
                                        <div className="hidden md:flex items-center gap-1.5">
                                            {activePallets.map(p => {
                                                const qty = (branchStock as any)[p.id] || 0;
                                                const t = branchThresh[p.id] || { min: 0, max: 0 };
                                                const isAlert = (t.min > 0 && qty < t.min) || (t.max > 0 && qty > t.max);
                                                if (qty === 0 && t.min === 0 && t.max === 0) return null;
                                                return (
                                                    <span
                                                        key={p.id}
                                                        className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isAlert ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}
                                                    >
                                                        {p.id.replace('loscam_', '').replace('plastic_circular', 'PLA').toUpperCase()}: {qty}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                </div>
                            </button>

                            {/* Content */}
                            {isExpanded && (
                                <div className="px-4 pb-4 pt-1">
                                    <div className="space-y-1">
                                        {activePallets.map(p => {
                                            const qty = (branchStock as any)[p.id] || 0;
                                            const t = branchThresh[p.id] || { min: 0, max: 0 };
                                            const colors = PALLET_COLORS[p.id] || PALLET_COLORS.general;

                                            if (qty === 0 && t.min === 0 && t.max === 0) return null;

                                            return (
                                                <BulletBar
                                                    key={p.id}
                                                    current={qty}
                                                    min={t.min}
                                                    max={t.max}
                                                    color={colors.bar}
                                                    label={p.id.replace('loscam_', '').replace('plastic_circular', 'Plastic').toUpperCase()}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StockThresholdChart;
