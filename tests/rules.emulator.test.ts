/**
 * ทดสอบกฎฐานข้อมูล (database.rules.STEP3-AUTH.json) + API ฝั่งเซิร์ฟเวอร์ กับ Firebase Emulator
 * ไม่แตะข้อมูลจริง — รันด้วย:
 *   npm run test:rules
 * (เรียก firebase emulators:exec ซึ่งตั้ง FIREBASE_*_EMULATOR_HOST ให้เอง ถ้าไม่มีค่านี้ไฟล์นี้จะถูกข้าม)
 *
 * ทดสอบผ่าน client SDK เท่านั้น — REST ของ emulator ข้ามกฎทั้งหมด (ดู docs/FIREBASE_RULES_GUIDE.md)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initializeApp as initAdmin, deleteApp as deleteAdminApp, App as AdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getDatabase as getAdminDb } from 'firebase-admin/database';
import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, connectDatabaseEmulator, ref, get, set, runTransaction, goOffline } from 'firebase/database';
import { usernameToEmail } from '../utils/authClaims';
import partnerView from '../api/partner/view';
import telegramSend from '../api/telegram/send';

const PROJECT_ID = 'pallet-management-system-310ed';
const NS = 'pallet-management-system-310ed-default-rtdb';
const DB_HOST = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const enabled = !!DB_HOST && !!AUTH_HOST;

const PASSWORD = 'emulator-only-pass-1';
const ACCOUNTS = [
    { username: 'admin', claims: { role: 'ADMIN' } },
    { username: 'user_cm', claims: { role: 'USER', branchId: 'cm' } },
    { username: 'user_sino', claims: { role: 'PARTNER', partnerId: 'sino' } },
    { username: 'user_noclaims', claims: null },
];

let admin: AdminApp;
const clients: FirebaseApp[] = [];

/** แอป client แยกต่อผู้ใช้ (null = ไม่ล็อกอิน) */
const clientFor = async (username: string | null) => {
    const app = initializeApp({ projectId: PROJECT_ID, apiKey: 'emulator', databaseURL: `http://${DB_HOST}?ns=${NS}` }, `c${clients.length}`);
    clients.push(app);
    const auth = getAuth(app);
    connectAuthEmulator(auth, `http://${AUTH_HOST}`, { disableWarnings: true });
    const db = getDatabase(app);
    const [h, p] = DB_HOST!.split(':');
    connectDatabaseEmulator(db, h, Number(p));
    let token: string | null = null;
    if (username) {
        const cred = await signInWithEmailAndPassword(auth, usernameToEmail(username), PASSWORD);
        token = await cred.user.getIdToken();
    }
    return { db, token };
};

const denied = async (p: Promise<unknown>) => {
    await expect(p).rejects.toThrow(/permission/i);
};

const TX = {
    t1: { id: 1, date: '2026-11-01T08:00:00Z', docNo: 'EXT-IN-SINO-1', type: 'IN', status: 'COMPLETED', source: 'sino', dest: 'cm', palletId: 'loscam_red', qty: 30, driverName: 'คนขับลับ', carRegistration: '70-9999', note: 'หมายเหตุภายใน' },
    t2: { id: 2, date: '2026-11-02T08:00:00Z', docNo: 'EXT-OUT-SINO-2', type: 'OUT', status: 'COMPLETED', source: 'hub_nw', dest: 'sino', palletId: 'loscam_red', qty: 10 },
    t3: { id: 3, date: '2026-11-02T09:00:00Z', docNo: 'EXT-IN-LAMSOON', type: 'IN', status: 'COMPLETED', source: 'lamsoon', dest: 'sai3', palletId: 'loscam_red', qty: 99 },
    t4: { id: 4, date: '2026-11-03T09:00:00Z', docNo: 'INT-CM-NW', type: 'OUT', status: 'COMPLETED', source: 'cm', dest: 'hub_nw', palletId: 'loscam_red', qty: 5 },
    // แถวเก่าไม่มี id (ต้องไม่หายเพราะตัดซ้ำผิด)
    t6: { date: '2026-10-01T08:00:00Z', docNo: 'LEGACY-NOID-A', type: 'IN', status: 'COMPLETED', source: 'sino', dest: 'kpp', palletId: 'loscam_blue', qty: 3 },
    t7: { date: '2026-10-02T08:00:00Z', docNo: 'LEGACY-NOID-B', type: 'OUT', status: 'COMPLETED', source: 'hub_nw', dest: 'sino', palletId: 'loscam_blue', qty: 2 },
    t5: { id: 5, date: '2026-11-03T10:00:00Z', docNo: 'EXT-IN-SINO-1-AUTO', type: 'OUT', status: 'COMPLETED', source: 'hub_nw', dest: 'sino', palletId: 'loscam_red', qty: 30, note: 'Auto-generated from EXT-IN-SINO-1' },
};

describe.skipIf(!enabled)('กฎฐานข้อมูล STEP3 + API (Firebase Emulator)', () => {
    beforeAll(async () => {
        admin = initAdmin({ projectId: PROJECT_ID, databaseURL: `http://${DB_HOST}?ns=${NS}` }, 'admin-test');
        const auth = getAdminAuth(admin);
        for (const a of ACCOUNTS) {
            const u = await auth.createUser({ email: usernameToEmail(a.username), password: PASSWORD }).catch(async () =>
                auth.getUserByEmail(usernameToEmail(a.username)));
            if (a.claims) await auth.setCustomUserClaims(u.uid, a.claims);
        }
        await getAdminDb(admin).ref('/').set({
            stock: { cm: { loscam_red: 100 }, hub_nw: { loscam_red: 50 } },
            transactions: TX,
            config: { telegramChatId: '' },
        });
    }, 60000);

    afterAll(async () => {
        for (const c of clients) { try { goOffline(getDatabase(c)); } catch { /* */ } await deleteApp(c).catch(() => {}); }
        if (admin) await deleteAdminApp(admin).catch(() => {});
    });

    it('ไม่ล็อกอิน → อ่าน / เขียนไม่ได้', async () => {
        const { db } = await clientFor(null);
        await denied(get(ref(db, 'transactions')));
        await denied(get(ref(db, 'stock')));
        await denied(set(ref(db, 'stock/cm/loscam_red'), 1));
    });

    it('บัญชีที่ยังไม่ตั้งบัตรผ่าน → อ่านไม่ได้', async () => {
        const { db } = await clientFor('user_noclaims');
        await denied(get(ref(db, 'stock')));
    });

    it('คู่ค้า (ซีโน่) → อ่าน / เขียนฐานตรงไม่ได้', async () => {
        const { db } = await clientFor('user_sino');
        await denied(get(ref(db, 'transactions')));
        await denied(get(ref(db, '/')));
        await denied(set(ref(db, 'transactions/hack'), { ...TX.t1, id: 9 }));
    });

    it('พนักงานสาขา → อ่านได้ และบันทึกแบบก้อนเดียวที่ราก (runTransaction "/") ได้เหมือนเดิม', async () => {
        const { db } = await clientFor('user_cm');
        const snap = await get(ref(db, 'stock/cm/loscam_red'));
        expect(snap.val()).toBe(100);
        const result = await runTransaction(ref(db, '/'), (cur: any) => {
            if (!cur) return cur;
            cur.stock.cm.loscam_red -= 5;
            cur.stock.hub_nw.loscam_red += 5;
            return cur;
        });
        expect(result.committed).toBe(true);
        expect((await get(ref(db, 'stock/cm/loscam_red'))).val()).toBe(95);
    });

    it('กฎตรวจรูปแบบเดิมยังทำงาน — ADMIN ก็ตั้งสต็อกติดลบไม่ได้', async () => {
        const { db } = await clientFor('admin');
        await denied(set(ref(db, 'stock/cm/loscam_red'), -1));
        await set(ref(db, 'stock/cm/loscam_red'), 100);
    });

    it('API หน้าคู่ค้า: ได้เฉพาะเอกสารซีโน่จริง ไม่มีข้อมูลภายใน ไม่มียอดรวม ไม่มีรายการ -AUTO (ซ่อนยอด 17 พ.ย. 69)', async () => {
        const { token } = await clientFor('user_sino');
        const res = await partnerView(new Request('http://x/api/partner/view', { headers: { Authorization: `Bearer ${token}` } }));
        expect(res.status).toBe(200);
        const body = await res.json();
        const docs = body.view.history.map((h: any) => h.docNo).sort();
        expect(docs).toEqual(['EXT-IN-SINO-1', 'EXT-OUT-SINO-2', 'LEGACY-NOID-A', 'LEGACY-NOID-B']);
        // ข้อมูลคู่ค้าส่งแค่รหัส + ชื่อ (ไม่มีอัตราค่าเช่า / กติกาภายใน)
        expect(Object.keys(body.view.partner).sort()).toEqual(['id', 'name']);
        const text = JSON.stringify(body);
        expect(text).not.toContain('rentalFee');
        expect(text).not.toContain('portalShowTotals');
        expect(text).not.toContain('คนขับลับ');
        expect(text).not.toContain('70-9999');
        expect(text).not.toContain('หมายเหตุภายใน');
        expect(text).not.toContain('LAMSOON');
        expect(body.view.showTotals).toBe(false);
        expect(body.view.balances).toEqual([]);
        // ไม่มีเงินค่าเช่าในยอด/อายุค้าง
        expect(text).not.toContain('accruedRent');
        expect(text).not.toContain('rentalRate');
    });

    it('API หน้าคู่ค้า: ไม่ล็อกอิน 401 · พนักงาน 403 · บัตรผ่านปลอม 401', async () => {
        const none = await partnerView(new Request('http://x/api/partner/view'));
        expect(none.status).toBe(401);
        const { token } = await clientFor('user_cm');
        const staff = await partnerView(new Request('http://x/api/partner/view', { headers: { Authorization: `Bearer ${token}` } }));
        expect(staff.status).toBe(403);
        const forged = await partnerView(new Request('http://x/api/partner/view', { headers: { Authorization: 'Bearer abc.def.ghi' } }));
        expect(forged.status).toBe(401);
    });

    it('API Telegram: ไม่ล็อกอิน 401 · คู่ค้า 403 · พนักงานผ่านด่านบัตรผ่าน', async () => {
        const body = JSON.stringify({ chatId: '-100', text: 'x' });
        const mk = (token?: string | null) => new Request('http://x/api/telegram/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body,
        });
        expect((await telegramSend(mk())).status).toBe(401);
        const sino = await clientFor('user_sino');
        expect((await telegramSend(mk(sino.token))).status).toBe(403);
        const staff = await clientFor('user_cm');
        const res = await telegramSend(mk(staff.token));
        // ผ่านด่านบัตรผ่านแล้ว ไปติดที่ยังไม่ตั้ง bot token ในเทสต์ (503) — ไม่ใช่ 401/403
        // (ถ้าได้ค่าอื่น แปลว่ามีความลับจริงรั่วเข้าเทสต์ หรือด่านบัตรผ่านเสีย)
        expect(res.status).toBe(503);
    });
});
