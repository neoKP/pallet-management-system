import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react';

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (decodedText: string) => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const SCANNER_ID = 'qr-reader-container';
    const [error, setError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);

    const stopScanner = async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try {
                await html5QrCodeRef.current.stop();
            } catch (err) {
                console.error("Failed to stop scanner", err);
            }
        }
    };

    const startScanner = async () => {
        setIsInitializing(true);
        setError(null);

        // Wait for DOM
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const html5QrCode = new Html5Qrcode(SCANNER_ID);
            html5QrCodeRef.current = html5QrCode;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await html5QrCode.start(
                { facingMode: "environment" }, // Prefer back camera
                config,
                (decodedText) => {
                    // Success
                    stopScanner().then(() => onScanSuccess(decodedText));
                },
                (errorMessage) => {
                    // Constant scanning errors are normal (no QR found)
                }
            );
            setIsInitializing(false);
        } catch (err: any) {
            console.error("Scanner start error:", err);
            setIsInitializing(false);
            if (err.includes("NotFoundException")) {
                setError("ไม่พบกล้องในอุปกรณ์ของคุณ");
            } else if (err.includes("NotAllowedError")) {
                setError("กรุณาอนุญาตให้เข้าถึงกล้องเพื่อสแกน QR Code");
            } else {
                setError("เกิดข้อผิดพลาดในการเปิดกล้อง กรุณาลองใหม่อีกครั้ง");
            }
        }
    };

    useEffect(() => {
        if (isOpen) {
            startScanner();
        } else {
            stopScanner();
        }

        return () => {
            stopScanner();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                            <Camera size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Smart Scanner</h3>
                            <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Neosiam Logistics</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-all active:scale-95"
                        aria-label="Close scanner"
                        title="ปิดตัวสแกน"
                    >
                        <X size={28} className="text-slate-400 font-bold" />
                    </button>
                </div>

                {/* Scanner Viewport */}
                <div className="p-8 flex flex-col items-center">
                    <div className="w-full aspect-square bg-slate-900 rounded-[2rem] overflow-hidden relative shadow-2xl border-8 border-white">
                        {/* THE SCANNER DIV */}
                        <div id={SCANNER_ID} className="w-full h-full object-cover"></div>

                        {/* Overlays */}
                        {isInitializing && !error && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
                                <RefreshCw className="animate-spin text-blue-500" size={32} />
                                <span className="text-sm font-bold tracking-wide animate-pulse">กำลังเปิดกล้อง...</span>
                            </div>
                        )}

                        {error && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white p-8 text-center gap-4">
                                <AlertCircle size={48} className="text-red-500" />
                                <p className="font-bold text-lg">{error}</p>
                                <button
                                    onClick={startScanner}
                                    className="mt-2 px-6 py-2 bg-blue-600 rounded-full font-bold hover:bg-blue-700 transition-colors"
                                >
                                    ลองใหม่
                                </button>
                            </div>
                        )}

                        {/* Scanner Scanner Frame Guide */}
                        {!error && !isInitializing && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className="w-64 h-64 border-2 border-blue-500/80 rounded-3xl relative">
                                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
                                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
                                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
                                    {/* Scanning Line Animation */}
                                    <div className="absolute left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.8)] animate-scan-line top-0"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 text-center px-4">
                        <h4 className="text-slate-800 font-black text-lg mb-2">สแกนรหัสเพื่อรับของ</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            ถือกล้องให้นิ่งและวาง QR Code ให้อยู่ในกรอบสีฟ้า <br />
                            ระบบจะบันทึกรับเข้าให้อัตโนมัติทันที
                        </p>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-8 bg-slate-50 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-100 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
                    >
                        กลับไปหน้าหลัก
                    </button>
                    <p className="mt-4 text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest">Secure QR Processing v2.0</p>
                </div>
            </div>

            <style>{`
                @keyframes scan-line {
                    0% { top: 0% }
                    100% { top: 100% }
                }
                .animate-scan-line {
                    animation: scan-line 2s linear infinite;
                }
                #qr-reader-container video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    border-radius: 1.5rem;
                }
            `}</style>
        </div>
    );
};

export default QRScannerModal;
