
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

/**
 * Format a Pallet Request for Telegram
 */
export const formatPalletRequest = (req: any, branchName: string, targetName?: string) => {
    const priorityEmoji = req.priority === 'URGENT' ? '🔴' : '⚪';
    const itemsText = req.items.map((item: any) => `  - ${item.palletId}: ${item.qty}`).join('\n');

    return `🔔 *มีคำขอรับพาเลทใหม่!*
----------------------------
*เลขที่:* \`${req.requestNo}\`
*จาก:* ${branchName}
*รายการ:*
${itemsText}
*ปลายทาง:* ${targetName || 'ไม่ระบุ'}
*วัตถุประสงค์:* ${req.purpose}
*ความสำคัญ:* ${priorityEmoji} ${req.priority}
----------------------------
_กรุณาตรวจสอบในระบบแอปพลิเคชัน_`;
};

/**
 * Format a Processing Notification (Shipped)
 */
export const formatShipmentNotification = (req: any, docNo: string) => {
    return `🚚 *แจ้งส่งมอบพาเลท!*
----------------------------
*เลขที่คำขอ:* \`${req.requestNo}\`
*เลขที่เอกสาร:* \`${docNo}\`
*สถานะ:* ✅ จัดส่งเรียบร้อยแล้ว
----------------------------
_พาเลทกำลังเดินทางไปยังสาขาของคุณ_`;
};
