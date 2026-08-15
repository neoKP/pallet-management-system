/// <reference types="vite/client" />

/**
 * ประกาศชนิดของตัวแปรสภาพแวดล้อมที่ระบบใช้
 *
 * ประโยชน์:
 *   - TypeScript รู้จัก import.meta.env (ไม่ต้องใช้ @ts-ignore)
 *   - พิมพ์ชื่อตัวแปรผิดจะขึ้น error ตั้งแต่ตอน build
 *   - เห็นรายการตัวแปรทั้งหมดของระบบได้จากที่เดียว
 *
 * ทุกตัวเป็น optional เพราะผู้ใช้อาจไม่ได้ตั้งค่าไว้ ระบบต้องรับมือได้เอง
 */
interface ImportMetaEnv {
    /** Telegram Bot Token — ถ้าไม่มี ระบบจะข้ามการแจ้งเตือน */
    readonly VITE_TELEGRAM_BOT_TOKEN?: string;
    /** Google Gemini API Key — ถ้าไม่มี ฟีเจอร์ AI จะไม่ทำงาน */
    readonly VITE_GEMINI_API_KEY?: string;
    readonly VITE_APP_NAME?: string;
    readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
