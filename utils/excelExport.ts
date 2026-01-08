import ExcelJS from 'exceljs';
import { Transaction, BranchId } from '../types';
import { BRANCHES } from '../constants';

export const handleExportToExcel = async (displayTransactions: Transaction[], selectedBranch: BranchId | 'ALL') => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory Log');

    // Define Columns
    worksheet.columns = [
        { header: 'วันที่ (Date)', key: 'date', width: 15 },
        { header: 'เลขที่เอกสาร (Doc No)', key: 'docNo', width: 20 },
        { header: 'ประเภท (Type)', key: 'type', width: 10 },
        { header: 'ต้นทาง (Source)', key: 'source', width: 15 },
        { header: 'ปลายทาง (Dest)', key: 'dest', width: 15 },
        { header: 'พาเลท (Pallet)', key: 'palletId', width: 15 },
        { header: 'รับเข้า (In)', key: 'qtyIn', width: 10 },
        { header: 'จ่ายออก (Out)', key: 'qtyOut', width: 10 },
        { header: 'เอกสารอ้างอิง (Ref Doc)', key: 'referenceDocNo', width: 20 },
        { header: 'ทะเบียนรถ (Vehicle)', key: 'carRegistration', width: 15 },
        { header: 'คนขับ (Driver)', key: 'driverName', width: 20 },
        { header: 'บริษัทขนส่ง (Transit Co)', key: 'transportCompany', width: 20 },
        { header: 'หมายเหตุ (Note)', key: 'note', width: 30 }
    ];

    // Process Data
    displayTransactions.forEach(t => {
        const isAdjustment = t.type === 'ADJUST';
        let qtyIn = 0;
        let qtyOut = 0;

        if (isAdjustment) {
            const isSourceSystem = ['ADJUSTMENT', 'SYSTEM_ADJUST', 'SYSTEM'].includes(t.source);
            if (isSourceSystem) qtyIn = t.qty; else qtyOut = t.qty;
        } else if (selectedBranch !== 'ALL') {
            if (t.dest === selectedBranch) qtyIn = t.qty;
            if (t.source === selectedBranch) qtyOut = t.qty;
        } else {
            const isInternal = BRANCHES.some(b => b.id === t.source) && BRANCHES.some(b => b.id === t.dest);
            if (isInternal) {
                qtyIn = t.qty;
                qtyOut = t.qty;
            } else {
                qtyIn = t.type === 'IN' ? t.qty : 0;
                qtyOut = t.type === 'OUT' ? t.qty : 0;
            }
        }

        const row = worksheet.addRow({
            date: t.date,
            docNo: t.docNo,
            type: t.status === 'CANCELLED' ? 'CANCELLED' : t.type,
            source: t.source,
            dest: t.dest,
            palletId: t.palletId,
            qtyIn: qtyIn || '-',
            qtyOut: qtyOut || '-',
            referenceDocNo: t.referenceDocNo || '-',
            carRegistration: t.carRegistration || '-',
            driverName: t.driverName || '-',
            transportCompany: t.transportCompany || '-',
            note: t.note || '-'
        });

        // If cancelled, make row look subtle
        if (t.status === 'CANCELLED') {
            row.font = { color: { argb: 'FFAAAAAA' }, strike: true };
        }
    });

    // Styling Header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // slate-800
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
        row.eachCell(cell => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    // Generate and Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `inventory_log_${new Date().toISOString().split('T')[0]}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
};
