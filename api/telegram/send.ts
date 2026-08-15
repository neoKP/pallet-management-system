/**
 * Vercel Serverless Function — ส่งข้อความ Telegram แทนฝั่งเบราว์เซอร์
 *
 * ทำไมต้องมีไฟล์นี้:
 *   Vite จะฝังตัวแปรที่ขึ้นต้นด้วย VITE_ ลงในไฟล์ JS ที่ส่งให้เบราว์เซอร์
 *   ใครเปิด DevTools ก็อ่าน bot token ได้ แล้วเอาไปส่งข้อความในนามบริษัท
 *   ลบ webhook หรืออ่านข้อความในกลุ่มได้ทั้งหมด
 *
 *   ไฟล์นี้รันบนเซิร์ฟเวอร์ของ Vercel จึงอ่าน TELEGRAM_BOT_TOKEN
 *   (ไม่มี VITE_) ซึ่งไม่ถูกส่งไปยังเบราว์เซอร์ได้อย่างปลอดภัย
 *
 * ตั้งค่าที่ Vercel → Settings → Environment Variables (ต้องมีทั้งสองตัว):
 *   TELEGRAM_BOT_TOKEN        = <token จาก @BotFather>
 *   TELEGRAM_ALLOWED_CHAT_IDS = <chat id ที่อนุญาต คั่นด้วยจุลภาค>
 *
 * ⚠️ endpoint นี้เปิดสาธารณะตามธรรมชาติของ serverless function
 *    จึงต้องล็อกปลายทางไว้ที่ TELEGRAM_ALLOWED_CHAT_IDS เสมอ
 *    มิฉะนั้นใครก็ตามที่เห็น request ใน DevTools จะใช้บอทส่งข้อความ
 *    เข้าแชทใดก็ได้ที่บอทเข้าถึง
 */

/**
 * ใช้ Edge runtime เพราะโค้ดนี้เขียนด้วย Web API มาตรฐาน (Request/Response)
 * ถ้าไม่ประกาศ Vercel จะเรียกแบบ Node (req/res) ซึ่งเข้ากันไม่ได้
 * ทำให้ req.json() และการ return Response ใช้ไม่ได้ใน production
 */
export const config = { runtime: 'edge' };

interface TelegramRequest {
    chatId?: unknown;
    text?: unknown;
    parseMode?: unknown;
}

/** จำกัดความยาวตามที่ Telegram API รองรับ กันการยิงข้อความขนาดใหญ่ */
const MAX_TEXT_LENGTH = 4096;

/**
 * ปลายทางที่อนุญาตให้ส่งได้ (คั่นด้วยจุลภาค) ตั้งที่ TELEGRAM_ALLOWED_CHAT_IDS
 *
 * จำเป็นเพราะ endpoint นี้เปิดสาธารณะ ถ้าไม่จำกัดปลายทาง ใครก็ตามที่เห็น
 * request ใน DevTools จะคัดลอกไปยิงข้อความเข้าแชทใดก็ได้ที่บอทเข้าถึง
 * กลายเป็นตัวส่งสแปมในนามบริษัท
 *
 * ถ้าไม่ตั้งค่าไว้ ระบบจะปฏิเสธทุกคำขอ (ปิดไว้ก่อนปลอดภัยกว่าเปิดทิ้ง)
 */
const getAllowedChatIds = (): string[] =>
    (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

/**
 * จำกัดอัตราการส่งต่อ IP เพื่อลดความเสียหายหากมีคนนำ endpoint ไปยิงสแปม
 *
 * ⚠️ นี่เป็นการ "ลดความเสียหาย" ไม่ใช่การ "ปิดช่องโหว่"
 * การป้องกันที่แท้จริงคือตรวจสิทธิ์ผู้เรียก ซึ่งต้องรอให้ระบบมี
 * Firebase Authentication ก่อน (ปัจจุบันยังใช้รหัสผ่านฝังในโค้ด)
 * ดูแผนใน docs/TELEGRAM_TOKEN_MIGRATION.md
 *
 * หมายเหตุ: Edge function แต่ละ instance มีหน่วยความจำแยกกันและถูกรีไซเคิลบ่อย
 * ตัวนับนี้จึงกันได้เฉพาะการยิงรัวที่เข้า instance เดียวกันเท่านั้น
 * ถ้าต้องการกันจริงจังทั่วระบบ ต้องใช้ที่เก็บกลาง เช่น Vercel KV
 */
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, number[]>();

const isRateLimited = (key: string, now: number): boolean => {
    const hits = (rateBuckets.get(key) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    hits.push(now);
    rateBuckets.set(key, hits);

    // กันหน่วยความจำบวมเมื่อมี key แปลก ๆ เข้ามาจำนวนมาก
    if (rateBuckets.size > 1000) {
        rateBuckets.forEach((times, k) => {
            if (times.every(t => now - t >= RATE_LIMIT_WINDOW_MS)) rateBuckets.delete(k);
        });
    }

    return hits.length > RATE_LIMIT_MAX;
};

export default async function handler(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
        return json(405, { ok: false, error: 'รองรับเฉพาะ POST' });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        // ไม่เปิดเผยรายละเอียดการตั้งค่าออกไปทาง response
        console.error('[telegram] ไม่พบ TELEGRAM_BOT_TOKEN ใน environment');
        return json(503, { ok: false, error: 'ระบบแจ้งเตือนยังไม่ได้ตั้งค่า' });
    }

    let body: TelegramRequest;
    try {
        body = await req.json();
    } catch {
        return json(400, { ok: false, error: 'รูปแบบข้อมูลไม่ถูกต้อง' });
    }

    const { chatId, text, parseMode } = body;

    // ตรวจข้อมูลก่อนส่งต่อ เพื่อไม่ให้ใครใช้ endpoint นี้ยิงข้อความมั่ว
    if (typeof chatId !== 'string' || !chatId) {
        return json(400, { ok: false, error: 'chatId ไม่ถูกต้อง' });
    }
    if (typeof text !== 'string' || !text) {
        return json(400, { ok: false, error: 'text ไม่ถูกต้อง' });
    }

    // ล็อกปลายทางไว้ฝั่งเซิร์ฟเวอร์ ป้องกันไม่ให้ endpoint นี้ถูกใช้เป็น
    // ตัวส่งข้อความสาธารณะเข้าแชทใดก็ได้ที่บอทเข้าถึง
    const allowed = getAllowedChatIds();
    if (allowed.length === 0) {
        console.error('[telegram] ไม่พบ TELEGRAM_ALLOWED_CHAT_IDS — ปฏิเสธคำขอทั้งหมด');
        return json(503, { ok: false, error: 'ระบบแจ้งเตือนยังไม่ได้ตั้งค่า' });
    }
    if (!allowed.includes(chatId)) {
        console.warn(`[telegram] ปฏิเสธปลายทางที่ไม่ได้รับอนุญาต: ${chatId}`);
        return json(403, { ok: false, error: 'ปลายทางนี้ไม่ได้รับอนุญาต' });
    }

    // จำกัดอัตราการส่ง ลดความเสียหายหากมีคนนำ endpoint ไปยิงสแปม
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    if (isRateLimited(ip, Date.now())) {
        console.warn(`[telegram] ส่งถี่เกินกำหนดจาก ${ip}`);
        return json(429, { ok: false, error: 'ส่งข้อความถี่เกินไป กรุณารอสักครู่' });
    }
    if (text.length > MAX_TEXT_LENGTH) {
        return json(400, { ok: false, error: `ข้อความยาวเกิน ${MAX_TEXT_LENGTH} ตัวอักษร` });
    }

    const mode = parseMode === 'HTML' ? 'HTML' : 'MarkdownV2';

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: mode }),
        });

        const data = await res.json();

        if (!data.ok) {
            // ส่งคำอธิบายกลับไปให้ฝั่งหน้าเว็บตัดสินใจ (เช่น ลองส่งใหม่แบบไม่ escape)
            // แต่ไม่ส่ง token หรือรายละเอียดภายในออกไป
            console.error('[telegram] API error:', data.description);
            return json(502, { ok: false, error: data.description || 'ส่งข้อความไม่สำเร็จ' });
        }

        return json(200, { ok: true });
    } catch (err) {
        console.error('[telegram] เชื่อมต่อไม่สำเร็จ:', err);
        return json(502, { ok: false, error: 'เชื่อมต่อ Telegram ไม่สำเร็จ' });
    }
}
