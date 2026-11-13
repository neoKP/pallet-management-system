import { describe, it, expect } from 'vitest';
import {
    usernameToEmail, emailToUsername, parseClaims, claimsForAccount, userFromClaims,
    isStaffRole, isPartnerSessionFresh, PARTNER_SESSION_SECONDS,
} from './authClaims';
import { AUTHORIZED_USERS } from '../constants';

describe('อีเมลบัญชี', () => {
    it('แปลงไป-กลับได้ และไม่รับอีเมลโดเมนอื่น', () => {
        expect(emailToUsername(usernameToEmail('user_nw'))).toBe('user_nw');
        expect(emailToUsername('user_nw@evil.com')).toBeNull();
        expect(emailToUsername(null)).toBeNull();
    });
});

describe('parseClaims', () => {
    it('รับบัตรผ่านที่ถูกต้อง', () => {
        expect(parseClaims({ role: 'ADMIN' })).toEqual({ role: 'ADMIN' });
        expect(parseClaims({ role: 'USER', branchId: 'cm' })).toEqual({ role: 'USER', branchId: 'cm' });
        expect(parseClaims({ role: 'PARTNER', partnerId: 'sino' })).toEqual({ role: 'PARTNER', partnerId: 'sino' });
    });
    it('ปฏิเสธบัตรผ่านที่ไม่ครบ / ขัดกัน / บทบาทแปลก (ไม่เดาสิทธิ์)', () => {
        expect(parseClaims(null)).toBeNull();
        expect(parseClaims({})).toBeNull();
        expect(parseClaims({ role: 'SUPERADMIN' })).toBeNull();
        expect(parseClaims({ role: 'USER' })).toBeNull();
        expect(parseClaims({ role: 'USER', branchId: 'no_such_branch' })).toBeNull();
        expect(parseClaims({ role: 'PARTNER' })).toBeNull();
        expect(parseClaims({ role: 'PARTNER', partnerId: 'no_such_partner' })).toBeNull();
    });
    it('ADMIN ไม่ติดสาขา/คู่ค้าที่แนบมา', () => {
        expect(parseClaims({ role: 'ADMIN', branchId: 'cm', partnerId: 'sino' })).toEqual({ role: 'ADMIN' });
    });
});

describe('claimsForAccount + userFromClaims', () => {
    it('ทุกบัญชีใน AUTHORIZED_USERS ได้บัตรผ่านที่ตรวจผ่าน และแปลงกลับเป็นผู้ใช้เดิม', () => {
        for (const u of AUTHORIZED_USERS) {
            const claims = claimsForAccount(u);
            expect(parseClaims(claims as any)).not.toBeNull();
            const back = userFromClaims(u.username, claims as any)!;
            expect(back).toMatchObject({ username: u.username, role: u.role, name: u.name });
            expect(back.branchId).toBe(u.role === 'USER' ? u.branchId : undefined);
            expect(back.partnerId).toBe(u.role === 'PARTNER' ? u.partnerId : undefined);
        }
    });
    it('สิทธิ์ยึดบัตรผ่าน ไม่ยึดรายชื่อในโค้ด', () => {
        // บัญชีชื่อ admin แต่บัตรผ่านเป็น USER สาขา cm → ได้สิทธิ์ USER เท่านั้น
        expect(userFromClaims('admin', { role: 'USER', branchId: 'cm' })).toMatchObject({ role: 'USER', branchId: 'cm' });
        expect(userFromClaims('user_nw', null)).toBeNull();
        expect(userFromClaims(null, { role: 'ADMIN' })).toBeNull();
    });
});

describe('isStaffRole / isPartnerSessionFresh', () => {
    it('เฉพาะ ADMIN / USER อ่านเขียนฐานข้อมูลได้', () => {
        expect(isStaffRole('ADMIN')).toBe(true);
        expect(isStaffRole('USER')).toBe(true);
        expect(isStaffRole('PARTNER')).toBe(false);
        expect(isStaffRole(undefined)).toBe(false);
    });
    it('คู่ค้าหมดอายุเมื่อครบ 12 ชม. นับจากใส่รหัส', () => {
        const now = Date.parse('2026-11-13T12:00:00Z');
        const nowSec = now / 1000;
        expect(isPartnerSessionFresh(nowSec - 60, now)).toBe(true);
        expect(isPartnerSessionFresh(nowSec - PARTNER_SESSION_SECONDS, now)).toBe(false);
        expect(isPartnerSessionFresh(nowSec + 3600, now)).toBe(false);
        expect(isPartnerSessionFresh(undefined, now)).toBe(false);
    });
});
