/**
 * Stock Analyzer Component
 * Debug tool to analyze stock discrepancies
 */

import React, { useMemo, useState, useCallback } from 'react';
import { Transaction, Stock, BranchId, PalletId } from '../../types';
import { BRANCHES, PALLET_TYPES } from '../../constants';
import { AlertTriangle, CheckCircle, Search, ChevronDown, ChevronUp, FileSpreadsheet, RefreshCw } from 'lucide-react';
import ExcelJS from 'exceljs';
import { useStock } from '../../contexts/StockContext';
import Swal from 'sweetalert2';

interface StockAnalyzerProps {
  transactions: Transaction[];
  stock: Stock;
}

interface TransactionDetail {
  date: string;
  docNo: string;
  type: string;
  status: string;
  source: string;
  dest: string;
  qty: number;
  effect: string;
  runningTotal: number;
  originalInfo?: string;
}

interface AnalysisResult {
  branch: string;
  branchName: string;
  palletId: string;
  palletName: string;
  currentStock: number;
  calculatedStock: number;
  totalIn: number;
  totalOut: number;
  pendingIn: number;
  pendingOut: number;
  transactions: TransactionDetail[];
  discrepancy: number;
  issues: string[];
}

const StockAnalyzer: React.FC<StockAnalyzerProps> = ({ transactions, stock }) => {
  const { reconcileStock } = useStock();
  const [selectedBranch, setSelectedBranch] = useState<BranchId>('sai3');
  const [selectedPallet, setSelectedPallet] = useState<PalletId>('loscam_red');
  const [showTransactions, setShowTransactions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'detail'>('summary');

  const branchNames: Record<string, string> = useMemo(() => {
    const names: Record<string, string> = {};
    BRANCHES.forEach(b => { names[b.id] = b.name; });
    // Add external partners
    names['loscam_wangnoi'] = 'Loscam วังน้อย';
    names['sino'] = 'Sino-Pacific';
    names['neo_corp'] = 'Neo Corp';
    names['lamsoon'] = 'ล่ำสูง';
    names['ufc'] = 'UFC';
    names['loxley'] = 'Loxley';
    names['kopee'] = 'โคพี่';
    names['hiq_th'] = 'HI-Q';
    names['SYSTEM_ADJUSTMENT'] = 'ปรับปรุงระบบ';
    names['ADJUSTMENT'] = 'ปรับปรุง';
    return names;
  }, []);

  const summaryAll = useMemo(() => {
    const activePallets: PalletId[] = ['loscam_red', 'loscam_yellow', 'loscam_blue', 'hiq', 'general', 'plastic_circular'];
    return activePallets.map(palletId => {
      const currentStock = stock[selectedBranch]?.[palletId] || 0;
      const palletName = PALLET_TYPES.find(p => p.id === palletId)?.name || palletId;
      const relatedTxs = transactions.filter(tx =>
        tx.palletId === palletId &&
        (tx.source === selectedBranch || tx.dest === selectedBranch) &&
        tx.status !== 'CANCELLED'
      );
      let totalIn = 0, totalOut = 0, pendingIn = 0, pendingOut = 0;
      relatedTxs.forEach(tx => {
        if (tx.dest === selectedBranch) {
          if (tx.status === 'COMPLETED') totalIn += tx.qty;
          else if (tx.status === 'PENDING') pendingIn += tx.qty;
        }
        if (tx.source === selectedBranch) {
          totalOut += tx.qty;
          if (tx.status === 'PENDING') pendingOut += tx.qty;
        }
      });
      const calculated = totalIn - totalOut;
      const discrepancy = currentStock - calculated;
      return { palletId, palletName, currentStock, calculated, totalIn, totalOut, pendingIn, pendingOut, discrepancy, txCount: relatedTxs.length };
    });
  }, [transactions, stock, selectedBranch]);

  const analysis = useMemo((): AnalysisResult => {
    const currentStock = stock[selectedBranch]?.[selectedPallet] || 0;
    const palletName = PALLET_TYPES.find(p => p.id === selectedPallet)?.name || selectedPallet;
    const branchName = branchNames[selectedBranch] || selectedBranch;

    // Filter transactions related to this branch and pallet
    const relatedTxs = transactions
      .filter(tx =>
        tx.palletId === selectedPallet &&
        (tx.source === selectedBranch || tx.dest === selectedBranch) &&
        tx.status !== 'CANCELLED'
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let totalIn = 0;
    let totalOut = 0;
    let pendingIn = 0;
    let pendingOut = 0;
    let runningTotal = 0;
    const issues: string[] = [];

    const txDetails: TransactionDetail[] = relatedTxs.map(tx => {
      let effect = '';
      let qtyChange = 0;

      if (tx.dest === selectedBranch) {
        // Incoming to this branch
        if (tx.status === 'COMPLETED') {
          totalIn += tx.qty;
          qtyChange = tx.qty;
          effect = tx.type === 'ADJUST' || tx.isInitial
            ? `+${tx.qty} (${tx.isInitial ? 'ยอดเริ่มต้น' : 'ปรับปรุง'})`
            : `+${tx.qty} (รับเข้า COMPLETED)`;
        } else if (tx.status === 'PENDING') {
          pendingIn += tx.qty;
          effect = `(+${tx.qty} รอยืนยัน)`;
        }
      }

      if (tx.source === selectedBranch) {
        // Outgoing from this branch (หักทันทีทั้ง PENDING+COMPLETED ตรงกับ addMovementBatch)
        totalOut += tx.qty;
        qtyChange = -tx.qty;
        if (tx.status === 'COMPLETED') {
          effect = tx.type === 'ADJUST' || tx.isInitial
            ? `-${tx.qty} (${tx.isInitial ? 'ยอดเริ่มต้น' : 'ปรับปรุง'})`
            : `-${tx.qty} (จ่ายออก COMPLETED)`;
        } else if (tx.status === 'PENDING') {
          pendingOut += tx.qty;
          effect = `-${tx.qty} (จ่ายออก PENDING - หักแล้ว)`;
        }
      }

      runningTotal += qtyChange;

      let originalInfo = '';
      if (tx.originalPalletId || (tx.originalQty !== undefined && tx.originalQty !== tx.qty)) {
        const origPalletName = PALLET_TYPES.find(p => p.id === (tx.originalPalletId || tx.palletId))?.name || tx.originalPalletId || tx.palletId;
        originalInfo = `เดิม: ${tx.originalQty ?? tx.qty} x ${origPalletName}`;
      }

      return {
        date: new Date(tx.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }),
        docNo: tx.docNo || '-',
        type: tx.type,
        status: tx.status,
        source: branchNames[tx.source] || tx.source,
        dest: branchNames[tx.dest] || tx.dest,
        qty: tx.qty,
        effect,
        runningTotal,
        originalInfo
      };
    });

    // Calculate expected stock (รับเข้า - จ่ายออก)
    const calculatedStock = totalIn - totalOut;

    // Check for discrepancy
    const discrepancy = currentStock - calculatedStock;

    if (discrepancy !== 0) {
      issues.push(`⚠️ ยอดไม่ตรง: สต็อกปัจจุบัน (${currentStock}) ≠ ยอดคำนวณ (${calculatedStock}), ต่างกัน ${discrepancy}`);
    }

    // Check for negative stock
    if (currentStock < 0) {
      issues.push(`🔴 สต็อกติดลบ: ${currentStock} ตัว`);
    }

    // Check for pending transactions
    if (pendingIn > 0) {
      issues.push(`📦 มีรายการรอรับ: ${pendingIn} ตัว`);
    }

    return {
      branch: selectedBranch,
      branchName,
      palletId: selectedPallet,
      palletName,
      currentStock,
      calculatedStock,
      totalIn,
      totalOut,
      pendingIn,
      pendingOut,
      transactions: txDetails,
      discrepancy,
      issues
    };
  }, [transactions, stock, selectedBranch, selectedPallet, branchNames]);

  const handleExportToExcel = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Neo Siam Logistics - Stock Analyzer';
      workbook.created = new Date();

      // Sheet 1: Summary
      const summarySheet = workbook.addWorksheet('สรุปผลวิเคราะห์');
      
      // Header styling
      const headerStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      };

      // Title
      summarySheet.mergeCells('A1:D1');
      const titleCell = summarySheet.getCell('A1');
      titleCell.value = `Stock Analysis Report - ${analysis.branchName}`;
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: 'center' };

      summarySheet.mergeCells('A2:D2');
      const subtitleCell = summarySheet.getCell('A2');
      subtitleCell.value = `พาเลท: ${analysis.palletName} | วันที่: ${new Date().toLocaleDateString('th-TH')}`;
      subtitleCell.alignment = { horizontal: 'center' };
      subtitleCell.font = { italic: true, color: { argb: 'FF64748B' } };

      // Summary data
      summarySheet.addRow([]);
      summarySheet.addRow(['รายการ', 'จำนวน (ตัว)']);
      summarySheet.getRow(4).eachCell(cell => { Object.assign(cell, { style: headerStyle }); });

      const summaryData = [
        ['สต็อกปัจจุบัน (Firebase)', analysis.currentStock],
        ['ยอดคำนวณจาก Transactions', analysis.calculatedStock],
        ['ส่วนต่าง (Discrepancy)', analysis.discrepancy],
        ['', ''],
        ['รวมรับเข้า (COMPLETED)', analysis.totalIn],
        ['รวมจ่ายออก', analysis.totalOut],
        ['รอรับ (PENDING)', analysis.pendingIn],
      ];

      summaryData.forEach(row => {
        const r = summarySheet.addRow(row);
        r.getCell(1).font = { bold: true };
        if (row[0] === 'ส่วนต่าง (Discrepancy)' && analysis.discrepancy !== 0) {
          r.getCell(2).font = { bold: true, color: { argb: 'FFDC2626' } };
        }
      });

      // Issues
      if (analysis.issues.length > 0) {
        summarySheet.addRow([]);
        summarySheet.addRow(['ปัญหาที่พบ']);
        summarySheet.getRow(summarySheet.rowCount).getCell(1).font = { bold: true, color: { argb: 'FFDC2626' } };
        analysis.issues.forEach(issue => {
          summarySheet.addRow([issue]);
        });
      }

      summarySheet.getColumn(1).width = 35;
      summarySheet.getColumn(2).width = 20;

      // Sheet 2: Transactions
      const txSheet = workbook.addWorksheet('รายการ Transactions');
      
      txSheet.columns = [
        { header: 'วันที่', key: 'date', width: 15 },
        { header: 'เลขที่เอกสาร', key: 'docNo', width: 20 },
        { header: 'ประเภท', key: 'type', width: 12 },
        { header: 'สถานะ', key: 'status', width: 12 },
        { header: 'ต้นทาง', key: 'source', width: 20 },
        { header: 'ปลายทาง', key: 'dest', width: 20 },
        { header: 'จำนวน', key: 'qty', width: 10 },
        { header: 'ผลกระทบ', key: 'effect', width: 25 },
        { header: 'ยอดสะสม', key: 'runningTotal', width: 12 },
      ];

      // Header row styling
      txSheet.getRow(1).eachCell(cell => { Object.assign(cell, { style: headerStyle }); });

      // Add data
      analysis.transactions.forEach(tx => {
        const row = txSheet.addRow(tx);
        // Color coding for type
        const typeCell = row.getCell(3);
        if (tx.type === 'IN') {
          typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        } else if (tx.type === 'OUT') {
          typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7AA' } };
        } else if (tx.type === 'ADJUST') {
          typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        }
        // Color coding for status
        const statusCell = row.getCell(4);
        if (tx.status === 'COMPLETED') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        } else if (tx.status === 'PENDING') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        }
      });

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Stock_Analysis_${analysis.branch}_${analysis.palletId}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed:', error);
      alert('ไม่สามารถ Export ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsExporting(false);
    }
  }, [analysis, isExporting]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
            <Search size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">Stock Analyzer</h3>
            <p className="text-xs text-slate-500">ตรวจสอบยอดสต็อกและ Transactions</p>
          </div>
        </div>
        <button
          onClick={handleExportToExcel}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet size={16} />
          {isExporting ? 'กำลัง Export...' : 'Export Excel'}
        </button>
      </div>

      {/* Branch Selector + View Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 mb-1">สาขา</label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value as BranchId)}
            aria-label="เลือกสาขา"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {BRANCHES.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setViewMode('summary')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${viewMode === 'summary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            สรุปทุกพาเลท
          </button>
          <button
            onClick={() => setViewMode('detail')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${viewMode === 'detail' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            รายละเอียด
          </button>
        </div>
      </div>

      {/* ===== SUMMARY ALL PALLETS MODE ===== */}
      {viewMode === 'summary' && (
        <div className="mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="p-3 text-left font-black text-xs uppercase">พาเลท</th>
                  <th className="p-3 text-right font-black text-xs uppercase">รับเข้า</th>
                  <th className="p-3 text-right font-black text-xs uppercase">จ่ายออก</th>
                  <th className="p-3 text-right font-black text-xs uppercase">ยอดคำนวณ</th>
                  <th className="p-3 text-right font-black text-xs uppercase">สต็อกจริง</th>
                  <th className="p-3 text-right font-black text-xs uppercase">ส่วนต่าง</th>
                  <th className="p-3 text-right font-black text-xs uppercase">รอรับ</th>
                  <th className="p-3 text-center font-black text-xs uppercase">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaryAll.map(row => (
                  <tr
                    key={row.palletId}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${row.discrepancy !== 0 ? 'bg-red-50/50' : ''}`}
                    onClick={() => { setSelectedPallet(row.palletId as PalletId); setViewMode('detail'); }}
                  >
                    <td className="p-3 font-bold text-slate-800">{row.palletName}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600">+{row.totalIn.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono font-bold text-red-500">-{row.totalOut.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono font-bold text-blue-600">{row.calculated.toLocaleString()}</td>
                    <td className={`p-3 text-right font-mono font-black ${row.currentStock < 0 ? 'text-red-600' : 'text-slate-900'}`}>{row.currentStock.toLocaleString()}</td>
                    <td className={`p-3 text-right font-mono font-black ${row.discrepancy !== 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {row.discrepancy !== 0 ? row.discrepancy.toLocaleString() : '✓'}
                    </td>
                    <td className="p-3 text-right font-mono text-amber-500">{row.pendingIn > 0 ? row.pendingIn : '-'}</td>
                    <td className="p-3 text-center">
                      {row.discrepancy !== 0 ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-black">ไม่ตรง</span>
                      ) : row.txCount === 0 ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-full text-[10px] font-black">ไม่มีรายการ</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black">ตรง</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300">
                <tr>
                  <td className="p-3 text-right uppercase text-xs text-slate-500">รวมทั้งหมด</td>
                  <td className="p-3 text-right font-mono text-emerald-600">+{summaryAll.reduce((s, r) => s + r.totalIn, 0).toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-red-500">-{summaryAll.reduce((s, r) => s + r.totalOut, 0).toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-blue-600">{summaryAll.reduce((s, r) => s + r.calculated, 0).toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-slate-900">{summaryAll.reduce((s, r) => s + r.currentStock, 0).toLocaleString()}</td>
                  <td className={`p-3 text-right font-mono ${summaryAll.reduce((s, r) => s + r.discrepancy, 0) !== 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {summaryAll.reduce((s, r) => s + r.discrepancy, 0) !== 0 ? summaryAll.reduce((s, r) => s + r.discrepancy, 0).toLocaleString() : '✓'}
                  </td>
                  <td className="p-3 text-right font-mono text-amber-500">{summaryAll.reduce((s, r) => s + r.pendingIn, 0) || '-'}</td>
                  <td className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          {summaryAll.some(r => r.discrepancy !== 0) && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-amber-600" size={16} />
                  <span className="text-sm font-bold text-amber-800">
                    พบส่วนต่าง {summaryAll.filter(r => r.discrepancy !== 0).length} รายการ
                  </span>
                </div>
                <button
                  onClick={async () => {
                    const discrepancies = summaryAll.filter(r => r.discrepancy !== 0);
                    const list = discrepancies.map(r => `${r.palletName}: สต็อก ${r.currentStock} → ${r.calculated} (ส่วนต่าง ${r.discrepancy > 0 ? '+' : ''}${r.discrepancy})`).join('\n');
                    const result = await Swal.fire({
                      title: 'Reconcile ส่วนต่างทั้งหมด?',
                      html: `<div style="text-align:left;font-size:14px;"><p>ระบบจะ<b>เปลี่ยนสต็อกจริง (Firebase)</b> ให้ตรงกับยอดคำนวณจาก Transactions</p><pre style="margin-top:8px;background:#f1f5f9;padding:8px;border-radius:8px;font-size:13px;">${list}</pre></div>`,
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonText: 'Reconcile - ปรับสต็อกจริง',
                      cancelButtonText: 'ยกเลิก',
                      confirmButtonColor: '#dc2626',
                    });
                    if (result.isConfirmed) {
                      for (const row of discrepancies) {
                        await reconcileStock({
                          targetId: selectedBranch,
                          palletId: row.palletId as PalletId,
                          calculatedStock: row.calculated,
                          userName: 'ADMIN',
                        });
                      }
                      Swal.fire({ icon: 'success', title: 'Reconcile สำเร็จ!', text: `ปรับสต็อกจริงแล้ว ${discrepancies.length} รายการ`, timer: 2000, showConfirmButton: false });
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-xs font-black rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                >
                  <RefreshCw size={14} />
                  Reconcile ทั้งหมด
                </button>
              </div>
              <p className="text-[10px] text-amber-600 mt-2">ปรับสต็อกจริง (Firebase) ให้ตรงกับยอดคำนวณจาก Transactions — ไม่สร้าง transaction ใหม่</p>
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-3 italic">* คลิกที่แถวเพื่อดูรายละเอียด Transactions ของพาเลทนั้น</p>
        </div>
      )}

      {/* ===== DETAIL MODE (Original) ===== */}
      {viewMode === 'detail' && (
      <>
      <div className="mb-4">
        <label className="block text-xs font-bold text-slate-500 mb-1">ประเภทพาเลท</label>
        <select
          value={selectedPallet}
          onChange={(e) => setSelectedPallet(e.target.value as PalletId)}
          aria-label="เลือกประเภทพาเลท"
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {PALLET_TYPES.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-4 bg-slate-50 rounded-xl">
          <div className="text-xs font-bold text-slate-400 uppercase">สต็อกปัจจุบัน</div>
          <div className={`text-2xl font-black ${analysis.currentStock < 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {analysis.currentStock}
          </div>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl">
          <div className="text-xs font-bold text-slate-400 uppercase">ยอดคำนวณ</div>
          <div className="text-2xl font-black text-blue-600">{analysis.calculatedStock}</div>
        </div>
        <div className="p-4 bg-emerald-50 rounded-xl">
          <div className="text-xs font-bold text-emerald-500 uppercase">รวมรับเข้า</div>
          <div className="text-2xl font-black text-emerald-600">+{analysis.totalIn}</div>
        </div>
        <div className="p-4 bg-red-50 rounded-xl">
          <div className="text-xs font-bold text-red-400 uppercase">รวมจ่ายออก</div>
          <div className="text-2xl font-black text-red-600">-{analysis.totalOut}</div>
        </div>
      </div>

      {/* Discrepancy Alert */}
      {analysis.discrepancy !== 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 shrink-0" size={20} />
          <div>
            <div className="font-bold text-amber-800">พบความคลาดเคลื่อน!</div>
            <div className="text-sm text-amber-700">
              ส่วนต่าง: <span className="font-black">{analysis.discrepancy}</span> ตัว
              {analysis.discrepancy > 0 
                ? ' (สต็อกจริงมากกว่าที่คำนวณ - อาจมีการ Adjust เพิ่ม)' 
                : ' (สต็อกจริงน้อยกว่าที่คำนวณ - อาจมีการ Adjust ลด หรือ Transaction หาย)'}
            </div>
          </div>
        </div>
      )}

      {analysis.discrepancy === 0 && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-6 flex items-start gap-3">
          <CheckCircle className="text-emerald-600 shrink-0" size={20} />
          <div>
            <div className="font-bold text-emerald-800">ยอดถูกต้อง!</div>
            <div className="text-sm text-emerald-700">
              สต็อกปัจจุบันตรงกับยอดที่คำนวณจาก Transactions
            </div>
          </div>
        </div>
      )}

      {/* Issues List */}
      {analysis.issues.length > 0 && (
        <div className="mb-6">
          <div className="text-xs font-bold text-slate-500 uppercase mb-2">ปัญหาที่พบ</div>
          <div className="space-y-2">
            {analysis.issues.map((issue, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg text-sm font-medium text-slate-700">
                {issue}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History Toggle */}
      <button
        onClick={() => setShowTransactions(!showTransactions)}
        className="w-full flex items-center justify-between p-3 bg-slate-100 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors"
      >
        <span>ประวัติ Transactions ({analysis.transactions.length} รายการ)</span>
        {showTransactions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Transaction History Table */}
      {showTransactions && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="p-2 text-left font-bold">วันที่</th>
                <th className="p-2 text-left font-bold">เลขที่เอกสาร</th>
                <th className="p-2 text-left font-bold">ประเภท</th>
                <th className="p-2 text-left font-bold">สถานะ</th>
                <th className="p-2 text-left font-bold">ต้นทาง</th>
                <th className="p-2 text-left font-bold">ปลายทาง</th>
                <th className="p-2 text-right font-bold">จำนวน</th>
                <th className="p-2 text-left font-bold">ผลกระทบ</th>
                <th className="p-2 text-right font-bold">ยอดสะสม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analysis.transactions.map((tx, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2 text-slate-600">{tx.date}</td>
                  <td className="p-2 font-mono text-blue-600">{tx.docNo}</td>
                  <td className="p-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      tx.type === 'IN' ? 'bg-emerald-100 text-emerald-700' :
                      tx.type === 'OUT' ? 'bg-orange-100 text-orange-700' :
                      tx.type === 'ADJUST' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="p-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      tx.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                      tx.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="p-2 text-slate-600 max-w-[100px] truncate">{tx.source}</td>
                  <td className="p-2 text-slate-600 max-w-[100px] truncate">{tx.dest}</td>
                  <td className="p-2 text-right font-bold text-slate-900">{tx.qty}</td>
                  <td className="p-2">
                    <span className={`font-bold ${
                      tx.effect.startsWith('+') ? 'text-emerald-600' :
                      tx.effect.startsWith('-') ? 'text-red-600' :
                      'text-slate-500'
                    }`}>
                      {tx.effect}
                    </span>
                    {tx.originalInfo && (
                      <div className="text-[10px] text-amber-600 font-bold mt-0.5">📝 {tx.originalInfo}</div>
                    )}
                  </td>
                  <td className="p-2 text-right font-black text-slate-900">{tx.runningTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {analysis.transactions.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              ไม่พบ Transactions สำหรับสาขาและพาเลทที่เลือก
            </div>
          )}
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default StockAnalyzer;
