import React, { useMemo, useState } from 'react';
import { Truck, MapPin, Clock, Package, ArrowRight, ChevronDown, ChevronUp, AlertCircle, Check } from 'lucide-react';
import { Transaction, BranchId } from '../../types';
import { BRANCHES, PALLET_TYPES, EXTERNAL_PARTNERS } from '../../constants';

interface InTransitTableProps {
    transactions: Transaction[];
    selectedBranch: BranchId | 'ALL';
    onConfirmReceive?: (txId: number) => void;
}

interface GroupedInTransit {
    docNo: string;
    source: string;
    sourceName: string;
    dest: string;
    destName: string;
    date: string;
    carRegistration?: string;
    driverName?: string;
    items: { palletId: string; palletName: string; qty: number }[];
    totalQty: number;
    transactions: Transaction[];
}

const InTransitTable: React.FC<InTransitTableProps> = ({ transactions, selectedBranch, onConfirmReceive }) => {
    const [expandedDocNo, setExpandedDocNo] = useState<string | null>(null);

    const allEntities = [...BRANCHES, ...EXTERNAL_PARTNERS];

    // Get valid branch IDs (internal branches only, not external partners)
    const internalBranchIds = BRANCHES.map(b => b.id);

    // Filter and group pending transactions
    const inTransitGroups = useMemo(() => {
        // Filter PENDING transactions that are INTERNAL TRANSFERS (Branch to Branch only)
        // Exclude transactions to/from External Partners
        let pendingTxs = transactions.filter(t => {
            if (t.status !== 'PENDING') return false;

            // Both source AND dest must be internal branches
            const isSourceBranch = internalBranchIds.includes(t.source as BranchId);
            const isDestBranch = internalBranchIds.includes(t.dest as BranchId);

            return isSourceBranch && isDestBranch;
        });

        // If a specific branch is selected, filter for transactions going TO or FROM that branch
        if (selectedBranch !== 'ALL') {
            pendingTxs = pendingTxs.filter(t => t.dest === selectedBranch || t.source === selectedBranch);
        }

        // Group by docNo
        const groupsMap: Record<string, Transaction[]> = {};
        pendingTxs.forEach(tx => {
            const key = tx.docNo || `single-${tx.id}`;
            if (!groupsMap[key]) {
                groupsMap[key] = [];
            }
            groupsMap[key].push(tx);
        });

        // Transform to grouped format
        const groups: GroupedInTransit[] = Object.entries(groupsMap).map(([docNo, txs]) => {
            const mainTx = txs[0];
            const sourceName = allEntities.find(e => e.id === mainTx.source)?.name || mainTx.source;
            const destName = allEntities.find(e => e.id === mainTx.dest)?.name || mainTx.dest;

            const items = txs.map(tx => ({
                palletId: tx.palletId,
                palletName: PALLET_TYPES.find(p => p.id === tx.palletId)?.name || tx.palletId,
                qty: tx.qty
            }));

            const totalQty = txs.reduce((sum, tx) => sum + tx.qty, 0);

            return {
                docNo,
                source: mainTx.source,
                sourceName,
                dest: mainTx.dest,
                destName,
                date: mainTx.date,
                carRegistration: mainTx.carRegistration,
                driverName: mainTx.driverName,
                items,
                totalQty,
                transactions: txs
            };
        });

        // Sort by date (most recent first)
        return groups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, selectedBranch, allEntities]);

    const totalInTransit = inTransitGroups.reduce((sum, g) => sum + g.totalQty, 0);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return {
            date: date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }),
            time: date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        };
    };

    const getTimeSince = (dateStr: string) => {
        const now = new Date();
        const then = new Date(dateStr);
        const diffMs = now.getTime() - then.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays} วัน`;
        if (diffHours > 0) return `${diffHours} ชม.`;
        return 'เพิ่งส่ง';
    };

    const toggleExpand = (docNo: string) => {
        setExpandedDocNo(prev => prev === docNo ? null : docNo);
    };

    if (inTransitGroups.length === 0) {
        return (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl shadow-sm border border-slate-200 p-8">
                <div className="flex flex-col items-center justify-center text-center gap-4">
                    <div className="p-4 bg-emerald-100 rounded-full">
                        <Check className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-700">ไม่มีพาเลทระหว่างทาง</h3>
                        <p className="text-sm text-slate-500 mt-1">พาเลททั้งหมดถึงปลายทางแล้ว</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/25">
                            <Truck size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                ระหว่างทาง (In-Transit)
                                <span className="px-2.5 py-1 bg-amber-500 text-white text-xs font-black rounded-full animate-pulse">
                                    {inTransitGroups.length} รายการ
                                </span>
                            </h3>
                            <p className="text-sm text-slate-500">พาเลทที่กำลังโอนย้ายและรอรับที่ปลายทาง</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200">
                        <Package className="w-5 h-5 text-amber-600" />
                        <span className="text-2xl font-black text-amber-600">{totalInTransit.toLocaleString()}</span>
                        <span className="text-sm font-bold text-amber-500">ชิ้น</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="text-slate-500 font-bold">
                            <th className="p-4 text-left">เลขเอกสาร</th>
                            <th className="p-4 text-left">ต้นทาง → ปลายทาง</th>
                            <th className="p-4 text-left">รถ / พนักงานขับ</th>
                            <th className="p-4 text-center">จำนวน</th>
                            <th className="p-4 text-center">ระยะเวลา</th>
                            <th className="p-4 text-center">รายละเอียด</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {inTransitGroups.map((group) => {
                            const isExpanded = expandedDocNo === group.docNo;
                            const { date, time } = formatDate(group.date);
                            const timeSince = getTimeSince(group.date);
                            const isLongWait = new Date().getTime() - new Date(group.date).getTime() > 24 * 60 * 60 * 1000; // > 1 day

                            return (
                                <React.Fragment key={group.docNo}>
                                    <tr className={`transition-all hover:bg-amber-50/30 ${isLongWait ? 'bg-red-50/50' : ''}`}>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-mono font-bold text-blue-600">{group.docNo}</span>
                                                <span className="text-[10px] text-slate-400">{date} • {time}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col items-center">
                                                    <MapPin className="w-4 h-4 text-emerald-500" />
                                                    <div className="w-0.5 h-4 bg-gradient-to-b from-emerald-500 to-amber-500"></div>
                                                    <MapPin className="w-4 h-4 text-amber-500" />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold text-slate-700 text-xs">{group.sourceName}</span>
                                                    <span className="font-bold text-amber-600 text-xs flex items-center gap-1">
                                                        <ArrowRight className="w-3 h-3" />
                                                        {group.destName}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-0.5">
                                                {group.carRegistration && (
                                                    <span className="font-bold text-slate-700">{group.carRegistration}</span>
                                                )}
                                                {group.driverName && (
                                                    <span className="text-xs text-slate-500">{group.driverName}</span>
                                                )}
                                                {!group.carRegistration && !group.driverName && (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full">
                                                <Package className="w-4 h-4 text-amber-600" />
                                                <span className="font-black text-amber-700">{group.totalQty}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full ${isLongWait
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {isLongWait && <AlertCircle className="w-3.5 h-3.5" />}
                                                <Clock className="w-3.5 h-3.5" />
                                                <span className="font-bold text-xs">{timeSince}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => toggleExpand(group.docNo)}
                                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all ${isExpanded
                                                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        <ChevronUp className="w-4 h-4" />
                                                        <span className="text-xs font-bold">ซ่อน</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown className="w-4 h-4" />
                                                        <span className="text-xs font-bold">ดู ({group.items.length})</span>
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                    </tr>

                                    {/* Expanded Details Row */}
                                    {isExpanded && (
                                        <tr className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
                                            <td colSpan={6} className="p-4">
                                                <div className="pl-4 border-l-4 border-blue-400">
                                                    <div className="text-xs font-bold text-slate-500 mb-3">รายละเอียดพาเลท</div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                        {group.items.map((item, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm"
                                                            >
                                                                <div className="p-2 bg-amber-100 rounded-lg">
                                                                    <Package className="w-4 h-4 text-amber-600" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-800">{item.palletName}</div>
                                                                    <div className="text-xs text-slate-500">
                                                                        จำนวน: <span className="font-black text-amber-600">{item.qty}</span> ชิ้น
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer Summary */}
            <div className="p-4 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                            <span>กำลังขนส่ง</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span>รอนานกว่า 24 ชม.</span>
                        </div>
                    </div>
                    <div className="text-xs font-bold text-slate-400">
                        อัพเดทล่าสุด: {new Date().toLocaleTimeString('th-TH')}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InTransitTable;
