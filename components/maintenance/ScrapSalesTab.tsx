import React, { useMemo, useState } from 'react';
import { Trash2, TrendingUp, Package, History, ShoppingCart, XCircle, DollarSign } from 'lucide-react';
import { Transaction, Stock, PalletId } from '../../types';
import { PALLET_TYPES } from '../../constants';
import ScrappedReportTable from './ScrappedReportTable';
// @ts-ignore
import Swal from 'sweetalert2';

interface ScrapSalesTabProps {
    transactions: Transaction[];
    stock: Stock;
    processScrapSale: (data: { palletId: PalletId; qty: number; revenue: number; note?: string }) => Promise<void>;
    processScrapDiscard: (data: { palletId: PalletId; qty: number; note?: string }) => Promise<void>;
}

const ScrapSalesTab: React.FC<ScrapSalesTabProps> = ({ transactions, stock, processScrapSale, processScrapDiscard }) => {
    const [actionPalletId, setActionPalletId] = useState<PalletId>('loscam_red');
    const [actionQty, setActionQty] = useState('');
    const [actionRevenue, setActionRevenue] = useState('');
    const [actionNote, setActionNote] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Parse scrap quantity helper
    const getScrapQty = (noteExtended: string) => {
        const match = noteExtended.match(/SCRAP:\s*(\d+)/);
        return match ? parseInt(match[1]) : 0;
    };

    // Real scrap stock from context
    const scrapStock = stock['scrap_stock'] || {};
    const totalScrapStock = Object.values(scrapStock).reduce((s, q) => s + q, 0);
    const scrapItems = PALLET_TYPES.filter(p => (scrapStock[p.id] || 0) > 0);

    // Calculate Metrics
    const metrics = useMemo(() => {
        // Total scrapped ever (from MAINTENANCE SCRAP notes)
        const totalScrapped = transactions
            .filter(tx => tx.type === 'MAINTENANCE' && tx.status === 'COMPLETED' && tx.noteExtended?.includes('SCRAP:'))
            .reduce((sum, tx) => sum + getScrapQty(tx.noteExtended || ''), 0);

        // Sold qty and revenue (from SCRAP_SALE transactions)
        const saleTxs = transactions.filter(tx => tx.type === 'SCRAP_SALE' && tx.status === 'COMPLETED');
        const soldQty = saleTxs.reduce((sum, tx) => sum + tx.qty, 0);
        const totalRevenue = saleTxs.reduce((sum, tx) => sum + (tx.scrapRevenue || 0), 0);

        // Discarded qty (from SCRAP_DISCARD transactions)
        const discardedQty = transactions
            .filter(tx => tx.type === 'SCRAP_DISCARD' && tx.status === 'COMPLETED')
            .reduce((sum, tx) => sum + tx.qty, 0);

        // Also count old-style revenue from MAINTENANCE transactions
        const oldRevenue = transactions
            .filter(tx => tx.type === 'MAINTENANCE' && tx.status === 'COMPLETED' && tx.scrapRevenue)
            .reduce((sum, tx) => sum + (tx.scrapRevenue || 0), 0);

        return { totalScrapped, soldQty, discardedQty, totalRevenue: totalRevenue + oldRevenue, waitingForSale: totalScrapStock };
    }, [transactions, totalScrapStock]);

    const handleSale = async () => {
        const qty = parseInt(actionQty);
        const revenue = parseFloat(actionRevenue);
        if (!qty || qty <= 0 || isNaN(revenue) || revenue < 0) {
            Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาระบุจำนวนและราคาขาย' });
            return;
        }
        const available = scrapStock[actionPalletId] || 0;
        if (qty > available) {
            Swal.fire({ icon: 'error', title: 'สต๊อกไม่พอ', text: `มีในคลังซาก ${available} ตัว` });
            return;
        }
        try {
            setIsProcessing(true);
            await processScrapSale({ palletId: actionPalletId, qty, revenue, note: actionNote || undefined });
            setActionQty(''); setActionRevenue(''); setActionNote('');
            Swal.fire({ icon: 'success', title: 'สำเร็จ', text: `ขายซาก ${qty} ตัว รายได้ ${revenue.toLocaleString()} บาท`, timer: 2000, showConfirmButton: false });
        } catch (err: any) {
            Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message || 'ไม่สามารถดำเนินการได้' });
        } finally { setIsProcessing(false); }
    };

    const handleDiscard = async () => {
        const qty = parseInt(actionQty);
        if (!qty || qty <= 0) {
            Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาระบุจำนวน' });
            return;
        }
        const available = scrapStock[actionPalletId] || 0;
        if (qty > available) {
            Swal.fire({ icon: 'error', title: 'สต๊อกไม่พอ', text: `มีในคลังซาก ${available} ตัว` });
            return;
        }
        const result = await Swal.fire({
            icon: 'warning', title: 'ยืนยันทิ้ง?',
            text: `ทิ้งพาเลท ${PALLET_TYPES.find(p => p.id === actionPalletId)?.name} จำนวน ${qty} ตัว (ไม่มีรายได้)`,
            showCancelButton: true, confirmButtonText: 'ยืนยันทิ้ง', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#ef4444',
        });
        if (!result.isConfirmed) return;
        try {
            setIsProcessing(true);
            await processScrapDiscard({ palletId: actionPalletId, qty, note: actionNote || undefined });
            setActionQty(''); setActionNote('');
            Swal.fire({ icon: 'success', title: 'สำเร็จ', text: `ทิ้งพาเลท ${qty} ตัว`, timer: 2000, showConfirmButton: false });
        } catch (err: any) {
            Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message || 'ไม่สามารถดำเนินการได้' });
        } finally { setIsProcessing(false); }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass p-6 rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-red-50 rounded-2xl text-red-600">
                            <Trash2 size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">พาเลทเสียสะสม</p>
                            <h3 className="text-2xl font-black text-slate-900">{metrics.totalScrapped.toLocaleString()} <span className="text-sm font-bold">ตัว</span></h3>
                        </div>
                    </div>
                </div>

                <div className="glass p-6 rounded-3xl border border-orange-200 bg-orange-50/30 shadow-sm hover:shadow-md transition-all border-dashed">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-orange-100 rounded-2xl text-orange-600">
                            <Package size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">สต๊อกรอขายซาก</p>
                            <h3 className="text-2xl font-black text-orange-600">{metrics.waitingForSale.toLocaleString()} <span className="text-sm font-bold">ตัว</span></h3>
                        </div>
                    </div>
                    {scrapItems.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {scrapItems.map(p => (
                                <span key={p.id} className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                    {p.name}: {(scrapStock[p.id] || 0).toLocaleString()}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="glass p-6 rounded-3xl border border-blue-200 bg-blue-50/30 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                            <History size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">ขายซากไปแล้ว</p>
                            <h3 className="text-2xl font-black text-blue-600">{metrics.soldQty.toLocaleString()} <span className="text-sm font-bold">ตัว</span></h3>
                        </div>
                    </div>
                    {metrics.discardedQty > 0 && (
                        <p className="text-[10px] text-slate-400 font-bold mt-1">ทิ้ง/เสีย: {metrics.discardedQty.toLocaleString()} ตัว</p>
                    )}
                </div>

                <div className="glass p-6 rounded-3xl border border-emerald-200 bg-emerald-50 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">รายได้รวมจากการขาย</p>
                            <h3 className="text-2xl font-black text-emerald-600">฿{metrics.totalRevenue.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrap Action Form */}
            {totalScrapStock > 0 && (
                <div className="glass p-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                        <ShoppingCart className="text-orange-500" size={22} />
                        จัดการคลังซาก
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">ประเภทพาเลท</label>
                            <select
                                title="เลือกประเภทพาเลท"
                                value={actionPalletId}
                                onChange={(e) => setActionPalletId(e.target.value as PalletId)}
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                            >
                                {scrapItems.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({(scrapStock[p.id] || 0)} ตัว)</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">จำนวน (ตัว)</label>
                            <input
                                type="number" value={actionQty} onChange={(e) => setActionQty(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                                placeholder="จำนวน" min="1" max={scrapStock[actionPalletId] || 0}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">ราคาขาย (บาท)</label>
                            <input
                                type="number" value={actionRevenue} onChange={(e) => setActionRevenue(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                                placeholder="0 = ทิ้ง" min="0"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">หมายเหตุ</label>
                            <input
                                type="text" value={actionNote} onChange={(e) => setActionNote(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                                placeholder="(ไม่บังคับ)"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleSale} disabled={isProcessing}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-colors disabled:opacity-50"
                        >
                            <DollarSign size={18} /> ขายซาก
                        </button>
                        <button
                            onClick={handleDiscard} disabled={isProcessing}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl transition-colors disabled:opacity-50"
                        >
                            <XCircle size={18} /> ทิ้ง / เสีย
                        </button>
                    </div>
                </div>
            )}

            {/* Detailed Table */}
            <ScrappedReportTable transactions={transactions} />
        </div>
    );
};

export default ScrapSalesTab;
