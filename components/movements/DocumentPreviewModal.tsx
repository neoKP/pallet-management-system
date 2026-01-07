import React from 'react';
import { X, Printer, CheckCircle } from 'lucide-react';
import { Transaction, Branch } from '../../types';
import { BRANCHES, PALLET_TYPES } from '../../constants';
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

                        {/* Document Header (Letterhead Style) */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex-1">
                                <h1 className="text-[21px] font-black text-slate-900 mb-0.5 leading-tight whitespace-nowrap">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</h1>
                                <h2 className="text-[12px] font-bold text-slate-700 uppercase mb-3 tracking-wide whitespace-nowrap">NEOSIAM LOGISTICS & TRANSPORT CO., LTD.</h2>
                                <div className="text-[11.5px] text-slate-600 space-y-1 leading-tight font-medium">
                                    <p>159/9-10 หมู่ 7 ตําบลบางม่วง อําเภอเมืองนครสวรรค์ จังหวัดนครสวรรค์ 60000</p>
                                    <p>159/9-10 Village No.7, Bang Muang, Muang Nakhon Sawan, Nakhon Sawan 60000</p>
                                    <div className="flex gap-4 mt-2 text-slate-800 font-bold border-t border-slate-100 pt-1">
                                        <span>Tax ID: 0105552087673</span>
                                    </div>
                                    <div className="flex gap-6 text-slate-800">
                                        <span><span className="font-black">Tel:</span> 056-275-841</span>
                                        <span><span className="font-black">Email:</span> info_nw@neosiamlogistics.com</span>
                                    </div>
                                </div>
                            </div>
                            <div className="shrink-0 ml-8 text-right">
                                <img src="/logo.png" alt="Company Logo" className="w-52 object-contain" />
                            </div>
                        </div>

                        {/* Document Title & Identification Section */}
                        <div className="flex justify-between items-end mb-8 border-b-4 border-slate-900 pb-4">
                            <div className="flex-1">
                                <h2 className="text-4xl font-black text-slate-900 leading-none mb-1">ใบส่งคืนพาเลท</h2>
                                <div className="flex items-center gap-3">
                                    <p className="text-sm font-bold text-slate-500 tracking-[0.2em] uppercase">Pallet Return Form</p>
                                    <div className="h-4 w-1 bg-blue-600"></div>
                                    <p className="text-xs font-bold text-blue-600 uppercase">Original (ต้นฉบับ)</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest">Document No.</span>
                                    <span className="text-2xl font-mono font-black text-slate-900 tracking-tight">{data.docNo}</span>
                                </div>
                                <div className="bg-white p-1 rounded border border-slate-200">
                                    <img
                                        src={`https://bwipjs-api.metafloor.com/?bcid=qrcode&text=${encodeURIComponent(window.location.origin + '?receive=' + data.docNo)}&scale=3`}
                                        alt="QR Code"
                                        className="h-16 w-16"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Info Rows */}
                        {/* Info Sections: From & To */}
                        <div className="grid grid-cols-2 gap-0 mb-8 border border-slate-900 overflow-hidden">
                            <div className="p-5 border-r border-slate-900">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 border-b border-slate-100 pb-1">Shipper (ต้นทาง / ผู้ส่ง)</h4>
                                <p className="font-black text-2xl text-slate-900 mb-1">{sourceBranch?.name || data.source}</p>
                                <div className="text-[11px] text-slate-500 space-y-0.5 font-medium italic">
                                    <p>Branch Type: {sourceBranch?.type || 'Standard'}</p>
                                    <p>ID Code: {data.source.toUpperCase()}</p>
                                </div>
                            </div>
                            <div className="p-5">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 border-b border-slate-100 pb-1">Ship To (ปลายทาง / ผู้รับ)</h4>
                                <p className="font-black text-2xl text-slate-900 mb-1">{destBranch?.name || data.dest}</p>
                                <div className="text-[11px] text-slate-500 space-y-0.5 font-medium">
                                    <p>ID Code: {data.dest.toUpperCase()}</p>
                                    {data.referenceDocNo && (
                                        <div className="mt-2 py-1 px-2 border-l-4 border-blue-600 bg-blue-50">
                                            <p className="text-blue-700 font-bold text-[10px] uppercase">ECD / Ref No.</p>
                                            <p className="text-blue-900 font-black text-sm">{data.referenceDocNo}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Quick Info Grid */}
                        <div className="grid grid-cols-4 gap-6 mb-8 border-b-2 border-slate-200 pb-6">
                            <div>
                                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-tighter">Transaction Date</span>
                                <span className="font-bold text-slate-800">{new Date(data.date).toLocaleDateString('th-TH')}</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-tighter">Vehicle Plate No.</span>
                                <span className="font-bold text-slate-800">{data.carRegistration || '-'}</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-tighter">Driver In Charge</span>
                                <span className="font-bold text-slate-800">{data.driverName || '-'}</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-tighter">Transport Company</span>
                                <span className="font-bold text-slate-800">{data.transportCompany || '-'}</span>
                            </div>
                        </div>

                        {/* Pallet Items Table */}
                        <div className="mb-10 min-h-[280px]">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 text-white">
                                        <th className="py-2.5 px-4 text-left font-black uppercase tracking-tighter text-[10px] border border-slate-900 w-12 text-center">No.</th>
                                        <th className="py-2.5 px-4 text-left font-black uppercase tracking-tighter text-[10px] border border-slate-900">Description (รายการพาเลท)</th>
                                        <th className="py-2.5 px-4 text-center font-black uppercase tracking-tighter text-[10px] border border-slate-900 w-28">Type (ประเภท)</th>
                                        <th className="py-2.5 px-4 text-right font-black uppercase tracking-tighter text-[10px] border border-slate-900 w-28">Qty (จำนวน)</th>
                                        <th className="py-2.5 px-4 text-right font-black uppercase tracking-tighter text-[10px] border border-slate-900 w-24">Unit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="py-3 px-4 text-center border border-slate-300 font-mono text-xs">{index + 1}</td>
                                            <td className="py-3 px-4 border border-slate-300">
                                                <div className="font-black text-slate-800">
                                                    Pallet: {PALLET_TYPES.find(p => p.id === item.palletId)?.name || item.palletId}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono italic">#{item.palletId}</div>
                                            </td>
                                            <td className="py-3 px-4 text-center border border-slate-300">
                                                <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${item.palletId.includes('loscam') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-slate-50 text-slate-700 border border-slate-200'}`}>
                                                    {item.palletId.includes('loscam') ? 'Rental' : 'Owned'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right border border-slate-300 text-xl font-black">{item.qty}</td>
                                            <td className="py-3 px-4 text-right border border-slate-300 font-bold">PCS</td>
                                        </tr>
                                    ))}
                                    {Array.from({ length: Math.max(0, 4 - data.items.length) }).map((_, i) => (
                                        <tr key={`empty-${i}`}>
                                            <td className="py-6 border border-slate-200"></td>
                                            <td className="py-6 border border-slate-200"></td>
                                            <td className="py-6 border border-slate-200"></td>
                                            <td className="py-6 border border-slate-200"></td>
                                            <td className="py-6 border border-slate-200"></td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-900 text-white">
                                        <td colSpan={3} className="py-3 px-4 text-right font-black text-[11px] uppercase border border-slate-900 tracking-widest">Total Pallets Transfered (จำนวนรวมทั้งสิ้น)</td>
                                        <td className="py-3 px-4 text-right font-black text-2xl border border-slate-900">
                                            {data.items.reduce((sum, item) => sum + item.qty, 0)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-black border border-slate-900">PCS</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Remarks Section */}
                        <div className="mb-12">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Remarks / Note (หมายเหตุ):</span>
                            <div className="p-3 border-2 border-slate-100 rounded-lg italic text-slate-600 text-sm min-h-[48px] bg-slate-50">
                                {data.note || '-'}
                            </div>
                        </div>

                        {/* Signature Section */}
                        <div className="mt-auto grid grid-cols-3 gap-0 border-2 border-slate-900 rounded-lg overflow-hidden shrink-0">
                            <div className="flex flex-col h-36 border-r-2 border-slate-900 bg-white">
                                <div className="p-2 border-b-2 border-slate-900 text-center font-black text-[9px] uppercase tracking-widest bg-slate-50">Authorized Sender / ผู้ส่งสินค้า</div>
                                <div className="flex-1"></div>
                                <div className="p-4 text-center">
                                    <div className="border-b border-slate-300 mx-2 mb-2"></div>
                                    <p className="text-[8px] font-bold text-slate-400">( Signature & Date )</p>
                                </div>
                            </div>
                            <div className="flex flex-col h-36 border-r-2 border-slate-900 bg-white text-center">
                                <div className="p-2 border-b-2 border-slate-900 text-center font-black text-[9px] uppercase tracking-widest bg-slate-50">Logistics Carrier / ผู้ขนส่ง</div>
                                <div className="flex-1"></div>
                                <div className="p-4 text-center">
                                    <div className="border-b border-slate-300 mx-2 mb-2"></div>
                                    <p className="text-[8px] font-bold text-slate-400">({data.driverName || '..............................'})</p>
                                </div>
                            </div>
                            <div className="flex flex-col h-36 bg-white">
                                <div className="p-2 border-b-2 border-slate-900 text-center font-black text-[9px] uppercase tracking-widest bg-slate-50">Received By / ผู้รับสินค้า</div>
                                <div className="flex-1"></div>
                                <div className="p-4 text-center">
                                    <div className="border-b border-slate-300 mx-2 mb-2"></div>
                                    <p className="text-[8px] font-bold text-slate-400">( Signature & Date )</p>
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
