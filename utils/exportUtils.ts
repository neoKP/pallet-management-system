/**
 * Advanced Export Utilities
 * Following xlsx-skill and pdf-skill best practices
 * 
 * Features:
 * - Professional Excel exports with formatting
 * - PDF document generation
 * - Multi-sheet workbooks
 * - Styled headers and data
 */

import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import { Transaction, BranchId, Stock, PalletId } from '../types';
import { BRANCHES, PALLET_TYPES, EXTERNAL_PARTNERS } from '../constants';

// ============================================
// COLOR CONSTANTS (Following Design System)
// ============================================
const COLORS = {
  primary: '2563EB',      // Blue
  primaryDark: '1E40AF',
  secondary: '6366F1',    // Indigo
  success: '10B981',      // Emerald
  warning: 'F59E0B',      // Amber
  danger: 'EF4444',       // Red
  slate900: '0F172A',
  slate800: '1E293B',
  slate700: '334155',
  slate600: '475569',
  slate400: '94A3B8',
  slate200: 'E2E8F0',
  slate100: 'F1F5F9',
  white: 'FFFFFF',
};

// ============================================
// EXCEL EXPORT UTILITIES
// ============================================

/**
 * Export Stock Summary to Excel
 * Professional multi-sheet workbook with styling
 */
export const exportStockToExcel = async (
  stock: Stock,
  transactions: Transaction[],
  selectedBranch: BranchId | 'ALL'
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Neo Siam Logistics';
  workbook.created = new Date();

  // ===== SHEET 1: Stock Summary =====
  const wsStock = workbook.addWorksheet('Stock Summary', {
    properties: { tabColor: { argb: COLORS.primary } }
  });

  // Title Row
  wsStock.mergeCells('A1:G1');
  const titleCell = wsStock.getCell('A1');
  titleCell.value = 'NEO SIAM LOGISTICS - STOCK SUMMARY REPORT';
  titleCell.font = { bold: true, size: 16, color: { argb: COLORS.white } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate900 } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  wsStock.getRow(1).height = 35;

  // Subtitle Row
  wsStock.mergeCells('A2:G2');
  const subtitleCell = wsStock.getCell('A2');
  subtitleCell.value = `Generated: ${new Date().toLocaleString('th-TH')} | Branch: ${selectedBranch === 'ALL' ? 'All Branches' : BRANCHES.find(b => b.id === selectedBranch)?.name || selectedBranch}`;
  subtitleCell.font = { size: 10, color: { argb: COLORS.slate600 }, italic: true };
  subtitleCell.alignment = { horizontal: 'center' };

  // Headers
  const stockHeaders = ['Branch', ...PALLET_TYPES.map(p => p.name), 'Total'];
  wsStock.addRow([]);
  const headerRow = wsStock.addRow(stockHeaders);
  headerRow.font = { bold: true, color: { argb: COLORS.white } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 25;

  // Data Rows
  const branchesToShow = selectedBranch === 'ALL' 
    ? BRANCHES 
    : BRANCHES.filter(b => b.id === selectedBranch);

  branchesToShow.forEach((branch, idx) => {
    const branchStock = stock[branch.id] || {};
    const rowData = [
      branch.name,
      ...PALLET_TYPES.map(p => branchStock[p.id] || 0),
      PALLET_TYPES.reduce((sum, p) => sum + (branchStock[p.id] || 0), 0)
    ];
    const row = wsStock.addRow(rowData);
    
    // Alternate row colors
    if (idx % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate100 } };
    }
    
    // Bold total column
    row.getCell(stockHeaders.length).font = { bold: true };
  });

  // Total Row
  const totalRowData = [
    'TOTAL',
    ...PALLET_TYPES.map(p => 
      branchesToShow.reduce((sum, b) => sum + (stock[b.id]?.[p.id] || 0), 0)
    ),
    branchesToShow.reduce((sum, b) => 
      PALLET_TYPES.reduce((s, p) => s + (stock[b.id]?.[p.id] || 0), 0) + sum, 0
    )
  ];
  const totalRow = wsStock.addRow(totalRowData);
  totalRow.font = { bold: true, color: { argb: COLORS.white } };
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate800 } };

  // Column widths
  wsStock.columns = [
    { width: 25 },
    ...PALLET_TYPES.map(() => ({ width: 15 })),
    { width: 12 }
  ];

  // Add borders
  wsStock.eachRow((row, rowNumber) => {
    if (rowNumber >= 4) {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: COLORS.slate200 } },
          left: { style: 'thin', color: { argb: COLORS.slate200 } },
          bottom: { style: 'thin', color: { argb: COLORS.slate200 } },
          right: { style: 'thin', color: { argb: COLORS.slate200 } }
        };
      });
    }
  });

  // ===== SHEET 2: Recent Transactions =====
  const wsTx = workbook.addWorksheet('Transactions', {
    properties: { tabColor: { argb: COLORS.secondary } }
  });

  // Title
  wsTx.mergeCells('A1:J1');
  const txTitle = wsTx.getCell('A1');
  txTitle.value = 'TRANSACTION LOG';
  txTitle.font = { bold: true, size: 14, color: { argb: COLORS.white } };
  txTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.secondary } };
  txTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsTx.getRow(1).height = 30;

  // Headers
  const txHeaders = ['Date', 'Doc No', 'Type', 'Source', 'Destination', 'Pallet', 'Qty', 'Status', 'Vehicle', 'Note'];
  wsTx.addRow([]);
  const txHeaderRow = wsTx.addRow(txHeaders);
  txHeaderRow.font = { bold: true, color: { argb: COLORS.white } };
  txHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate700 } };
  txHeaderRow.alignment = { horizontal: 'center' };

  // Filter and add transactions
  const filteredTx = selectedBranch === 'ALL' 
    ? transactions 
    : transactions.filter(t => t.source === selectedBranch || t.dest === selectedBranch);

  filteredTx.slice(0, 500).forEach((tx, idx) => {
    const sourceName = [...BRANCHES, ...EXTERNAL_PARTNERS].find(b => b.id === tx.source)?.name || tx.source;
    const destName = [...BRANCHES, ...EXTERNAL_PARTNERS].find(b => b.id === tx.dest)?.name || tx.dest;
    const palletName = PALLET_TYPES.find(p => p.id === tx.palletId)?.name || tx.palletId;

    const row = wsTx.addRow([
      new Date(tx.date).toLocaleDateString('th-TH'),
      tx.docNo,
      tx.type,
      sourceName,
      destName,
      palletName,
      tx.qty,
      tx.status,
      tx.carRegistration || '-',
      tx.note || '-'
    ]);

    // Color code by status
    if (tx.status === 'CANCELLED') {
      row.font = { color: { argb: COLORS.danger }, strike: true };
    } else if (tx.status === 'PENDING') {
      row.getCell(8).font = { color: { argb: COLORS.warning }, bold: true };
    }

    // Alternate rows
    if (idx % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate100 } };
    }
  });

  // Column widths
  wsTx.columns = [
    { width: 12 }, { width: 18 }, { width: 10 }, { width: 20 }, { width: 20 },
    { width: 18 }, { width: 8 }, { width: 12 }, { width: 15 }, { width: 30 }
  ];

  // Add borders
  wsTx.eachRow((row, rowNumber) => {
    if (rowNumber >= 3) {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: COLORS.slate200 } },
          left: { style: 'thin', color: { argb: COLORS.slate200 } },
          bottom: { style: 'thin', color: { argb: COLORS.slate200 } },
          right: { style: 'thin', color: { argb: COLORS.slate200 } }
        };
      });
    }
  });

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `NSL_Stock_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

/**
 * Export Maintenance Report to Excel
 */
export const exportMaintenanceToExcel = async (
  transactions: Transaction[]
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Neo Siam Logistics';

  const ws = workbook.addWorksheet('Maintenance Report', {
    properties: { tabColor: { argb: COLORS.warning } }
  });

  // Title
  ws.mergeCells('A1:H1');
  const title = ws.getCell('A1');
  title.value = 'MAINTENANCE & REPAIR REPORT';
  title.font = { bold: true, size: 16, color: { argb: COLORS.white } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.warning } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 35;

  // Headers
  const headers = ['Date', 'Doc No', 'Action', 'Original Pallet', 'Target Pallet', 'Qty Sent', 'Qty Repaired', 'Scrap Revenue'];
  ws.addRow([]);
  const headerRow = ws.addRow(headers);
  headerRow.font = { bold: true, color: { argb: COLORS.white } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate800 } };

  // Filter maintenance transactions
  const maintenanceTx = transactions.filter(t => t.type === 'MAINTENANCE');

  maintenanceTx.forEach((tx, idx) => {
    const originalPallet = PALLET_TYPES.find(p => p.id === tx.palletId)?.name || tx.palletId;
    const targetPallet = tx.targetPallet ? (PALLET_TYPES.find(p => p.id === tx.targetPallet)?.name || tx.targetPallet) : '-';

    const row = ws.addRow([
      new Date(tx.date).toLocaleDateString('th-TH'),
      tx.docNo,
      tx.action === 'REPAIR_CONVERT' ? 'Repair/Convert' : 'Discard',
      originalPallet,
      targetPallet,
      tx.qty,
      tx.qtyRepaired || 0,
      tx.scrapRevenue ? `฿${tx.scrapRevenue.toLocaleString()}` : '-'
    ]);

    if (idx % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate100 } };
    }
  });

  // Summary row
  const totalSent = maintenanceTx.reduce((sum, t) => sum + t.qty, 0);
  const totalRepaired = maintenanceTx.reduce((sum, t) => sum + (t.qtyRepaired || 0), 0);
  const totalRevenue = maintenanceTx.reduce((sum, t) => sum + (t.scrapRevenue || 0), 0);

  ws.addRow([]);
  const summaryRow = ws.addRow(['TOTAL', '', '', '', '', totalSent, totalRepaired, `฿${totalRevenue.toLocaleString()}`]);
  summaryRow.font = { bold: true, color: { argb: COLORS.white } };
  summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate900 } };

  // Column widths
  ws.columns = [
    { width: 12 }, { width: 18 }, { width: 15 }, { width: 20 },
    { width: 20 }, { width: 12 }, { width: 12 }, { width: 15 }
  ];

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `NSL_Maintenance_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

// ============================================
// PDF EXPORT UTILITIES
// ============================================

/**
 * Generate Stock Summary PDF Report
 */
export const exportStockToPDF = (
  stock: Stock,
  selectedBranch: BranchId | 'ALL'
): void => {
  const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape for better table fit
  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 15;

  // Header
  pdf.setFillColor(15, 23, 42); // slate-900
  pdf.rect(0, 0, pageWidth, 35, 'F');

  // Accent line
  pdf.setFillColor(37, 99, 235); // blue-600
  pdf.rect(0, 35, pageWidth, 2, 'F');

  // Title
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text('NEO SIAM LOGISTICS', margin, 18);

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('STOCK SUMMARY REPORT', margin, 28);

  // Date
  pdf.setFontSize(10);
  pdf.text(new Date().toLocaleDateString('th-TH', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  }), pageWidth - margin, 18, { align: 'right' });

  // Branch info
  const branchText = selectedBranch === 'ALL' 
    ? 'All Branches' 
    : BRANCHES.find(b => b.id === selectedBranch)?.name || selectedBranch;
  pdf.text(`Branch: ${branchText}`, pageWidth - margin, 28, { align: 'right' });

  // Table
  let y = 50;
  const colWidths = [50, ...PALLET_TYPES.map(() => 35), 30];
  const headers = ['Branch', ...PALLET_TYPES.map(p => p.name.substring(0, 12)), 'Total'];

  // Table header
  pdf.setFillColor(37, 99, 235);
  pdf.rect(margin, y, pageWidth - margin * 2, 10, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');

  let x = margin + 2;
  headers.forEach((header, i) => {
    pdf.text(header, x, y + 7);
    x += colWidths[i];
  });

  y += 12;

  // Table rows
  const branchesToShow = selectedBranch === 'ALL' 
    ? BRANCHES 
    : BRANCHES.filter(b => b.id === selectedBranch);

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(30, 41, 59); // slate-800

  branchesToShow.forEach((branch, idx) => {
    const branchStock = stock[branch.id] || {};
    
    // Alternate row background
    if (idx % 2 === 0) {
      pdf.setFillColor(241, 245, 249); // slate-100
      pdf.rect(margin, y - 2, pageWidth - margin * 2, 8, 'F');
    }

    x = margin + 2;
    pdf.text(branch.name.substring(0, 20), x, y + 4);
    x += colWidths[0];

    let total = 0;
    PALLET_TYPES.forEach((pallet, i) => {
      const qty = branchStock[pallet.id] || 0;
      total += qty;
      pdf.text(qty.toString(), x, y + 4);
      x += colWidths[i + 1];
    });

    pdf.setFont('helvetica', 'bold');
    pdf.text(total.toString(), x, y + 4);
    pdf.setFont('helvetica', 'normal');

    y += 8;
  });

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text(
    'Generated by Neo Siam Logistics Pallet Management System',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  pdf.save(`NSL_Stock_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Generate Transaction Document PDF
 */
export const exportTransactionDocToPDF = (
  transaction: Transaction,
  relatedTransactions: Transaction[]
): void => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 20;

  // Header
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pageWidth, 40, 'F');

  pdf.setFillColor(37, 99, 235);
  pdf.rect(0, 40, pageWidth, 3, 'F');

  // Logo area
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('NEO SIAM LOGISTICS', margin, 20);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('PALLET MOVEMENT DOCUMENT', margin, 30);

  // Doc number
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(transaction.docNo, pageWidth - margin, 25, { align: 'right' });

  // Main content
  let y = 55;
  pdf.setTextColor(30, 41, 59);

  // Info grid
  const drawInfoRow = (label: string, value: string, yPos: number) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(label, margin, yPos);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(30, 41, 59);
    pdf.text(value, margin, yPos + 6);
  };

  const sourceName = [...BRANCHES, ...EXTERNAL_PARTNERS].find(b => b.id === transaction.source)?.name || transaction.source;
  const destName = [...BRANCHES, ...EXTERNAL_PARTNERS].find(b => b.id === transaction.dest)?.name || transaction.dest;

  drawInfoRow('DATE', new Date(transaction.date).toLocaleDateString('th-TH', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  }), y);
  
  drawInfoRow('SOURCE', sourceName, y + 20);
  drawInfoRow('DESTINATION', destName, y + 40);

  if (transaction.carRegistration) {
    drawInfoRow('VEHICLE', transaction.carRegistration, y + 60);
  }

  if (transaction.driverName) {
    drawInfoRow('DRIVER', transaction.driverName, y + 80);
  }

  // Items table
  y = 150;
  pdf.setFillColor(241, 245, 249);
  pdf.rect(margin, y, pageWidth - margin * 2, 10, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(51, 65, 85);
  pdf.text('PALLET TYPE', margin + 5, y + 7);
  pdf.text('QUANTITY', pageWidth - margin - 30, y + 7);

  y += 15;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(30, 41, 59);

  relatedTransactions.forEach(tx => {
    const palletName = PALLET_TYPES.find(p => p.id === tx.palletId)?.name || tx.palletId;
    pdf.text(palletName, margin + 5, y);
    pdf.text(tx.qty.toString(), pageWidth - margin - 30, y);
    y += 8;
  });

  // Total
  y += 5;
  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  const totalQty = relatedTransactions.reduce((sum, t) => sum + t.qty, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL', margin + 5, y);
  pdf.text(totalQty.toString(), pageWidth - margin - 30, y);

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text(
    'This document is system-generated. For inquiries, contact logistics@neosiam.co.th',
    pageWidth / 2,
    280,
    { align: 'center' }
  );

  pdf.save(`NSL_${transaction.docNo}_${new Date().toISOString().split('T')[0]}.pdf`);
};
