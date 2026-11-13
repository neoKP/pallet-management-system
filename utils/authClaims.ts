import { User, UserRole, BranchId } from '../types';
import { AUTHORIZED_USERS, BRANCHES, EXTERNAL_PARTNERS } from '../constants';

/**
 * กติกาบัตรผ่าน (Firebase custom claims) — ใช้ร่วมกันทั้งหน้าเว็บและเซิร์ฟเวอร์
 *
 * ทำไมเก็บบทบาทในบัตรผ่าน ไม่เก็บในฐานข้อมูล:
 *   การบันทึกสต็อกต้องเขียนที่ราก (root) ของฐานข้อมูล สิทธิ์เขียนจึงไหลลงทุกจุด
 *   ถ้าเก็บบทบาทไว้ในฐาน พนักงานจะแก้ตัวเองเป็น ADMIN ได้ (ดู docs/FIREBASE_RULES_GUIDE.md)
 *   บัตรผ่านออกโดยเซิร์ฟเวอร์ Firebase เท่านั้น ผู้ใช้แก้เองไม่ได้
 */

/** อีเมลของบัญชีใน Firebase = ชื่อผู้ใช้ + โดเมนของโปรเจ็คเอง (ไม่ใช่อีเมลจริง ไม่ส่งอีเมลออก) */
export const ACCOUNT_EMAIL_DOMAIN = 'pallet-management-system-310ed.firebaseapp.com';

export const usernameToEmail = (username: string): string => `${username}@${ACCOUNT_EMAIL_DOMAIN}`;

export const emailToUsername = (email: string | null | undefined): string | null => {
    if (!email) return null;
    const suffix = `@${ACCOUNT_EMAIL_DOMAIN}`;
    return email.toLowerCase().endsWith(suffix) ? email.slice(0, -suffix.length) : null;
};

/** คู่ค้าต้องล็อกอินใหม่ทุก 12 ชม. (นับจากเวลาที่ใส่รหัสครั้งล่าสุด — auth_time ในบัตรผ่าน) */
export const PARTNER_SESSION_SECONDS = 12 * 60 * 60;

export interface AccountClaims {
    role: UserRole;
    branchId?: BranchId;
    partnerId?: string;
}

const ROLES: UserRole[] = ['ADMIN', 'USER', 'PARTNER'];

/**
 * ตรวจรูปแบบบัตรผ่าน — คืน null ถ้าไม่ครบหรือขัดกัน (ต้องปฏิเสธ ไม่เดาสิทธิ์)
 * USER ต้องมีสาขาที่มีจริง · PARTNER ต้องมีคู่ค้าที่มีจริง · ADMIN ไม่ผูกสาขา/คู่ค้า
 */
export const parseClaims = (raw: Record<string, unknown> | null | undefined): AccountClaims | null => {
    if (!raw) return null;
    const role = raw.role;
    if (typeof role !== 'string' || !ROLES.includes(role as UserRole)) return null;

    if (role === 'ADMIN') return { role: 'ADMIN' };

    if (role === 'USER') {
        const branchId = raw.branchId;
        if (typeof branchId !== 'string' || !BRANCHES.some(b => b.id === branchId)) return null;
        return { role: 'USER', branchId: branchId as BranchId };
    }

    const partnerId = raw.partnerId;
    if (typeof partnerId !== 'string' || !EXTERNAL_PARTNERS.some(p => p.id === partnerId)) return null;
    return { role: 'PARTNER', partnerId };
};

/** บัตรผ่านที่ควรออกให้แต่ละบัญชี (สคริปต์สร้างบัญชีใช้ฟังก์ชันนี้) */
export const claimsForAccount = (u: User): AccountClaims => {
    if (u.role === 'ADMIN') return { role: 'ADMIN' };
    if (u.role === 'PARTNER') return { role: 'PARTNER', partnerId: u.partnerId };
    return { role: 'USER', branchId: u.branchId };
};

/**
 * สร้าง User ของแอปจากบัตรผ่าน — สิทธิ์ยึดตามบัตรผ่านเท่านั้น
 * ชื่อที่แสดงยืมจาก AUTHORIZED_USERS (ถ้าไม่พบใช้ชื่อผู้ใช้)
 */
export const userFromClaims = (username: string | null, raw: Record<string, unknown> | null | undefined): User | null => {
    if (!username) return null;
    const claims = parseClaims(raw);
    if (!claims) return null;
    const known = AUTHORIZED_USERS.find(u => u.username === username);
    return {
        username,
        role: claims.role,
        branchId: claims.branchId,
        partnerId: claims.partnerId,
        name: known?.name || username,
    };
};

/** บทบาทที่อ่าน/เขียนฐานข้อมูลได้ (ต้องตรงกับกฎใน database.rules.STEP3-AUTH.json) */
export const isStaffRole = (role: UserRole | undefined | null): boolean => role === 'ADMIN' || role === 'USER';

/** เซสชันคู่ค้ายังไม่หมดอายุ (authTimeSec = auth_time ในบัตรผ่าน หน่วยวินาที) */
export const isPartnerSessionFresh = (authTimeSec: number | undefined, nowMs: number): boolean => {
    if (typeof authTimeSec !== 'number' || !Number.isFinite(authTimeSec)) return false;
    const ageSec = nowMs / 1000 - authTimeSec;
    return ageSec >= -300 && ageSec < PARTNER_SESSION_SECONDS; // เผื่อนาฬิกาเครื่องคลาด 5 นาที
};
