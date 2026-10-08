import React, { useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { useStock } from '../../contexts/StockContext';
import { isCountFreezeActive } from '../../utils/auditControls';

/**
 * แถบแจ้งทุกหน้าจอว่าอยู่ระหว่างตรวจนับสต็อก
 * เพื่อให้พนักงานรู้ก่อนกดบันทึกว่าระบบปิดรับชั่วคราว และต้องจดลงกระดาษแทน
 */
const CountFreezeBanner: React.FC = () => {
    const { config } = useStock();
    const freeze = config?.countFreeze;
    const [now, setNow] = useState(() => Date.now());

    // เดินนาฬิกาเฉพาะช่วงที่เปิดโหมด เพื่อให้แถบหายเองเมื่อครบเวลา
    useEffect(() => {
        if (!freeze?.active) return;
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(timer);
    }, [freeze?.active, freeze?.until]);

    if (!isCountFreezeActive(freeze, now)) return null;

    const until = new Date(freeze!.until).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    return (
        <div role="alert" className="bg-amber-500 text-white px-4 md:px-8 py-3 flex items-start gap-3 shadow-sm">
            <ClipboardCheck size={20} className="shrink-0 mt-0.5" />
            <div className="text-sm">
                <p className="font-black">อยู่ระหว่างตรวจนับสต็อก — ระบบปิดรับการบันทึกชั่วคราวถึงเวลา {until} น.</p>
                <p className="text-xs font-bold text-amber-50">
                    รายการที่รับหรือจ่ายจริงในช่วงนี้ ให้จดลงกระดาษพร้อมเวลาและเลขที่เอกสาร แล้วบันทึกเข้าระบบหลังเปิดระบบ
                    {freeze!.by ? ` (เปิดโหมดโดย ${freeze!.by})` : ''}
                </p>
            </div>
        </div>
    );
};

export default CountFreezeBanner;
