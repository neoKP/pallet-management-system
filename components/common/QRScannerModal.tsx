import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react';

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (decodedText: string) => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
    const SCANNER_ID = 'qr-reader-container';
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);

    // ใช้ Ref เพื่อป้องกันการสั่ง Start/Stop ซ้อนกัน
    const isScannerRunning = useRef(false);

    const cleanupScanner = async () => {
        if (html5QrCodeRef.current && isScannerRunning.current) {
            try {
                await html5QrCodeRef.current.stop();
                // ล้างค่าหลังจาก stop เสร็จ
                html5QrCodeRef.current.clear();
                isScannerRunning.current = false;
            } catch (err) {
                console.warn("Failed to stop scanner (usually harmless):", err);
            }
        }
    };

    const startScanner = async () => {
        setError(null);
        setIsInitializing(true);

        // รอให้ DOM render ID ออกมาก่อน
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            // ป้องกันการสร้าง instance ซ้ำ
            if (!html5QrCodeRef.current) {
                html5QrCodeRef.current = new Html5Qrcode(SCANNER_ID, {
                    verbose: false,
                    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] // อ่านเฉพาะ QR เพื่อความเร็ว
                });
            }

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            // ถ้ากำลังรันอยู่ ไม่ต้อง start ใหม่
            if (isScannerRunning.current) return;

            await html5QrCodeRef.current.start(
                { facingMode: "environment" }, // บังคับกล้องหลัง
                config,
                (decodedText) => {
                    // เมื่อสแกนติด
                    cleanupScanner().then(() => {
                        onScanSuccess(decodedText);
                        onClose(); // ปิด Modal ทันทีเมื่อสำเร็จ
                    });
                },
                () => {
                    // scanning error (ไม่ต้องทำอะไร รอเฟรมถัดไป)
                }
            );

            isScannerRunning.current = true;
            setIsInitializing(false);

        } catch (err: any) {
            console.error("Scanner start error:", err);
            setIsInitializing(false);
            isScannerRunning.current = false;

            if (typeof err === 'string' && err.includes("NotFoundException")) {
                setError("ไม่พบกล้องในอุปกรณ์นี้");
            } else if (typeof err === 'string' && err.includes("NotAllowedError")) {
                setError("กรุณากด 'อนุญาต' ให้เข้าถึงกล้อง");
            } else {
                // กรณีอื่นๆ เช่น Browser ไม่รองรับ หรือไม่ใช่ HTTPS
                setError("ไม่สามารถเปิดกล้องได้ (ตรวจสอบสิทธิ์หรือการเชื่อมต่อ HTTPS)");
            }
        }
    };

    useEffect(() => {
        if (isOpen) {
            startScanner();
        } else {
            // เมื่อปิด Modal ให้เคลียร์กล้อง
            cleanupScanner();
        }

        // Cleanup function เมื่อ component unmount
        return () => {
            cleanupScanner();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                            <Camera size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Scan QR Code</h3>
                            <p className="text-[10px] text-slate-500 font-medium">Neosiam Logistics System</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            cleanupScanner();
                            onClose();
                        }}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        aria-label="Close scanner"
                        title="ปิดตัวสแกน"
                    >
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                {/* Scanner Viewport */}
                <div className="p-6 flex flex-col items-center bg-slate-50">
                    <div className="w-full aspect-square bg-black rounded-2xl overflow-hidden relative shadow-inner border-4 border-white">

                        {/* ID สำหรับ Library */}
                        <div id={SCANNER_ID} className="w-full h-full"></div>

                        {/* Loading State */}
                        {isInitializing && !error && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white z-20">
                                <RefreshCw className="animate-spin mb-2" />
                                <span className="text-xs font-medium">กำลังเปิดกล้อง...</span>
                            </div>
                        )}

                        {/* Error State */}
                        {error && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white p-4 text-center z-20">
                                <AlertCircle size={32} className="text-red-500 mb-2" />
                                <p className="text-xs mb-4">{error}</p>
                                <button
                                    onClick={() => {
                                        cleanupScanner(); // เคลียร์ของเก่าก่อน
                                        setTimeout(startScanner, 300); // ลองเริ่มใหม่
                                    }}
                                    className="px-4 py-1.5 bg-blue-600 rounded-full text-xs font-bold"
                                >
                                    ลองใหม่
                                </button>
                            </div>
                        )}

                        {/* Overlay Guide (แสดงเฉพาะตอนกล้องติดแล้ว) */}
                        {!error && !isInitializing && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                                {/* กรอบสแกน */}
                                <div className="w-48 h-48 border-2 border-blue-500/50 rounded-lg relative">
                                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 -mt-0.5 -ml-0.5 rounded-tl"></div>
                                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 -mt-0.5 -mr-0.5 rounded-tr"></div>
                                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 -mb-0.5 -ml-0.5 rounded-bl"></div>
                                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 -mb-0.5 -mr-0.5 rounded-br"></div>

                                    {/* เส้นเลเซอร์วิ่ง */}
                                    <div className="absolute left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-scan-line"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <p className="mt-4 text-center text-slate-400 text-xs">
                        วาง QR Code ให้อยู่ในกรอบเพื่อรับสินค้าเข้าคลัง
                    </p>
                </div>
            </div>

            {/* CSS Overrides */}
            <style>{`
                @keyframes scan-line {
                    0% { top: 10%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }
                .animate-scan-line {
                    animation: scan-line 2s ease-in-out infinite;
                }
                /* ซ่อน Element อื่นๆ ของ Library ที่ไม่ต้องการ */
                #qr-reader-container img { display: none; }
                #qr-reader-container video {
                    object-fit: cover !important;
                    width: 100% !important;
                    height: 100% !important;
                    border-radius: 1rem;
                }
            `}</style>
        </div>
    );
};

export default QRScannerModal;
