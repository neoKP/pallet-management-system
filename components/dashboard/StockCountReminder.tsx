import React, { useMemo, useState } from 'react';
import { ClipboardCheck, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Stock, Transaction } from '../../types';
import { PALLET_TYPES, BRANCHES } from '../../constants';
import { getStaleStockAlerts, StockAuditRow } from '../../utils/stockAudit';

interface StockCountReminderProps {
    stock: Stock;
    transactions: Transaction[];
    /** จำกัดเฉพาะสาขาที่เลือก ('ALL' = ดูทุกสาขา) */
    selectedBranch: string;
}

const branchName = (id: string) =>
    BRANCHES.find(b => b.id === id)?.name ||
    (id === 'maintenance_stock' ? 'คลังซ่อมบำรุง' : id === 'scrap_stock' ? 'คลังซาก' : id);

const palletName = (id: string) => PALLET_TYPES.find(p => p.id === id)?.name || id;

/**
 * แจ้งเตือนว่าสต็อกช่องไหนไม่ได้นับจริงมานานแล้ว
 *
 * ยอดในระบบกับของจริงจะค่อย ๆ ต่างกันตามเวลา การนับสต็อกเป็นระยะคือวิธีแก้
 * กล่องนี้ช่วยจัดลำดับว่าควรนับช่องไหนก่อน โดยดูจากระยะเวลาและปริมาณการเคลื่อนไหว
 */
export const StockCountReminder: React.FC<StockCountReminderProps> = ({
    stock,
    transactions,
    selectedBranch,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const alerts = useMemo(() => {
        const all = getStaleStockAlerts(stock, transactions);
        return selectedBranch === 'ALL' ? all : all.filter(a => a.branchId === selectedBranch);
    }, [stock, transactions, selectedBranch]);

    if (alerts.length === 0) return null;

    const critical = alerts.filter(a => a.level === 'critical');
    const shown = isExpanded ? alerts : alerts.slice(0, 3);

    const describeAge = (row: StockAuditRow) =>
        row.daysSinceCount === null ? 'ยังไม่เคยนับ' : `นับล่าสุด ${row.daysSinceCount} วันก่อน`;

    return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 overflow-hidden">
            <div className="px-5 py-4 flex items-start gap-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                    <ClipboardCheck size={20} />
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-800 text-sm">
                        ควรนับสต็อกจริง {alerts.length} รายการ
                        {critical.length > 0 && (
                            <span className="ml-2 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                                เร่งด่วน {critical.length}
                            </span>
                        )}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        ยอดในระบบอาจไม่ตรงกับของจริง เพราะไม่ได้นับมานาน หรือมีการเคลื่อนไหวเยอะ
                    </p>

                    <div className="mt-3 space-y-1.5">
                        {shown.map(row => (
                            <div
                                key={`${row.branchId}-${row.palletId}`}
                                className="flex items-center gap-2 text-xs bg-white/70 rounded-lg px-3 py-2"
                            >
                                {row.level === 'critical' && (
                                    <AlertTriangle size={13} className="text-red-500 shrink-0" />
                                )}
                                <span className="font-bold text-slate-700 truncate">
                                    {branchName(row.branchId)}
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="text-slate-600 truncate">{palletName(row.palletId)}</span>
                                <span className="ml-auto flex items-center gap-3 shrink-0 text-[11px]">
                                    <span className="text-slate-500">{describeAge(row)}</span>
                                    <span className="text-slate-400">{row.movementsSince} รายการ</span>
                                    <span className="font-black text-slate-700 w-12 text-right">
                                        {row.currentQty.toLocaleString()}
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>

                    {alerts.length > 3 && (
                        <button
                            onClick={() => setIsExpanded(v => !v)}
                            className="mt-2 text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1"
                        >
                            {isExpanded ? (
                                <>ย่อลง <ChevronUp size={14} /></>
                            ) : (
                                <>ดูทั้งหมด {alerts.length} รายการ <ChevronDown size={14} /></>
                            )}
                        </button>
                    )}

                    <p className="text-[10px] text-slate-400 mt-2">
                        วิธีแก้: นับพาเลทจริงในคลัง แล้วปรับยอดที่เมนูตั้งค่า → ปรับยอดสต็อก
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StockCountReminder;
