import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (decodedText: string) => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const SCANNER_ID = 'qr-reader';

    useEffect(() => {
        if (isOpen) {
            // Delay initialization slightly to ensure the DOM element is rendered
            const timeoutId = setTimeout(() => {
                const scanner = new Html5QrcodeScanner(
                    SCANNER_ID,
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    /* verbose= */ false
                );

                scanner.render(
                    (decodedText) => {
                        // Success callback
                        scanner.clear();
                        onScanSuccess(decodedText);
                    },
                    (error) => {
                        // Error callback (usually just "QR code not found" while scanning)
                        // Silently ignore to keep it smooth
                    }
                );

                scannerRef.current = scanner;
            }, 300);

            return () => {
                clearTimeout(timeoutId);
                if (scannerRef.current) {
                    scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e));
                }
            };
        }
    }, [isOpen, onScanSuccess]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 min-h-screen">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 text-white rounded-xl">
                            <Camera size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900">Scan QR Code</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">คลังสินค้าอัจฉริยะ (Pallet Logistics)</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                        aria-label="Close scanner"
                    >
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                {/* Scanner Area */}
                <div className="p-6 flex flex-col items-center">
                    <div className="w-full aspect-square bg-slate-100 rounded-3xl overflow-hidden border-4 border-slate-50 shadow-inner relative group">
                        <div id={SCANNER_ID} className="w-full h-full"></div>

                        {/* Custom visual guide overlay */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-64 h-64 border-2 border-dashed border-blue-500/50 rounded-2xl animate-pulse"></div>
                        </div>
                    </div>

                    <div className="mt-8 text-center space-y-2">
                        <p className="text-slate-600 font-bold">วาง QR Code ให้ตรงกับช่องสแกน</p>
                        <p className="text-xs text-slate-400 leading-relaxed px-4">
                            เพื่อความเสถียรสูงสุด กรุณาถือนิ่งๆ และให้แสงสว่างเพียงพอ <br />
                            ระบบจะเปิดกล้องและตรวจจับอัตโนมัติ
                        </p>
                    </div>
                </div>

                {/* Footer Footer */}
                <div className="p-6 bg-slate-50 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all text-sm shadow-sm"
                    >
                        ยกเลิกการสแกน
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QRScannerModal;
