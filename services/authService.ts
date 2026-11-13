import { User } from '../types';
import { usernameToEmail, emailToUsername, userFromClaims, isPartnerSessionFresh } from '../utils/authClaims';

/**
 * ล็อกอินจริงด้วย Firebase Authentication
 *
 * รหัสผ่านตรวจที่เซิร์ฟเวอร์ของ Firebase (ไม่มีรหัสในไฟล์เว็บ)
 * สิทธิ์ (บทบาท / สาขา / คู่ค้า) มาจากบัตรผ่านที่ Firebase ออกให้ — แก้ในเบราว์เซอร์ไม่ได้
 * และกฎฐานข้อมูล (database.rules.STEP3-AUTH.json) ตรวจบัตรผ่านเดียวกันนี้ทุกครั้งที่อ่าน/เขียน
 */

const fb = () => {
    const f = (window as any).firebase;
    if (!f?.auth || !f?.authUtils) throw new Error('Firebase Auth not initialized');
    return { auth: f.auth(), u: f.authUtils };
};

export class LoginError extends Error {}

const LOGIN_MESSAGES: Record<string, string> = {
    'auth/invalid-credential': 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    'auth/wrong-password': 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    'auth/user-not-found': 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    'auth/invalid-email': 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    'auth/user-disabled': 'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแล',
    'auth/too-many-requests': 'ลองรหัสผิดหลายครั้งเกินไป ระบบพักการเข้าชั่วคราว กรุณารอสักครู่',
    'auth/network-request-failed': 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ กรุณาลองใหม่',
};

export const loginErrorMessage = (code: string | undefined): string =>
    (code && LOGIN_MESSAGES[code]) || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่';

/** อ่านผู้ใช้จากบัตรผ่านปัจจุบัน — บัตรผ่านไม่ครบ / คู่ค้าหมดอายุ = null (ต้องออกจากระบบ) */
const userFromFirebase = async (fbUser: any, forceRefresh = false): Promise<User | null> => {
    if (!fbUser) return null;
    const result = await fbUser.getIdTokenResult(forceRefresh);
    const user = userFromClaims(emailToUsername(fbUser.email), result.claims);
    if (!user) return null;
    if (user.role === 'PARTNER') {
        const authTimeSec = Number(result.claims.auth_time);
        if (!isPartnerSessionFresh(authTimeSec, Date.now())) return null;
    }
    return user;
};

export const signIn = async (username: string, password: string): Promise<User> => {
    const { auth, u } = fb();
    let cred: any;
    try {
        cred = await u.signInWithEmailAndPassword(auth, usernameToEmail(username), password);
    } catch (e: any) {
        throw new LoginError(loginErrorMessage(e?.code));
    }
    const user = await userFromFirebase(cred.user, true);
    if (!user) {
        await u.signOut(auth).catch(() => {});
        throw new LoginError('บัญชีนี้ยังไม่ได้ตั้งสิทธิ์ในระบบ กรุณาติดต่อผู้ดูแล');
    }
    // กันกรณีถูกออกจากระบบระหว่างตรวจสิทธิ์ (เช่น ตัวติดตามสถานะตัดสินพร้อมกัน) — ห้ามแสดงหน้าในระบบทั้งที่หลุดแล้ว
    if (auth.currentUser?.uid !== cred.user.uid) {
        throw new LoginError('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
    }
    return user;
};

export const signOutUser = async (): Promise<void> => {
    const { auth, u } = fb();
    await u.signOut(auth);
};

/**
 * ติดตามสถานะล็อกอิน — callback ได้ User หรือ null · คืนฟังก์ชันเลิกติดตาม
 * - ผลของสถานะเก่าที่มาช้า จะไม่ทับสถานะใหม่ (เช่น เข้าแล้วออกเร็ว ๆ)
 * - อ่านบัตรผ่านไม่ได้เพราะเน็ตหลุด → ลองใหม่ทุก 3 วิ (ไม่ส่ง null ทันที ไม่งั้นค้างหน้า Login ทั้งที่ยังล็อกอินอยู่)
 */
export const watchAuth = (cb: (user: User | null) => void): (() => void) => {
    const { auth, u } = fb();
    let seq = 0;
    let stopped = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const unsub = u.onAuthStateChanged(auth, (fbUser: any) => {
        const mine = ++seq;
        if (retryTimer) clearTimeout(retryTimer);

        const attempt = async (n: number) => {
            try {
                let user = await userFromFirebase(fbUser);
                // บัตรผ่านที่เครื่องจำไว้อาจเก่า (สิทธิ์เพิ่งเปลี่ยน) — ขอใบใหม่ก่อนตัดสินว่าไม่มีสิทธิ์
                if (fbUser && !user) user = await userFromFirebase(fbUser, true);
                if (stopped || mine !== seq) return;
                if (fbUser && !user) await u.signOut(auth).catch(() => {});
                cb(user);
            } catch (e) {
                if (stopped || mine !== seq) return;
                if (n < 20) {
                    retryTimer = setTimeout(() => attempt(n + 1), 3000);
                } else {
                    console.error('[auth] อ่านบัตรผ่านไม่สำเร็จ', e);
                    cb(null);
                }
            }
        };
        attempt(0);
    });

    return () => {
        stopped = true;
        if (retryTimer) clearTimeout(retryTimer);
        unsub();
    };
};

/** ตรวจซ้ำว่าเซสชันคู่ค้ายังไม่หมดอายุ (ใช้ตอนเปิดหน้าค้างไว้นาน) */
export const recheckCurrentUser = async (): Promise<User | null> => {
    const { auth } = fb();
    return userFromFirebase(auth.currentUser);
};

/** บัตรผ่านสำหรับเรียก API ของเรา (Authorization: Bearer ...) */
export const getIdToken = async (): Promise<string | null> => {
    const { auth } = fb();
    return auth.currentUser ? auth.currentUser.getIdToken() : null;
};

/**
 * ยืนยันรหัสผ่านของผู้ใช้ปัจจุบันอีกครั้งก่อนทำงานอันตราย (แทนรหัส Admin ที่เคยฝังในโค้ด)
 * คืน true เมื่อรหัสถูก
 */
export const confirmCurrentPassword = async (password: string): Promise<boolean> => {
    const { auth, u } = fb();
    const current = auth.currentUser;
    if (!current?.email || !password) return false;
    try {
        await u.reauthenticateWithCredential(current, u.EmailAuthProvider.credential(current.email, password));
        return true;
    } catch {
        return false;
    }
};
