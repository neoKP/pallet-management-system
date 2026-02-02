import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Export Analytics Dashboard to PDF (True Full Multi-page Report)
 */
export const exportAnalyticsToPDF = async (
    kpis: any,
    dateRange: string,
    startDate: Date,
    endDate: Date,
    isDarkMode: boolean
): Promise<void> => {
    try {
        // Show loading overlay
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'pdf-loading';
        loadingDiv.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(15px);
            color: white; display: flex; flex-direction: column; align-items: center; justify-content: center;
            z-index: 10000; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        loadingDiv.innerHTML = `
            <div style="border: 5px solid #6366f1; border-top: 5px solid transparent; border-radius: 50%; width: 70px; height: 70px; animation: spin 0.8s linear infinite; margin-bottom: 30px; box-shadow: 0 0 20px #6366f140;"></div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            <div style="font-weight: 900; font-size: 32px; letter-spacing: -0.05em; text-transform: uppercase; background: linear-gradient(135deg, #fff, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Premium Executive Report</div>
            <div style="color: #94a3b8; font-weight: 600; font-size: 16px; margin-top: 15px; letter-spacing: 0.15em;">OPTIMIZING LAYOUT • CAPTURING DATA NODES</div>
        `;
        document.body.appendChild(loadingDiv);

        // Wait for all animations and data to settle
        await new Promise(resolve => setTimeout(resolve, 2000));

        const pdf = new jsPDF('p', 'mm', 'a4'); // Use Portrait for better vertical stacking
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 10;
        const contentWidth = pageWidth - (margin * 2);

        const drawHeader = (pageNumber: number) => {
            // Page bg
            pdf.setFillColor(250, 251, 253);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');

            // Top Banner
            pdf.setFillColor(15, 23, 42);
            pdf.rect(0, 0, pageWidth, pageNumber === 1 ? 45 : 25, 'F');

            // Accent Line
            pdf.setFillColor(99, 102, 241);
            pdf.rect(0, pageNumber === 1 ? 45 : 25, pageWidth, 1.2, 'F');

            // Brand
            pdf.setTextColor(255, 255, 255);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(pageNumber === 1 ? 26 : 18);
            pdf.text('NEO SIAM LOGISTICS', margin, pageNumber === 1 ? 20 : 14);

            if (pageNumber === 1) {
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(148, 163, 184);
                pdf.text('PALLET MANAGEMENT SYSTEM | ADVANCED ANALYTICS ENGINE', margin, 28);

                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'bold');
                pdf.text('EXECUTIVE PERFORMANCE REPORT', margin, 38);
            }

            // Right Info
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(pageNumber === 1 ? 12 : 10);
            const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
            pdf.text(dateStr, pageWidth - margin, pageNumber === 1 ? 20 : 14, { align: 'right' });

            if (pageNumber === 1) {
                pdf.setFontSize(9);
                pdf.setTextColor(148, 163, 184);
                pdf.text(`PERFORMANCE WINDOW: ${startDate.toLocaleDateString('th-TH')} - ${endDate.toLocaleDateString('th-TH')}`, pageWidth - margin, 27, { align: 'right' });
                pdf.text(`REPORT MODE: ${isDarkMode ? 'DARK' : 'LIGHT'} OPTIMIZED`, pageWidth - margin, 33, { align: 'right' });
            }
        };

        const drawFooter = (pageNumber: number) => {
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'italic');
            pdf.setTextColor(148, 163, 184);
            const footerText = `CONFIDENTIAL PROPERTY OF NEO SIAM LOGISTICS • SYSTEM VERSION 3.0 • PAGE ${pageNumber} OF [END]`;
            pdf.text(footerText, pageWidth / 2, pageHeight - 8, { align: 'center' });
        };

        let currentPage = 1;
        drawHeader(currentPage);
        let currentY = 55;

        // Select all elements tagged for export or common high-level containers
        const targets = Array.from(document.querySelectorAll('[data-pdf-export], .cyber-glass-card, .bento-card, .recharts-wrapper, .heatmap-container, .waterfall-container'))
            .filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 50 && rect.height > 50;
            });

        // Filter to get only top-most unique containers to avoid nested captures
        const exportQueue: HTMLElement[] = [];
        const seen = new Set();
        targets.forEach(el => {
            let container = el as HTMLElement;
            // Always prefer the data-pdf-export tagged item if it's an ancestor
            const tagged = el.closest('[data-pdf-export]');
            if (tagged) container = tagged as HTMLElement;

            if (!seen.has(container)) {
                seen.add(container);
                exportQueue.push(container);
            }
        });

        // Loop through queue and capture
        for (let i = 0; i < exportQueue.length; i++) {
            const el = exportQueue[i];

            try {
                const canvas = await html2canvas(el, {
                    scale: 2,
                    backgroundColor: isDarkMode ? '#020617' : '#ffffff',
                    useCORS: true,
                    logging: false,
                    allowTaint: true
                });

                const imgData = canvas.toDataURL('image/png', 0.9);
                const imgWidth = contentWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                // If adding this image exceeds page height, add new page
                if (currentY + imgHeight > pageHeight - 20) {
                    drawFooter(currentPage);
                    pdf.addPage();
                    currentPage++;
                    drawHeader(currentPage);
                    currentY = 35;
                }

                pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight, undefined, 'FAST');
                currentY += imgHeight + 10;

            } catch (err) {
                console.warn('Capture error for index', i, err);
            }
        }

        drawFooter(currentPage);

        // Remove loading
        const loading = document.getElementById('pdf-loading');
        if (loading) document.body.removeChild(loading);

        pdf.save(`NSL_Premium_Full_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        return Promise.resolve();
    } catch (error) {
        const loading = document.getElementById('pdf-loading');
        if (loading) document.body.removeChild(loading);
        console.error('PDF export error:', error);
        throw error;
    }
};

/**
 * Basic Excel Export
 */
export const exportAnalyticsToExcel = (kpis: any, statusData: any, typeData: any, timeSeriesData: any, branchPerformance: any, palletAnalysis: any, dateRange: string, startDate: Date, endDate: Date) => {
    try {
        const XLSX = (window as any).XLSX;
        if (!XLSX) return;
        const wb = XLSX.utils.book_new();
        const data = [
            ['Neo Siam Logistics - Analytics Data'],
            [`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`],
            [],
            ['KPI Name', 'Value'],
            ['Total Activity', kpis.totalTransactions],
            ['Current Stock', kpis.totalPalletsInStock],
            ['In Transit', kpis.totalPalletsInTransit],
            ['Utilization (%)', kpis.utilizationRate],
            ['Maintenance (%)', kpis.maintenanceRate]
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Executive Summary');
        XLSX.writeFile(wb, `NSL_Data_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
        console.error('Excel Export Failed', e);
    }
};
