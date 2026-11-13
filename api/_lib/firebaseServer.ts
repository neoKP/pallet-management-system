/**
 * เครื่องมือฝั่งเซิร์ฟเวอร์ (Vercel Edge) สำหรับ Firebase
 * - ตรวจบัตรผ่าน (ID token) ของผู้ใช้ที่ล็อกอิน
 * - อ่านฐานข้อมูลด้วยกุญแจเซิร์ฟเวอร์ (service account) — ใช้เมื่อผู้ใช้ไม่มีสิทธิ์อ่านเอง เช่น คู่ค้า
 *
 * ไฟล์ขึ้นต้นด้วย _ จึงไม่ถูกเปิดเป็น endpoint บน Vercel
 *
 * ตั้งค่า Vercel → Settings → Environment Variables:
 *   FIREBASE_SERVICE_ACCOUNT = เนื้อหาไฟล์ .json ทั้งไฟล์ จาก Firebase → Project settings → Service accounts
 *
 * ทดสอบในเครื่องกับ Firebase Emulator (ห้ามตั้งบน Vercel):
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099  FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000
 */
import { createRemoteJWKSet, jwtVerify, decodeJwt, importPKCS8, SignJWT, JWTPayload } from 'jose';

export const PROJECT_ID = 'pallet-management-system-310ed';
export const DATABASE_URL = 'https://pallet-management-system-310ed-default-rtdb.asia-southeast1.firebasedatabase.app';
const DATABASE_NS = 'pallet-management-system-310ed-default-rtdb';

export class HttpError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

export const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });

/** ใช้ตัวจำลองได้เฉพาะในเครื่อง — บน Vercel (มี VERCEL_ENV) ไม่ยอมเด็ดขาด แม้มีคนตั้งค่าผิด */
const isLocalEmulator = (name: 'FIREBASE_AUTH_EMULATOR_HOST' | 'FIREBASE_DATABASE_EMULATOR_HOST') =>
    !!process.env[name] && !process.env.VERCEL_ENV;

const JWKS = createRemoteJWKSet(
    new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

/** ตรวจบัตรผ่านจาก header `Authorization: Bearer <token>` — ไม่ผ่าน = HttpError 401 */
export const verifyRequestToken = async (req: Request): Promise<JWTPayload & Record<string, unknown>> => {
    const header = req.headers.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw new HttpError(401, 'กรุณาเข้าสู่ระบบ');

    if (isLocalEmulator('FIREBASE_AUTH_EMULATOR_HOST')) {
        // บัตรผ่านของตัวจำลองไม่มีลายเซ็น — ใช้ทดสอบในเครื่องเท่านั้น
        let payload: JWTPayload & Record<string, unknown>;
        try {
            payload = decodeJwt(token) as JWTPayload & Record<string, unknown>;
        } catch {
            throw new HttpError(401, 'บัตรผ่านไม่ถูกต้อง');
        }
        if (payload.aud !== PROJECT_ID || !payload.sub) throw new HttpError(401, 'บัตรผ่านไม่ถูกต้อง');
        return payload;
    }

    try {
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: `https://securetoken.google.com/${PROJECT_ID}`,
            audience: PROJECT_ID,
            algorithms: ['RS256'],
        });
        if (!payload.sub) throw new Error('no sub');
        return payload as JWTPayload & Record<string, unknown>;
    } catch {
        throw new HttpError(401, 'บัตรผ่านไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
};

interface ServiceAccount { client_email: string; private_key: string }

const readServiceAccount = (): ServiceAccount => {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new HttpError(503, 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่ากุญแจฐานข้อมูล');
    try {
        const sa = JSON.parse(raw);
        if (typeof sa.client_email !== 'string' || typeof sa.private_key !== 'string') throw new Error('fields');
        return sa;
    } catch {
        console.error('[firebaseServer] FIREBASE_SERVICE_ACCOUNT อ่านไม่ได้ (ต้องเป็น JSON ทั้งไฟล์)');
        throw new HttpError(503, 'เซิร์ฟเวอร์ตั้งค่ากุญแจฐานข้อมูลไม่ถูกต้อง');
    }
};

let cachedAccess: { token: string; exp: number } | null = null;

/** ขอ access token ของกุญแจเซิร์ฟเวอร์ (เก็บไว้ใช้ซ้ำจนใกล้หมดอายุ) */
const getAdminAccessToken = async (): Promise<string> => {
    const now = Math.floor(Date.now() / 1000);
    if (cachedAccess && cachedAccess.exp - 60 > now) return cachedAccess.token;

    const sa = readServiceAccount();
    const key = await importPKCS8(sa.private_key, 'RS256');
    const assertion = await new SignJWT({
        scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .setIssuer(sa.client_email)
        .setAudience('https://oauth2.googleapis.com/token')
        .setIssuedAt(now)
        .setExpirationTime(now + 3600)
        .sign(key);

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.access_token !== 'string') {
        console.error('[firebaseServer] ขอ access token ไม่สำเร็จ', res.status, data?.error);
        throw new HttpError(503, 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ');
    }
    cachedAccess = { token: data.access_token, exp: now + (Number(data.expires_in) || 3600) };
    return cachedAccess.token;
};

/** query ของ REST (ค่าเป็น JSON เช่น orderBy="source") */
export type DbQuery = Record<string, string>;

/**
 * อ่านฐานข้อมูลด้วยสิทธิ์เซิร์ฟเวอร์
 * คืน { ok:false, status } เมื่อ REST ปฏิเสธ (เช่น 400 ยังไม่มี index) ให้ผู้เรียกเลือกทางสำรอง
 */
export const adminDbGet = async (path: string, query: DbQuery = {}): Promise<{ ok: true; data: unknown } | { ok: false; status: number }> => {
    const params = new URLSearchParams(query);
    const headers: Record<string, string> = {};
    let base = DATABASE_URL;

    if (isLocalEmulator('FIREBASE_DATABASE_EMULATOR_HOST')) {
        base = `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}`;
        params.set('ns', DATABASE_NS);
        headers.Authorization = 'Bearer owner'; // สิทธิ์ admin ของตัวจำลอง
    } else {
        params.set('access_token', await getAdminAccessToken());
    }

    const res = await fetch(`${base}/${path.replace(/^\/+/, '')}.json?${params}`, { headers });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: await res.json() };
};

/** แปลง Error ใด ๆ เป็น Response — ไม่เปิดเผยรายละเอียดภายใน */
export const errorResponse = (e: unknown): Response => {
    if (e instanceof HttpError) return json(e.status, { ok: false, error: e.message });
    console.error('[api] unexpected', e);
    return json(500, { ok: false, error: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
};
