import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, RefreshCw, Save, History, Search, Filter, AlertCircle } from 'lucide-react';
import { useStock } from '../../contexts/StockContext';
import { BRANCHES, EXTERNAL_PARTNERS, PALLET_TYPES } from '../../constants';
import { PalletId, BranchId, Transaction } from '../../types';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { calculatePartnerBalance } from '../../utils/businessLogic';


interface AdminStockControlProps {
    userName: string;
}

export const AdminStockControl: React.FC<AdminStockControlProps> = ({ userName }) => {
    const { stock, transactions, adjustStock } = useStock();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'BRANCH' | 'PARTNER'>('ALL');
    const [showAuditOnly, setShowAuditOnly] = useState(false);

    // Get all entities (Branches + Partners) - ROBUST & STRICT
    const entities = useMemo(() => {
        // 1. Internal Branches
        const branches = BRANCHES.map(b => ({ id: b.id, name: b.name, type: 'BRANCH' as const }));

        // 2. Virtual Loscam Main Account (Manually Added)
        const loscamMain = { id: 'loscam_wangnoi', name: 'Loscam (Main Account)', type: 'PARTNER' as const };

        // 3. External Partners (Filter out Blocked IDs)
        // BLOCK: 'neo_corp' (Hidden), 'loscam_wangnoi' (Replaced by Virtual Main)
        const BLOCKED_IDS = ['neo_corp', 'loscam_wangnoi'];
        const partners = EXTERNAL_PARTNERS
            .filter(p => !BLOCKED_IDS.includes(p.id))
            .map(p => ({ id: p.id, name: p.name, type: 'PARTNER' as const }));

        // 4. Combine
        const all = [...branches, loscamMain, ...partners];

        return all.filter(e => {
            const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.id.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = filterType === 'ALL' || e.type === filterType;
            return matchesSearch && matchesFilter;
        });
    }, [searchQuery, filterType]);

    // Calculate Partner Balances using unified logic
    const getPartnerBalance = (partnerId: string, palletId: PalletId) => {
        return calculatePartnerBalance(transactions, partnerId, palletId);
    };

    const handleAdjust = async (targetId: string, palletId: PalletId, currentQty: number) => {
        let extraInfoHtml = '';

        // Special logic to show breakdown for Loscam Main Account
        if (targetId === 'loscam_wangnoi' && palletId === 'loscam_red') {
            const totalBorrowed = transactions
                .filter(t => t.status === 'COMPLETED' && t.palletId === 'loscam_red' && t.source === 'neo_corp')
                .reduce((sum, t) => sum + t.qty, 0);

            const totalReturned = transactions
                .filter(t => t.status === 'COMPLETED' && t.palletId === 'loscam_red' && t.dest === 'loscam_wangnoi')
                .reduce((sum, t) => sum + t.qty, 0);

            extraInfoHtml = `
                <div class="bg-blue-50 p-3 rounded-lg mb-4 border border-blue-100">
                    <p class="text-[10px] font-bold text-blue-600 uppercase mb-2">Loscam Debt Breakdown</p>
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-xs text-slate-600">รับจาก Neo Corp (หนี้):</span>
                        <span class="text-xs font-black text-slate-900">${totalBorrowed.toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between items-center border-b border-blue-200 pb-1 mb-1">
                        <span class="text-xs text-slate-600">คืน Loscam Wangnoi (ใช้หนี้):</span>
                        <span class="text-xs font-black text-emerald-600">-${totalReturned.toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between items-center pt-1">
                        <span class="text-xs font-bold text-slate-800">คงเหลือต้องคืน (Net Debt):</span>
                        <span class="text-sm font-black text-blue-700">${(totalBorrowed - totalReturned).toLocaleString()}</span>
                    </div>
                </div>
            `;
        }

        const { value: formValues } = await Swal.fire({
            title: ' Stock Adjustment (Admin)',
            html:
                `<div class="text-left space-y-4">
                    ${extraInfoHtml}
                    <p class="text-xs text-slate-500 mb-4">ปรับปรุงสต๊อกของ: <b>${[...BRANCHES, ...EXTERNAL_PARTNERS, { id: 'loscam_wangnoi', name: 'Loscam (Main Account)' }].find(e => e.id === targetId)?.name}</b><br/>ประเภทพาเลท: <b>${PALLET_TYPES.find(p => p.id === palletId)?.name}</b></p>
                    <label class="block text-sm font-bold text-slate-700 mb-1">ยอดปัจจุบัน: ${currentQty}</label>
                    <input id="swal-new-qty" type="number" class="swal2-input w-full m-0" placeholder="ระบุจำนวนที่ถูกต้อง (ยอดใหม่)" value="${currentQty}">
                    <label class="block text-sm font-bold text-slate-700 mt-4 mb-1">เหตุผลการปรับปรุง <span class="text-red-500">*</span></label>
                    <textarea id="swal-reason" class="swal2-textarea w-full m-0" placeholder="เช่น นับจริงหายไป 5 ใบ, แก้ไขยอดเริ่มต้น"></textarea>
                    <div class="flex items-center gap-2 mt-4">
                        <input type="checkbox" id="swal-is-initial" class="w-4 h-4">
                        <label for="swal-is-initial" class="text-sm font-bold text-slate-600">เป็นยอดเริ่มต้นระบบ (Initial Balance)</label>
                    </div>
                    <div id="lot-date-container" class="mt-4 hidden animate-in fade-in slide-in-from-top-1">
                        <label class="block text-sm font-bold text-slate-700 mb-1">วันที่ต้องการให้นับวันยืม (Lot Date)</label>
                        <input id="swal-custom-date" type="date" class="swal2-input w-full m-0" value="${new Date().toISOString().split('T')[0]}">
                        <p class="text-[10px] text-blue-500 mt-1">วันที่ระบุจะถูกใช้เป็นวันเริ่มต้นสำหรับคำนวณอายุ (Aging)</p>
                    </div>
                </div>`,
            didOpen: () => {
                const checkbox = document.getElementById('swal-is-initial') as HTMLInputElement;
                const container = document.getElementById('lot-date-container');
                checkbox.addEventListener('change', (e: any) => {
                    if (e.target.checked) {
                        container?.classList.remove('hidden');
                    } else {
                        container?.classList.add('hidden');
                    }
                });
            },
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'บันทึกการปรับปรุง',
            cancelButtonText: 'ยกเลิก',
            preConfirm: () => {
                const newQtyStr = (document.getElementById('swal-new-qty') as HTMLInputElement).value;
                const reason = (document.getElementById('swal-reason') as HTMLTextAreaElement).value;
                const isInitial = (document.getElementById('swal-is-initial') as HTMLInputElement).checked;
                const customDate = (document.getElementById('swal-custom-date') as HTMLInputElement).value;

                if (!newQtyStr || reason.length < 5) {
                    Swal.showValidationMessage('กรุณากรอกจำนวนและเหตุผล (อย่างน้อย 5 ตัวอักษร)');
                    return false;
                }
                return { newQty: parseInt(newQtyStr), reason, isInitial, customDate };
            }
        });

        if (formValues) {
            try {
                await adjustStock({
                    targetId,
                    palletId,
                    newQty: formValues.newQty,
                    reason: formValues.reason,
                    userName,
                    isInitial: formValues.isInitial,
                    customDate: formValues.isInitial ? formValues.customDate : undefined
                });
                Swal.fire({ icon: 'success', title: 'ปรับปรุงสำเร็จ', text: 'ยอดสต็อกถูกอัปเดตและบันทึก Audit Log แล้ว', timer: 2000 });
            } catch (error: any) {
                Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.message });
            }
        }
    };

    const auditLogs = useMemo(() => {
        return transactions
            .filter(t => t.type === 'ADJUST' || t.isInitial)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
                    <button
                        onClick={() => setShowAuditOnly(false)}
                        className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${!showAuditOnly ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                    >
                        LIVE STOCK CONTROL
                    </button>
                    <button
                        onClick={() => setShowAuditOnly(true)}
                        className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${showAuditOnly ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                    >
                        AUDIT LOGS ({auditLogs.length})
                    </button>
                </div>

                {!showAuditOnly && (
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search entity..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                        </div>
                        <select
                            value={filterType}
                            onChange={(e: any) => setFilterType(e.target.value)}
                            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                            aria-label="Filter Type"
                        >
                            <option value="ALL">ALL TYPES</option>
                            <option value="BRANCH">INTERNAL BRANCHES</option>
                            <option value="PARTNER">EXTERNAL PARTNERS</option>
                        </select>
                    </div>
                )}
            </div>

            {showAuditOnly ? (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
                        <History className="text-slate-400" size={20} />
                        <h3 className="font-black text-slate-900">Adjustment History & Audit Trail</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="p-4 pl-6 text-[10px] font-black uppercase tracking-widest">Date / Doc No</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest">Target</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest">Change (From ➔ To)</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest">Reason / Admin</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {auditLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-20 text-center text-slate-400 font-bold">No audit logs found.</td>
                                    </tr>
                                ) : (
                                    auditLogs.map(log => {
                                        const targetId = log.source === 'SYSTEM_ADJUSTMENT' ? log.dest : log.source;
                                        const targetName = [...BRANCHES, ...EXTERNAL_PARTNERS].find(e => e.id === targetId)?.name || targetId;
                                        const delta = log.source === 'SYSTEM_ADJUSTMENT' ? log.qty : -log.qty;

                                        return (
                                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4 pl-6">
                                                    <div className="font-black text-slate-900">{format(new Date(log.date), 'dd/MM/yyyy HH:mm')}</div>
                                                    <div className="text-[10px] font-mono text-slate-400 uppercase">{log.docNo}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-slate-700">{targetName}</div>
                                                    <div className="text-[10px] font-black text-blue-500 uppercase">{PALLET_TYPES.find(p => p.id === log.palletId)?.name}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-400 line-through">{log.previousQty}</span>
                                                        <span className="font-black text-slate-900">{(log.previousQty || 0) + delta}</span>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${delta > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                            {delta > 0 ? '+' : ''}{delta}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-xs font-bold text-slate-800">{log.note}</div>
                                                    <div className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 mt-1">
                                                        <ShieldAlert size={10} /> {log.adjustedBy || 'SYSTEM'}
                                                        {log.isInitial && <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[8px]">INITIAL</span>}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {entities.map(e => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={e.id}
                            className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg ${e.type === 'BRANCH' ? 'bg-slate-900' : 'bg-blue-600'
                                    }`}>
                                    {e.type === 'BRANCH' ? 'B' : 'P'}
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 text-lg">{e.name}</h4>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{e.id} | {e.type}</p>
                                </div>
                            </div>

                            <div className={`flex-1 grid gap-4 ${e.id === 'loscam_wangnoi' ? 'grid-cols-1 max-w-[240px]' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6'}`}>
                                {PALLET_TYPES.map(pt => {
                                    // STRICT RULE FOR LOSCAM MAIN ACCOUNT: ONLY RED
                                    if (e.id === 'loscam_wangnoi') {
                                        if (pt.id !== 'loscam_red') return null;
                                    }

                                    // STRICT RULE: Filter Allowed Pallets for Other Partners
                                    else if (e.type === 'PARTNER') {
                                        const partnerDef = EXTERNAL_PARTNERS.find(p => p.id === e.id);
                                        if (partnerDef && !partnerDef.allowedPallets?.includes(pt.id)) {
                                            return null;
                                        }
                                    }

                                    const currentQty = e.type === 'BRANCH' ? (stock[e.id as BranchId]?.[pt.id] || 0) : getPartnerBalance(e.id, pt.id);

                                    // Create filtered transaction sets for specific branch breakdowns
                                    const sai3Txs = transactions.filter(t => t.source === 'sai3' || t.dest === 'sai3');
                                    const hubTxs = transactions.filter(t => t.source === 'hub_nw' || t.dest === 'hub_nw');

                                    // Calculate specific balances
                                    const sai3Balance = e.type === 'PARTNER' ? calculatePartnerBalance(sai3Txs, e.id, pt.id) : 0;
                                    const hubBalance = e.type === 'PARTNER' ? calculatePartnerBalance(hubTxs, e.id, pt.id) : 0;
                                    const showBreakdown = e.type === 'PARTNER' && (sai3Balance !== 0 || hubBalance !== 0);

                                    // Manual Color Mapping for better control
                                    let colorClass = 'border-slate-200 text-slate-500 bg-slate-50 hover:bg-slate-100 hover:border-slate-300';
                                    let badgeClass = 'bg-slate-200 text-slate-500';

                                    if (pt.id === 'loscam_red') {
                                        colorClass = 'border-l-4 border-l-red-500 border-t border-r border-b border-slate-100 bg-red-50/30 hover:bg-red-50 hover:border-red-200';
                                        badgeClass = 'bg-red-100 text-red-700';
                                    } else if (pt.id === 'loscam_yellow') {
                                        colorClass = 'border-l-4 border-l-yellow-400 border-t border-r border-b border-slate-100 bg-yellow-50/30 hover:bg-yellow-50 hover:border-yellow-200';
                                        badgeClass = 'bg-yellow-100 text-yellow-700';
                                    } else if (pt.id === 'loscam_blue') {
                                        colorClass = 'border-l-4 border-l-blue-400 border-t border-r border-b border-slate-100 bg-blue-50/30 hover:bg-blue-50 hover:border-blue-200';
                                        badgeClass = 'bg-blue-100 text-blue-700';
                                    } else if (pt.id === 'hiq') {
                                        colorClass = 'border-l-4 border-l-orange-500 border-t border-r border-b border-slate-100 bg-orange-50/30 hover:bg-orange-50 hover:border-orange-200';
                                        badgeClass = 'bg-orange-100 text-orange-700';
                                    }

                                    return (
                                        <div key={pt.id} className={`p-3 rounded-xl transition-all group relative overflow-hidden ${colorClass}`}>
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className={`w-2 h-2 rounded-full ${badgeClass.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                                            </div>
                                            <p className={`text-[9px] font-black uppercase tracking-tighter mb-2 ${badgeClass.replace('bg-', 'text-').split(' ')[1]}`}>
                                                {pt.name}
                                            </p>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-xl font-black ${String(currentQty) !== '0' ? 'text-slate-900' : 'text-slate-300'}`}>{currentQty}</span>
                                                <button
                                                    onClick={() => handleAdjust(e.id, pt.id, currentQty)}
                                                    className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-blue-600 hover:shadow-sm transition-all border border-slate-100 opacity-0 group-hover:opacity-100 shadow-sm"
                                                    title="Adjust Stock"
                                                >
                                                    <RefreshCw size={14} />
                                                </button>
                                            </div>

                                            {/* Branch Breakdown for Partners */}
                                            {showBreakdown && (
                                                <div className="flex flex-col gap-0.5 mt-1 border-t border-slate-100 pt-1">
                                                    {sai3Balance !== 0 && (
                                                        <div className="flex justify-between items-center text-[9px]">
                                                            <span className="text-slate-500 font-bold">สาย3</span>
                                                            <span className="font-mono font-bold text-indigo-600">{sai3Balance}</span>
                                                        </div>
                                                    )}
                                                    {hubBalance !== 0 && (
                                                        <div className="flex justify-between items-center text-[9px]">
                                                            <span className="text-slate-500 font-bold">NW</span>
                                                            <span className="font-mono font-bold text-pink-600">{hubBalance}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex md:flex-col gap-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${e.type === 'BRANCH' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                    {e.type}
                                </span>
                            </div>

                            {/* Loscam Breakdown - Visible Directly for Main Account */}
                            {e.id === 'loscam_wangnoi' && (
                                <div className="hidden xl:block absolute -bottom-16 -right-16 w-64 h-64 bg-blue-50 rounded-full opacity-20 pointer-events-none" />
                            )}
                            {e.id === 'loscam_wangnoi' && (
                                <div className="w-full md:w-auto mt-4 md:mt-0 md:ml-6 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col gap-2 min-w-[240px]">
                                    {(() => {
                                        // 1. Borrowed from Neo Corp (Standard IN)
                                        const totalBorrowed = transactions
                                            .filter(t => t.status === 'COMPLETED' && t.palletId === 'loscam_red' && t.source === 'neo_corp')
                                            .reduce((sum, t) => sum + t.qty, 0);

                                        // 2. Returned to Loscam Wangnoi (Standard OUT)
                                        const totalReturned = transactions
                                            .filter(t => t.status === 'COMPLETED' && t.palletId === 'loscam_red' && t.dest === 'loscam_wangnoi')
                                            .reduce((sum, t) => sum + t.qty, 0);

                                        // 3. Adjustments / Initial Balance (Specific to Loscam Main Account)
                                        // Note: For Partners, Adjustments affect the balance directly. 
                                        // Positive Adjust = Increase Debt/Stock (Treat as Borrowed/Opening)
                                        // Negative Adjust = Decrease Debt/Stock (Treat as Returned/Correction)
                                        const totalAdjust = transactions
                                            .filter(t => (t.type === 'ADJUST' || t.isInitial) && t.palletId === 'loscam_red' && (t.source === 'loscam_wangnoi' || t.dest === 'loscam_wangnoi'))
                                            .reduce((sum, t) => {
                                                // If 'dest' is loscam_wangnoi, it means stock added TO it (positive)
                                                if (t.dest === 'loscam_wangnoi') return sum + t.qty;
                                                // If 'source' is loscam_wangnoi, it means stock removed FROM it (negative)
                                                return sum - t.qty;
                                            }, 0);

                                        const netDebt = totalBorrowed - totalReturned + totalAdjust;

                                        return (
                                            <>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">รับจาก Neo Corp</span>
                                                    <span className="text-sm font-black text-slate-900">{totalBorrowed.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">ยอดยกมา/ปรับปรุง</span>
                                                    <span className={`text-sm font-black ${totalAdjust >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                                        {totalAdjust > 0 ? '+' : ''}{totalAdjust.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">คืน Loscam</span>
                                                    <span className="text-sm font-black text-emerald-600">-{totalReturned.toLocaleString()}</span>
                                                </div>
                                                <div className="w-full h-px bg-blue-200 my-1" />
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-black text-blue-700 uppercase">Net Debt</span>
                                                    <span className={`text-base font-black ${netDebt > 0 ? 'text-red-500' : 'text-blue-700'}`}>{netDebt.toLocaleString()}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </motion.div>
                    ))}

                    {entities.length === 0 && (
                        <div className="p-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                            <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
                            <p className="text-slate-400 font-bold uppercase tracking-widest">No matching entities found.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
