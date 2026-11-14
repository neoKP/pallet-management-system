/**
 * ตรวจว่ากฎ STEP3 ไม่ทำให้การบันทึกจริงล้ม เมื่อใช้กับ "สำเนาข้อมูลจริง" (ข้อมูลเก่าอาจผิดรูปตามกฎ .validate)
 * รันเฉพาะเมื่อมี REALDATA_FILE + emulator (ไม่อยู่ในชุดเทสต์ปกติ) · ไม่แตะข้อมูลจริง
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { initializeApp as initAdmin, deleteApp as deleteAdminApp, App as AdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getDatabase as getAdminDb } from 'firebase-admin/database';
import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, connectDatabaseEmulator, ref, get, runTransaction, goOffline } from 'firebase/database';
import { usernameToEmail } from '../utils/authClaims';

const PROJECT_ID = 'pallet-management-system-310ed';
const NS = 'pallet-management-system-310ed-default-rtdb';
const DB_HOST = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const FILE = process.env.REALDATA_FILE;
const PASSWORD = 'emulator-only-pass-1';

let admin: AdminApp;
let client: FirebaseApp;

describe.skipIf(!DB_HOST || !AUTH_HOST || !FILE)('STEP3 กับสำเนาข้อมูลจริง', () => {
    beforeAll(async () => {
        admin = initAdmin({ projectId: PROJECT_ID, databaseURL: `http://${DB_HOST}?ns=${NS}` }, 'admin-real');
        const u = await getAdminAuth(admin).createUser({ email: usernameToEmail('user_cm'), password: PASSWORD });
        await getAdminAuth(admin).setCustomUserClaims(u.uid, { role: 'USER', branchId: 'cm' });
        await getAdminDb(admin).ref('/').set(JSON.parse(readFileSync(FILE!, 'utf8')));
        client = initializeApp({ projectId: PROJECT_ID, apiKey: 'emulator', databaseURL: `http://${DB_HOST}?ns=${NS}` }, 'c-real');
        connectAuthEmulator(getAuth(client), `http://${AUTH_HOST}`, { disableWarnings: true });
        const [h, p] = DB_HOST!.split(':');
        connectDatabaseEmulator(getDatabase(client), h, Number(p));
        await signInWithEmailAndPassword(getAuth(client), usernameToEmail('user_cm'), PASSWORD);
    }, 120000);

    afterAll(async () => {
        try { goOffline(getDatabase(client)); } catch { /* */ }
        await deleteApp(client).catch(() => {});
        await deleteAdminApp(admin).catch(() => {});
    });

    it('พนักงานบันทึกแบบก้อนเดียวที่ราก (เหมือน commitStockMutation) ได้ บนข้อมูลจริงทั้งก้อน', async () => {
        const db = getDatabase(client);
        const before = (await get(ref(db, 'stock/cm/loscam_red'))).val();
        const r = await runTransaction(ref(db, '/'), (cur: any) => {
            if (!cur) return cur;
            cur.stock.cm.loscam_red = (cur.stock.cm.loscam_red || 0) + 1;
            return cur;
        });
        expect(r.committed).toBe(true);
        expect((await get(ref(db, 'stock/cm/loscam_red'))).val()).toBe(before + 1);
    }, 120000);
});
