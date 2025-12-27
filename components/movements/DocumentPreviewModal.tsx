import React from 'react';
import { X, Printer, CheckCircle } from 'lucide-react';
import { Transaction, Branch } from '../../types';
import { BRANCHES } from '../../constants';
// import { StockContext } from '../../contexts/StockContext';

interface DocumentPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    data: {
        source: string;
        dest: string;
        items: { palletId: string; qty: number }[];
        docNo: string;
        date: string;
        carRegistration?: string;
        driverName?: string;
        transportCompany?: string;
        referenceDocNo?: string;
        note?: string;
    } | null;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ isOpen, onClose, onConfirm, data }) => {
    if (!isOpen || !data) return null;

    const sourceBranch = BRANCHES.find(b => b.id === data.source);
    const destBranch = BRANCHES.find(b => b.id === data.dest);

    const handlePrint = () => {
        const printContent = document.getElementById('print-area');
        const originalContents = document.body.innerHTML;

        if (printContent) {
            document.body.innerHTML = printContent.innerHTML;
            window.print();
            document.body.innerHTML = originalContents;
            window.location.reload(); // Reload to restore event listeners
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Printer size={20} className="text-blue-600" />
                        ตรวจสอบเอกสาร (Document Verification)
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors" aria-label="Close Preview">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Document Preview Area (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-12 bg-slate-100 flex justify-center">
                    <div id="print-area" className="bg-white p-12 w-[210mm] min-h-[297mm] shadow-lg text-slate-900 relative">
                        {/* Styles for Print */}
                        <style>
                            {`
                                @media print {
                                    @page { size: A4; margin: 0; }
                                    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                                    #print-area { box-shadow: none; width: 100%; height: 100%; padding: 10mm; }
                                }
                            `}
                        </style>

                        {/* Document Header */}
                        {/* Document Header */}
                        <div className="flex justify-between items-stretch mb-8 gap-12">
                            {/* Boxed Company Info (Left) - Stretched to match height */}
                            <div className="border border-slate-200 px-4 py-6 rounded-2xl flex flex-col items-center gap-5 shadow-xl shadow-slate-100/50 bg-white flex-1 min-w-0">
                                <img src="/logo.png" alt="Company Logo" className="w-28 h-20 object-contain flex-shrink-0" />
                                <div className="w-full text-center px-2">
                                    <h1 className="text-[17px] font-black text-slate-900 whitespace-nowrap mb-1 tracking-tight">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</h1>
                                    <h2 className="text-[11.5px] font-bold text-slate-700 whitespace-nowrap uppercase mb-2 tracking-wide">NEOSIAM LOGISTICS & TRANSPORT CO., LTD.</h2>
                                    <div className="text-[10px] text-slate-500 space-y-1 font-medium leading-tight">
                                        <p className="whitespace-nowrap">159/9-10 หมู่ 7 ตําบลบางม่วง อําเภอเมืองนครสวรรค์ จังหวัดนครสวรรค์ 60000</p>
                                        <p className="whitespace-nowrap text-[9.5px]">159/9-10 Village No.7, Bang Muang, Muang Nakhon Sawan, Nakhon Sawan 60000</p>
                                    </div>
                                </div>
                            </div>

                            {/* Document Info (Right) */}
                            <div className="text-right flex flex-col justify-between items-end min-w-[220px] pr-2 py-1">
                                <div className="mb-3">
                                    <h2 className="text-3xl font-black text-slate-900 leading-none mb-1">ใบส่งคืนพาเลท</h2>
                                    <p className="text-[11px] font-bold text-slate-500 tracking-wider uppercase border-t border-slate-200 pt-1">Pallet Return Form</p>
                                </div>
                                <div className="flex-1 flex flex-col justify-center mb-4">
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Document No.</span>
                                    <span className="text-xl font-mono font-black text-blue-600 tracking-tight whitespace-nowrap">{data.docNo}</span>
                                </div>
                                <div className="flex gap-4 items-center">
                                    <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                                        <img
                                            src={`https://bwipjs-api.metafloor.com/?bcid=qrcode&text=${encodeURIComponent(window.location.origin + '?receive=' + data.docNo)}&scale=3`}
                                            alt="QR Code Receive"
                                            className="h-20 w-20"
                                        />
                                        <p className="text-[7px] text-blue-600 font-bold text-center mt-1 uppercase">Scan to Receive</p>
                                    </div>
                                    <div className="bg-white p-1 rounded-sm">
                                        <img
                                            src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${data.docNo}&scale=2&height=8&incltext=0&textxalign=center`}
                                            alt="Barcode"
                                            className="h-9 w-44"
                                        />
                                        <p className="text-[8px] text-slate-400 text-center font-mono mt-1 tracking-[0.5em]">{data.docNo}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Info Rows */}
                        <div className="grid grid-cols-2 gap-8 mb-6 border-t border-b border-slate-200 py-4">
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">From (ต้นทาง)</h4>
                                <p className="font-bold text-lg text-slate-900">{sourceBranch?.name || data.source}</p>
                                <p className="text-sm text-slate-600">Branch Type: {sourceBranch?.type || 'Standard'}</p>
                                <p className="text-sm text-slate-600">Date: {new Date(data.date).toLocaleDateString('th-TH')}</p>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">To (ปลายทาง)</h4>
                                <p className="font-bold text-lg text-slate-900">{destBranch?.name || data.dest}</p>
                                <p className="text-sm text-slate-600">Branch ID: {data.dest}</p>
                                {data.referenceDocNo && (
                                    <p className="text-sm text-blue-600 font-bold mt-1">Ref: {data.referenceDocNo}</p>
                                )}
                            </div>
                        </div>

                        {/* Transport Info */}
                        <div className="mb-6 bg-slate-50 p-4 rounded border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Transport Details (ข้อมูลการขนส่ง)</h4>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-500 block text-xs">Driver Name</span>
                                    <span className="font-medium">{data.driverName || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-xs">Vehicle / Plate Info</span>
                                    <span className="font-medium">{data.carRegistration || '-'} {data.carRegistration && `(${data.transportCompany || 'Own Fleet'})`}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-xs">Note</span>
                                    <span className="font-medium">{data.note || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="mb-8">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-slate-800">
                                        <th className="py-2 text-left w-12">No.</th>
                                        <th className="py-2 text-left">Description (รายการ)</th>
                                        <th className="py-2 text-center w-24">Type</th>
                                        <th className="py-2 text-right w-24">Qty (จำนวน)</th>
                                        <th className="py-2 text-right w-24">Unit (หน่วย)</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-700">
                                    {data.items.map((item, index) => (
                                        <tr key={index} className="border-b border-slate-100">
                                            <td className="py-3 font-mono text-slate-400">{String(index + 1).padStart(2, '0')}</td>
                                            <td className="py-3 font-bold">
                                                Pallet - {item.palletId.replace(/_/g, ' ').toUpperCase()}
                                            </td>
                                            <td className="py-3 text-center text-xs bg-slate-50 rounded uppercase">
                                                {item.palletId.includes('loscam') ? 'RENTAL' : 'OWN'}
                                            </td>
                                            <td className="py-3 text-right font-bold text-lg">{item.qty}</td>
                                            <td className="py-3 text-right">PCS</td>
                                        </tr>
                                    ))}
                                    {/* Empty rows filler */}
                                    {Array.from({ length: Math.max(0, 5 - data.items.length) }).map((_, i) => (
                                        <tr key={`empty-${i}`} className="border-b border-slate-50">
                                            <td className="py-4">&nbsp;</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-slate-800 bg-slate-50">
                                        <td colSpan={3} className="py-3 text-right font-black text-slate-900 uppercase pr-4">Grand Total (รวมทั้งสิ้น)</td>
                                        <td className="py-3 text-right font-black text-xl text-slate-900">
                                            {data.items.reduce((sum, item) => sum + item.qty, 0)}
                                        </td>
                                        <td className="py-3 text-right font-bold">PCS</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Footer / Signatures */}
                        <div className="mt-auto grid grid-cols-3 gap-8 text-center pt-12">
                            <div className="flex flex-col gap-12">
                                <div className="border-b border-dotted border-slate-400 pb-2"></div>
                                <div>
                                    <p className="font-bold text-sm">ผู้ส่งสินค้า (Sender)</p>
                                    <p className="text-xs text-slate-400">Authorized Signature</p>
                                    <p className="text-xs text-slate-400 mt-1">Date: ____/____/____</p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-12">
                                <div className="border-b border-dotted border-slate-400 pb-2"></div>
                                <div>
                                    <p className="font-bold text-sm">ผู้ขนส่ง (Carrier)</p>
                                    <p className="text-xs text-slate-400">Driver Signature</p>
                                    <p className="text-xs text-slate-400 mt-1">Date: ____/____/____</p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-12">
                                <div className="border-b border-dotted border-slate-400 pb-2"></div>
                                <div>
                                    <p className="font-bold text-sm">ผู้รับสินค้า (Receiver)</p>
                                    <p className="text-xs text-slate-400">Authorized Signature</p>
                                    <p className="text-xs text-slate-400 mt-1">Date: ____/____/____</p>
                                </div>
                            </div>
                        </div>

                        {/* ISO Footer */}
                        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between text-[10px] text-slate-400 font-mono">
                            <span>Form-LOG-001 Rev.02</span>
                            <span>Printed: {new Date().toLocaleString('th-TH')}</span>
                            <span>Page 1 of 1</span>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                    >
                        แก้ไข (Edit)
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-6 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900 transition-colors flex items-center gap-2"
                    >
                        <Printer size={18} /> พิมพ์/ดาวน์โหลด (PDF)
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2"
                    >
                        <CheckCircle size={18} /> ยืนยัน & บันทึก (Confirm & Save)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DocumentPreviewModal;
