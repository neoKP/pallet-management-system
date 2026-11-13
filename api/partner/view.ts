/**
 * Vercel Edge Function — ข้อมูลหน้าคู่ค้า (role PARTNER) แบบดูอย่างเดียว
 *
 * คู่ค้าไม่มีสิทธิ์อ่านฐานข้อมูลตรง (กฎ database.rules.STEP3-AUTH.json)
 * endpoint นี้ตรวจบัตรผ่าน → อ่านด้วยกุญแจเซิร์ฟเวอร์ → ส่งกลับเฉพาะเอกสารของคู่ค้ารายนั้น
 * ผ่าน buildPartnerPortalView ซึ่งตัดข้อมูลภายในออกแล้ว (คนขับ ทะเบียน หมายเหตุ เงิน)
 */
import { Transaction } from '../../types';
import { buildPartnerPortalView, toPublicView } from '../../utils/partnerPortal';
import { parseClaims, isPartnerSessionFresh } from '../../utils/authClaims';
import { verifyRequestToken, adminDbGet, json, errorResponse, HttpError } from '../_lib/firebaseServer';

export const config = { runtime: 'edge' };

/**
 * แถวจาก REST พร้อมรหัสแถวในฐานข้อมูล (key) — ใช้ key ตัดแถวซ้ำ ไม่ใช้ t.id
 * (ข้อมูลเก่าบางแถวไม่มี id หรือ id ซ้ำกันได้)
 */
const entriesOf = (data: unknown): [string, Transaction][] => {
    if (!data || typeof data !== 'object') return [];
    const list: [string, unknown][] = Array.isArray(data)
        ? data.map((v, i) => [String(i), v] as [string, unknown])
        : Object.entries(data as Record<string, unknown>);
    return list.filter((e): e is [string, Transaction] => !!e[1] && typeof e[1] === 'object');
};

/**
 * ดึงเฉพาะแถวที่คู่ค้าเป็นต้นทางหรือปลายทาง (ใช้ index source / dest ซึ่งอยู่ในกฎ STEP3)
 * ถ้าฐานยังไม่มี index (REST ตอบ 400) จะดึงทั้งหมดแล้วกรองเอง — ผลเหมือนกัน แค่ช้ากว่า
 */
export const fetchPartnerRows = async (partnerId: string): Promise<Transaction[]> => {
    const value = JSON.stringify(partnerId);
    const [bySource, byDest] = await Promise.all([
        adminDbGet('transactions', { orderBy: '"source"', equalTo: value }),
        adminDbGet('transactions', { orderBy: '"dest"', equalTo: value }),
    ]);

    const merged = new Map<string, Transaction>();
    if (bySource.ok && byDest.ok) {
        for (const [k, t] of [...entriesOf(bySource.data), ...entriesOf(byDest.data)]) merged.set(k, t);
        return [...merged.values()];
    }

    const all = await adminDbGet('transactions');
    if (!all.ok) throw new HttpError(502, 'อ่านข้อมูลไม่สำเร็จ กรุณาลองใหม่');
    for (const [k, t] of entriesOf(all.data)) {
        if (t.source === partnerId || t.dest === partnerId) merged.set(k, t);
    }
    return [...merged.values()];
};

export default async function handler(req: Request): Promise<Response> {
    if (req.method !== 'GET') return json(405, { ok: false, error: 'รองรับเฉพาะ GET' });

    try {
        const payload = await verifyRequestToken(req);
        const claims = parseClaims(payload);
        if (!claims || claims.role !== 'PARTNER' || !claims.partnerId) {
            return json(403, { ok: false, error: 'บัญชีนี้ไม่ใช่บัญชีคู่ค้า' });
        }
        if (!isPartnerSessionFresh(payload.auth_time as number | undefined, Date.now())) {
            return json(401, { ok: false, error: 'หมดเวลาใช้งาน กรุณาเข้าสู่ระบบใหม่', code: 'SESSION_EXPIRED' });
        }

        const rows = await fetchPartnerRows(claims.partnerId);
        const view = buildPartnerPortalView(rows, claims.partnerId);
        if (!view) return json(404, { ok: false, error: 'ไม่พบข้อมูลคู่ค้าของบัญชีนี้ กรุณาติดต่อผู้ดูแลระบบ' });

        return json(200, { ok: true, view: toPublicView(view) });
    } catch (e) {
        return errorResponse(e);
    }
}
