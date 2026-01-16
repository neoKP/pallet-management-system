import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { KPIMetrics, ChartDataPoint, TimeSeriesData, BranchPerformance, PalletTypeAnalysis } from '../services/analyticsService';

/**
 * Export Analytics Dashboard to PDF (Single Page A4 Landscape)
 */
export const exportAnalyticsToPDF = async (
    kpis: KPIMetrics,
    dateRange: string,
    startDate: Date,
    endDate: Date,
    isDarkMode: boolean
): Promise<void> => {
    try {
        // Show loading
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'pdf-loading';
        loadingDiv.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8); color: white; padding: 20px 40px;
            border-radius: 10px; z-index: 9999; font-size: 16px;
        `;
        loadingDiv.textContent = 'กำลังสร้าง PDF...';
        document.body.appendChild(loadingDiv);

        await new Promise(resolve => setTimeout(resolve, 500));

        // Create PDF Landscape
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pageWidth = 297;
        const pageHeight = 210;

        // Header
        pdf.setFillColor(99, 102, 241);
        pdf.rect(0, 0, pageWidth, 20, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Analytics Dashboard Report', pageWidth / 2, 10, { align: 'center' });
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${startDate.toLocaleDateString('en-US')} - ${endDate.toLocaleDateString('en-US')}`, pageWidth / 2, 16, { align: 'center' });

        // KPI Cards
        const kpiY = 28;
        const kpiW = 56;
        const kpiH = 22;
        const kpiGap = 3;
        const kpiData = [
            { label: 'Total Transactions', value: kpis.totalTransactions.toString(), trend: `${kpis.trend === 'up' ? '↑' : kpis.trend === 'down' ? '↓' : '→'} ${kpis.trendPercentage}%`, color: [99, 102, 241] },
            { label: 'Pallets in Stock', value: kpis.totalPalletsInStock.toString(), trend: '', color: [139, 92, 246] },
            { label: 'In Transit', value: kpis.totalPalletsInTransit.toString(), trend: '', color: [59, 130, 246] },
            { label: 'Utilization', value: `${kpis.utilizationRate}%`, trend: '', color: [16, 185, 129] },
            { label: 'Maintenance', value: `${kpis.maintenanceRate}%`, trend: '', color: [245, 158, 11] },
        ];

        kpiData.forEach((kpi, i) => {
            const x = 8 + i * (kpiW + kpiGap);
            pdf.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
            pdf.roundedRect(x, kpiY, kpiW, kpiH, 2, 2, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.text(kpi.label, x + kpiW / 2, kpiY + 6, { align: 'center' });
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text(kpi.value, x + kpiW / 2, kpiY + 14, { align: 'center' });
            if (kpi.trend) {
                pdf.setFontSize(7);
                pdf.setFont('helvetica', 'normal');
                pdf.text(kpi.trend, x + kpiW / 2, kpiY + 19, { align: 'center' });
            }
        });

        // Charts
        const chartsY = kpiY + kpiH + 5;
        const chartH = pageHeight - chartsY - 12;
        const chartElements = Array.from(document.querySelectorAll('.recharts-wrapper')).slice(0, 3);
        let chartX = 8;
        const chartW = (pageWidth - 16 - 8) / 3;

        for (const element of chartElements) {
            if (element) {
                try {
                    const canvas = await html2canvas(element as HTMLElement, {
                        scale: 1.5,
                        backgroundColor: isDarkMode ? '#1e1b4b' : '#ffffff',
                        logging: false,
                    });
                    const imgData = canvas.toDataURL('image/png', 0.95);
                    pdf.addImage(imgData, 'PNG', chartX, chartsY, chartW, chartH);
                    chartX += chartW + 4;
                } catch (error) {
                    console.warn('Chart capture error:', error);
                }
            }
        }

        // Footer
        pdf.setFontSize(7);
        pdf.setTextColor(128, 128, 128);
        pdf.text(
            `Generated: ${new Date().toLocaleString('en-US')} | Neo Siam Logistics`,
            pageWidth / 2,
            pageHeight - 5,
            { align: 'center' }
        );

        // Remove loading
        const loading = document.getElementById('pdf-loading');
        if (loading) document.body.removeChild(loading);

        // Save
        pdf.save(`Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`);

        return Promise.resolve();
    } catch (error) {
        const loading = document.getElementById('pdf-loading');
        if (loading) document.body.removeChild(loading);
        console.error('PDF export error:', error);
        throw error;
    }
};

/**
 * Export Analytics Data to Excel
 */
export const exportAnalyticsToExcel = (
    kpis: KPIMetrics,
    statusData: ChartDataPoint[],
    typeData: ChartDataPoint[],
    timeSeriesData: TimeSeriesData[],
    branchPerformance: BranchPerformance[],
    palletAnalysis: PalletTypeAnalysis[],
    dateRange: string,
    startDate: Date,
    endDate: Date
): void => {
    try {
        const wb = XLSX.utils.book_new();

        // Sheet 1: KPIs
        const kpiSheet = [
            ['Analytics Dashboard Report'],
            [`Period: ${startDate.toLocaleDateString('th-TH')} - ${endDate.toLocaleDateString('th-TH')}`],
            [],
            ['Key Performance Indicators'],
            ['Metric', 'Value', 'Trend'],
            ['รายการทั้งหมด', kpis.totalTransactions, `${kpis.trend === 'up' ? '↑' : kpis.trend === 'down' ? '↓' : '→'} ${kpis.trendPercentage}%`],
            ['พาเลทในสต็อก', kpis.totalPalletsInStock, ''],
            ['ยอดระหว่างทาง', kpis.totalPalletsInTransit, ''],
            ['อัตราการใช้งาน (%)', kpis.utilizationRate, ''],
            ['อัตราซ่อมบำรุง (%)', kpis.maintenanceRate, ''],
        ];
        const ws1 = XLSX.utils.aoa_to_sheet(kpiSheet);
        ws1['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }];
        ws1['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
            { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } },
        ];
        XLSX.utils.book_append_sheet(wb, ws1, 'KPIs Summary');

        // Sheet 2: Status
        const statusSheet = [
            ['Transaction Status Distribution'],
            [],
            ['Status', 'Count', 'Percentage'],
            ...statusData.map(item => [item.name, item.value, `${item.percentage}%`])
        ];
        const ws2 = XLSX.utils.aoa_to_sheet(statusSheet);
        ws2['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
        ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
        XLSX.utils.book_append_sheet(wb, ws2, 'Transaction Status');

        // Sheet 3: Types
        const typeSheet = [
            ['Transaction Type Distribution'],
            [],
            ['Type', 'Quantity', 'Percentage'],
            ...typeData.map(item => [item.name, item.value, `${item.percentage}%`])
        ];
        const ws3 = XLSX.utils.aoa_to_sheet(typeSheet);
        ws3['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
        ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
        XLSX.utils.book_append_sheet(wb, ws3, 'Transaction Types');

        // Sheet 4: Time Series
        const timeSeriesSheet = [
            ['Movement Trends Over Time'],
            [],
            ['Date', 'In', 'Out', 'Maintenance', 'Total'],
            ...timeSeriesData.map(item => [item.date, item.in, item.out, item.maintenance, item.total])
        ];
        const ws4 = XLSX.utils.aoa_to_sheet(timeSeriesSheet);
        ws4['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 10 }];
        ws4['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
        XLSX.utils.book_append_sheet(wb, ws4, 'Time Series');

        // Sheet 5: Branches
        const branchSheet = [
            ['Branch Performance Analysis'],
            [],
            ['Branch', 'Total Stock', 'In Transactions', 'Out Transactions', 'Utilization Rate (%)'],
            ...branchPerformance.map(item => [item.branchName, item.totalStock, item.inTransactions, item.outTransactions, item.utilizationRate])
        ];
        const ws5 = XLSX.utils.aoa_to_sheet(branchSheet);
        ws5['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];
        ws5['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
        XLSX.utils.book_append_sheet(wb, ws5, 'Branch Performance');

        // Sheet 6: Pallets
        const palletSheet = [
            ['Pallet Type Analysis'],
            [],
            ['Pallet Type', 'Total Stock', 'In Count', 'Out Count', 'Maintenance', 'Turnover Rate (%)'],
            ...palletAnalysis.map(item => [item.palletName, item.totalStock, item.inCount, item.outCount, item.maintenanceCount, item.turnoverRate])
        ];
        const ws6 = XLSX.utils.aoa_to_sheet(palletSheet);
        ws6['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 20 }];
        ws6['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
        XLSX.utils.book_append_sheet(wb, ws6, 'Pallet Analysis');

        // Save
        XLSX.writeFile(wb, `Analytics_Data_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (error) {
        console.error('Excel export error:', error);
        throw error;
    }
};
