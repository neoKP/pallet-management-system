
const BOT_TOKEN = '8339371070:AAHw1ri9hn5QAd7DM2RvOnv5ybCabPkrxqM';

/**
 * Send a message to a Telegram chat
 * @param chatId The chat ID to send the message to
 * @param text The message text (Markdown supported)
 */
export const sendMessage = async (chatId: string, text: string) => {
    if (!chatId || !text) return;

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown',
            }),
        });

        const data = await response.json();
        if (!data.ok) {
            console.error('Telegram API Error:', data.description);
        }
        return data;
    } catch (error) {
        console.error('Failed to send Telegram message:', error);
    }
};

import { PALLET_TYPES, VEHICLE_TYPES } from '../constants';

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

    return `\n*ข้อมูลการขนส่ง:*
🚛 ประเภท: ${getVehicleName(data.vehicleType || '-')}
🔢 ทะเบียน: ${data.carRegistration || '-'}
👤 คนขับ: ${data.driverName || '-'}
🏢 บริษัท: ${data.transportCompany || '-'}`;
};

/**
 * Format a Pallet Request for Telegram
 */
export const formatPalletRequest = (req: any, branchName: string, targetName?: string) => {
    const priorityEmoji = req.priority === 'URGENT' ? '🔴' : '⚪';
    const itemsText = req.items.map((item: any) => `  • ${getPalletName(item.palletId)}: ${item.qty} ชิ้น`).join('\n');

    return `🔔 *มีคำขอรับพาเลทใหม่!*
----------------------------
*เลขที่คำขอ:* \`${req.requestNo}\`
*จากสาขา:* ${branchName}
*ต้องการให้ส่งที่:* ${targetName || 'ไม่ระบุ'}
*รายการ:*
${itemsText}
*วัตถุประสงค์:* ${req.purpose}
*ความสำคัญ:* ${priorityEmoji} ${req.priority}
----------------------------
_กรุณาตรวจสอบและอนุมัติในระบบ_`;
};

/**
 * Format a Processing Notification (Shipped/Dispatch)
 */
export const formatShipmentNotification = (req: any, docNo: string, sourceName: string, destName: string, transportData?: any) => {
    const itemsText = req.items?.map((item: any) => `  • ${getPalletName(item.palletId)}: ${item.qty} ชิ้น`).join('\n') || '';
    const transportPart = transportData ? formatTransportInfo(transportData) : '';

    return `🚚 *แจ้งส่งมอบพาเลท!*
----------------------------
*อ้างอิงคำขอ:* \`${req.requestNo}\`
*เลขที่เอกสาร:* \`${docNo}\`
*ต้นทาง:* ${sourceName}
*ปลายทาง:* ${destName}
*รายการ:*
${itemsText}
*สถานะ:* ✅ จัดส่งเรียบร้อยแล้ว
${transportPart}
----------------------------
_พาเลทกำลังเดินทางไปยังสาขาปลายทาง_`;
};

/**
 * Format a Movement Notification (IN/OUT)
 */
export const formatMovementNotification = (data: any, sourceName: string, destName: string) => {
    const isReceive = data.type === 'IN';
    const title = isReceive ? '📥 *แจ้งรับเข้าพาเลท!*' : '📤 *แจ้งจ่ายออกพาเลท!*';
    const icon = isReceive ? '✅' : '📦';
    const itemsText = data.items.map((item: any) => `  • ${getPalletName(item.palletId)}: ${item.qty} ชิ้น`).join('\n');
    const transportPart = formatTransportInfo(data);

    return `${title}
----------------------------
*เลขที่เอกสาร:* \`${data.docNo}\`
*จาก:* ${sourceName}
*เข้าที่:* ${destName}
*รายการ:*
${itemsText}
*อ้างอิง:* ${data.referenceDocNo || '-'}
*สถานะ:* ${icon} บันทึกสำเร็จ
${transportPart}
----------------------------
_ตรวจสอบรายการในระบบจัดการพาเลท_`;
};

/**
 * Format a Stock Depletion Alert (AI Intelligence)
 */
export const formatStockDepletionAlert = (prediction: any) => {
    const riskEmoji = prediction.probability > 0.8 ? '🛑' : (prediction.probability > 0.5 ? '⚠️' : 'ℹ️');
    const riskLevel = prediction.probability > 0.8 ? 'ระดับสูงมาก' : (prediction.probability > 0.5 ? 'ระดับปานกลาง' : 'ระดับต่ำ');

    return `🤖 *AI Intelligence: แจ้งเตือนสต็อกใกล้หมด!*
${riskEmoji} *สาขา:* ${prediction.branchName}
📦 *พาเลท:* ${prediction.palletName}
----------------------------
*สถานะปัจจุบัน:* ${prediction.currentStock} ชิ้น
*อัตราการใช้:* ~${prediction.dailyConsumption.toFixed(1)} ชิ้น/วัน
*คาดว่าจะหมดใน:* \`${prediction.daysToExhaustion.toFixed(1)} วัน\`
*ความเสี่ยง:* ${riskLevel} (${(prediction.probability * 100).toFixed(0)}%)

📍 *ข้อแนะนำ:* ควรโอนย้ายพาเลทเพิ่มจากสาขาอื่นทันที
----------------------------
_วิเคราะห์โดยระบบ Predictive Analytics_`;
};
