import { PALLET_TYPES, VEHICLE_TYPES, EXTERNAL_PARTNERS } from '../constants';
import { Partner } from '../types';

/**
 * ปลายทางที่ใช้ส่งข้อความ Telegram
 *
 * เว็บไม่ถือ bot token เองอีกต่อไป แต่เรียกผ่าน serverless function
 * ที่ api/telegram/send.ts ซึ่งรันบนเซิร์ฟเวอร์และเป็นผู้ถือ token
 *
 * เหตุผล: โค้ดที่รันในเบราว์เซอร์ซ่อนความลับไม่ได้ ค่าใด ๆ ที่ฝังตอน build
 * ผู้ใช้เปิด DevTools ก็อ่านได้ ถ้า bot token หลุดออกไป คนอื่นจะส่งข้อความ
 * ในนามบริษัท อ่านข้อความในกลุ่ม หรือลบ webhook ได้ทั้งหมด
 */
const TELEGRAM_API_ENDPOINT = '/api/telegram/send';

/**
 * Helper to escape special characters for Telegram MarkdownV2
 */
export const escapeMarkdown = (text: string) => {
    if (!text) return '';
    // Characters that need escaping in MarkdownV2
    return text.toString().replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
};

/**
 * Send a message to a Telegram chat
 * @param chatId The chat ID to send the message to
 * @param text The message text (MarkdownV2 supported)
 */
export const sendMessage = async (chatId: string, text: string) => {
    if (!chatId || !text) return;

    /** ยิงไปที่ serverless function ซึ่งเป็นผู้ถือ token จริง */
    const post = (payload: { chatId: string; text: string; parseMode: 'MarkdownV2' | 'HTML' }) =>
        fetch(TELEGRAM_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

    try {
        const response = await post({ chatId, text, parseMode: 'MarkdownV2' });
        const data = await response.json().catch(() => ({ ok: false, error: 'อ่านผลลัพธ์ไม่ได้' }));

        // Vite ธรรมดา (npm run dev / vite preview) ไม่เสิร์ฟ API route จึงได้ 404
        // แจ้งให้ชัดว่าต้องใช้คำสั่งใด ไม่ปล่อยให้เงียบหายจนเข้าใจผิดว่าระบบพัง
        if (response.status === 404) {
            console.warn(
                '[Telegram] ไม่พบ /api/telegram/send — การแจ้งเตือนจะไม่ทำงานในโหมดนี้\n' +
                'ถ้าต้องการทดสอบการแจ้งเตือนในเครื่อง ให้ใช้ "npm run dev:vercel" แทน "npm run dev"'
            );
            return data;
        }

        if (!data.ok) {
            console.error('Telegram API Error:', data.error);

            // MarkdownV2 มีอักขระที่ต้อง escape เยอะ ถ้า escape พลาดจะส่งไม่ผ่าน
            // จึงลองส่งซ้ำแบบถอด escape ออก เพื่อไม่ให้การแจ้งเตือนหายทั้งข้อความ
            // ใช้ optional chaining กัน error เป็น undefined (เคยทำให้เกิด TypeError)
            if (typeof data.error === 'string' && data.error.includes("can't parse")) {
                await post({ chatId, text: text.replace(/[\\]/g, ''), parseMode: 'HTML' });
            }
        }
        return data;
    } catch (error) {
        // การแจ้งเตือนล้มเหลวต้องไม่ทำให้การบันทึกพาเลทพังตามไปด้วย
        console.error('Failed to send Telegram message:', error);
    }
};

/**
 * Helper to get pallet name
 */
const getPalletName = (palletId: string) => {
    return PALLET_TYPES.find(p => p.id === palletId)?.name || palletId;
};

/**
 * Helper to get vehicle name
 */
const getVehicleName = (vehicleId: string) => {
    return VEHICLE_TYPES.find(v => v.id === vehicleId)?.name || vehicleId;
};

/**
 * Helper to format transport info
 */
const formatTransportInfo = (data: any) => {
    if (!data.carRegistration && !data.driverName && !data.vehicleType) return '';

    return `\n*🚛 ข้อมูลการขนส่ง:*
• ประเภท: ${escapeMarkdown(getVehicleName(data.vehicleType || '-'))}
• ทะเบียน: \`${escapeMarkdown(data.carRegistration || '-')}\`
• คนขับ: ${escapeMarkdown(data.driverName || '-')}
• บริษัท: ${escapeMarkdown(data.transportCompany || '-')}`;
};

/**
 * Format a Pallet Request for Telegram
 */
export const formatPalletRequest = (req: any, branchName: string, targetName?: string) => {
    const priorityEmoji = req.priority === 'URGENT' ? '🔴' : '⚪';
    const itemsText = req.items.map((item: any) => `    • ${escapeMarkdown(getPalletName(item.palletId))}: *${item.qty}* ชิ้น`).join('\n');

    return `🔔 *มีคำขอรับพาเลทใหม่\\!*
▬▬▬▬▬▬▬▬▬▬▬▬
*เลขที่คำขอ:* \`${escapeMarkdown(req.requestNo)}\`
*จากสาขา:* ${escapeMarkdown(branchName)}
*ต้องการให้ส่งที่:* ${escapeMarkdown(targetName || 'ไม่ระบุ')}
*รายการ:*
${itemsText}
*วัตถุประสงค์:* ${escapeMarkdown(req.purpose)}
*ความสำคัญ:* ${priorityEmoji} ${escapeMarkdown(req.priority)}
▬▬▬▬▬▬▬▬▬▬▬▬
_กรุณาตรวจสอบและอนุมัติในระบบ_`;
};

/**
 * Format a Processing Notification (Shipped/Dispatch)
 */
export const formatShipmentNotification = (req: any, docNo: string, sourceName: string, destName: string, transportData?: any) => {
    const itemsText = req.items?.map((item: any) => `    • ${escapeMarkdown(getPalletName(item.palletId))}: *${item.qty}* ชิ้น`).join('\n') || '';
    const transportPart = transportData ? formatTransportInfo(transportData) : '';

    return `🚚 *แจ้งส่งมอบพาเลท\\!*
▬▬▬▬▬▬▬▬▬▬▬▬
*อ้างอิงคำขอ:* \`${escapeMarkdown(req.requestNo)}\`
*เลขที่เอกสาร:* \`${escapeMarkdown(docNo)}\`
*ต้นทาง:* ${escapeMarkdown(sourceName)}
*ปลายทาง:* ${escapeMarkdown(destName)}
*รายการ:*
${itemsText}
*สถานะ:* ✅ จัดส่งเรียบร้อยแล้ว
${transportPart}
▬▬▬▬▬▬▬▬▬▬▬▬
_พาเลทกำลังเดินทางไปยังสาขาปลายทาง_`;
};

/**
 * Format a Movement Notification (IN/OUT)
 */
export const formatMovementNotification = (data: any, sourceName: string, destName: string) => {
    const isReceive = data.type === 'IN';

    // Detect if source or dest is an external partner
    const isSourcePartner = EXTERNAL_PARTNERS.some((p: Partner) => p.name === sourceName || p.id === data.source);
    const isDestPartner = EXTERNAL_PARTNERS.some((p: Partner) => p.name === destName || p.id === data.dest);
    const partner = EXTERNAL_PARTNERS.find((p: Partner) => p.name === destName || p.id === data.dest || p.name === sourceName || p.id === data.source);

    let title = isReceive ? '📥 *แจ้งรับเข้าพาเลท\\!*' : '📤 *แจ้งจ่ายออกพาเลท\\!*';
    let icon = isReceive ? '✅' : '📦';

    if (!isReceive && isDestPartner) {
        if (partner?.type === 'provider') {
            title = '🔄 *แจ้งส่งคืนพาเลทให้คู่ค้า\\!*';
            icon = '⏪';
        } else {
            title = '🚛 *แจ้งส่งมอบพาเลทให้ลูกค้า\\!*';
            icon = '🚚';
        }
    } else if (isReceive && isSourcePartner) {
        title = '📥 *แจ้งรับเข้าพาเลทจากคู่ค้า\\!*';
        icon = '📥';
    } else if (!isSourcePartner && !isDestPartner) {
        // Internal transfer
        title = isReceive ? '📥 *แจ้งรับเข้าพาเลท \\(ภายใน\\)\\!*' : '📤 *แจ้งโอนย้ายพาเลท \\(ภายใน\\)\\!*';
    }

    const itemsText = data.items.map((item: any) => `    • ${escapeMarkdown(getPalletName(item.palletId))}: *${item.qty}* ชิ้น`).join('\n');
    const transportPart = formatTransportInfo(data);

    return `${title}
▬▬▬▬▬▬▬▬▬▬▬▬
*เลขที่เอกสาร:* \`${escapeMarkdown(data.docNo)}\`
*จาก:* ${escapeMarkdown(sourceName)}
*เข้าที่:* ${escapeMarkdown(destName)}
*รายการ:*
${itemsText}
*อ้างอิง:* ${escapeMarkdown(data.referenceDocNo || '-')}
*สถานะ:* ${icon} บันทึกสำเร็จ
${transportPart}
▬▬▬▬▬▬▬▬▬▬▬▬
_ตรวจสอบรายการในระบบจัดการพาเลท_`;
};

/**
 * Format a Maintenance Notification
 */
export const formatMaintenanceNotification = (data: any, scrappedQty: number, branchName: string) => {
    return `🛠️ *สรุปงานซ่อมบำรุงพาเลท\\!*
▬▬▬▬▬▬▬▬▬▬▬▬
*เลขที่เอกสาร:* \`${escapeMarkdown(data.docNo)}\`
*สาขา:* ${escapeMarkdown(branchName)}
*รายละเอียด:*
    • ซ่อมเสร็จ: *${data.qty}* ตัว \\(เป็น ${escapeMarkdown(getPalletName(data.palletId))}\\)
    • เสีย/ทิ้ง: *${scrappedQty}* ตัว
*สถานะ:* ✅ บันทึกผลสำเร็จ
▬▬▬▬▬▬▬▬▬▬▬▬
_มียอดพาเลทเสียไหลเข้าสต๊อกรอขายซาก_`;
};

/**
 * Format a Scrap Sale Notification
 */
export const formatScrapSaleNotification = (tx: any, amount: number) => {
    return `💰 *แจ้งการขายซากพาเลท\\!*
▬▬▬▬▬▬▬▬▬▬▬▬
*เลขที่เอกสาร:* \`${escapeMarkdown(tx.docNo)}\`
*รายการ:* ${escapeMarkdown(getPalletName(tx.originalPalletId || 'general'))}
*ราคาที่ขายได้:* ฿*${amount.toLocaleString()}*
▬▬▬▬▬▬▬▬▬▬▬▬
*สถานะ:* ✅ บันทึกรายได้เข้าระบบเรียบร้อย`;
};

/**
 * Format a Stock Depletion Alert (AI Intelligence)
 */
export const formatStockDepletionAlert = (prediction: any) => {
    const riskEmoji = prediction.probability > 0.8 ? '🛑' : (prediction.probability > 0.5 ? '⚠️' : 'ℹ️');
    const riskLevel = prediction.probability > 0.8 ? 'ระดับสูงมาก' : (prediction.probability > 0.5 ? 'ระดับปานกลาง' : 'ระดับต่ำ');

    return `🤖 *AI Intelligence: แจ้งเตือนสต็อกใกล้หมด\\!*
${riskEmoji} *สาขา:* ${escapeMarkdown(prediction.branchName)}
📦 *พาเลท:* ${escapeMarkdown(prediction.palletName)}
▬▬▬▬▬▬▬▬▬▬▬▬
*สถานะปัจจุบัน:* ${prediction.currentStock} ชิ้น
*อัตราการใช้:* ~${prediction.dailyConsumption.toFixed(1)} ชิ้น/วัน
*คาดว่าจะหมดใน:* \`${prediction.daysToExhaustion.toFixed(1)} วัน\`
*ความเสี่ยง:* ${riskLevel} \\(${(prediction.probability * 100).toFixed(0)}%\\)

📍 *ข้อแนะนำ:* ควรโอนย้ายพาเลทเพิ่มจากสาขาอื่นทันที
▬▬▬▬▬▬▬▬▬▬▬▬
_วิเคราะห์โดยระบบ Predictive Analytics_`;
};
