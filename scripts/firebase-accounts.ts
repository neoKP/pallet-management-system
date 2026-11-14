/**
 * สร้าง / ตั้งสิทธิ์บัญชี Firebase Authentication ให้ตรงกับ AUTHORIZED_USERS
 *
 * วิธีใช้ (PowerShell / Git Bash ในโฟลเดอร์โปรเจ็ค):
 *   ซ้อม (ค่าเริ่มต้น ไม่แก้อะไร):   npx vite-node scripts/firebase-accounts.ts -- --key "<ไฟล์กุญแจ .json>"
 *   สร้างจริง:                       npx vite-node scripts/firebase-accounts.ts -- --key "<ไฟล์>" --apply
 *   รีเซ็ตรหัส 1 บัญชี:              ... --apply --reset user_cm
 *   เปิด / ปิดบัญชี:                  ... --apply --enable user_sino   |   --disable user_sino
 *   ตั้งรหัสที่ผู้บริหารกำหนดเอง:      ... --apply --set-password admin            (รหัสอ่านจากตัวแปร NEW_PASSWORD)
 *                                    ... --apply --set-password all-staff        (ทุกบัญชี USER — ไม่รวม ADMIN / PARTNER)
 *
 * กติกา:
 * - บัญชีที่ยังไม่มี → สร้างพร้อมรหัสสุ่ม 14 ตัว · บัญชีที่มีแล้ว → ไม่เปลี่ยนรหัส (ยกเว้น --reset)
 * - บัตรผ่าน (role / branchId / partnerId) ตั้งให้ตรงรายชื่อในโค้ดทุกบัญชี
 * - บัญชีคู่ค้า (PARTNER) สร้างแบบ "ปิดใช้งาน" ไว้ก่อน — เปิดด้วย --enable เมื่อผู้บริหารอนุมัติ
 * - รหัสผ่านเขียนลงไฟล์ CSV ใน Downloads เท่านั้น ไม่พิมพ์ออกจอ
 * - รีเซ็ต / ปิดบัญชี → ยกเลิกเซสชัน (revokeRefreshTokens) เครื่องที่เปิดค้างจะหลุดภายในไม่เกิน 1 ชั่วโมง
 *   (บัตรผ่านที่ออกไปแล้วใช้ได้จนหมดอายุ 1 ชม. — ข้อจำกัดของ Firebase ที่กฎฐานข้อมูลตรวจซ้ำไม่ได้)
 *
 * ทดสอบกับตัวจำลอง: ตั้ง FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 (ไม่ต้องใช้ --key)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { randomInt } from 'crypto';
import { initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth, UserRecord } from 'firebase-admin/auth';
import { AUTHORIZED_USERS } from '../constants';
import { usernameToEmail, claimsForAccount, parseClaims } from '../utils/authClaims';

const PROJECT_ID = 'pallet-management-system-310ed';

const args = process.argv.slice(2).filter(a => a !== '--');
const flag = (name: string) => args.includes(name);
const value = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
};

const APPLY = flag('--apply');
const RESET = value('--reset');
const ENABLE = value('--enable');
const DISABLE = value('--disable');
const SET_PASSWORD = value('--set-password');
const NEW_PASSWORD = process.env.NEW_PASSWORD;
const KEY = value('--key') || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const OUT_DIR = value('--out') || join(homedir(), 'Downloads');
const EMULATOR = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;

/** ตัวอักษรที่อ่านง่าย ไม่สับสน (ไม่มี 0/O, 1/l/I) */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
export const generatePassword = (len = 14): string =>
    Array.from({ length: len }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

const sameClaims = (a: Record<string, unknown> | undefined, b: Record<string, unknown>) =>
    JSON.stringify(parseClaims(a ?? null)) === JSON.stringify(parseClaims(b));

const initApp = (): App => {
    if (EMULATOR) return initializeApp({ projectId: PROJECT_ID }, 'accounts');
    if (!KEY) {
        console.error('ไม่พบไฟล์กุญแจ: ใส่ --key "<path ไฟล์ .json จาก Firebase>"');
        process.exit(2);
    }
    const sa = JSON.parse(readFileSync(KEY, 'utf8'));
    if (sa.project_id !== PROJECT_ID) {
        console.error(`ไฟล์กุญแจเป็นของโปรเจ็ค ${sa.project_id} ไม่ใช่ ${PROJECT_ID} — หยุด`);
        process.exit(2);
    }
    return initializeApp({ credential: cert(sa), projectId: PROJECT_ID }, 'accounts');
};

/** บัญชีที่ --set-password ครอบ (all-staff = เฉพาะ USER · คู่ค้าต้องตั้งทีละบัญชีเท่านั้น) */
const setPasswordTargets = (target: string | undefined): Set<string> => {
    if (!target) return new Set();
    if (target === 'all-staff') return new Set(AUTHORIZED_USERS.filter(u => u.role === 'USER').map(u => u.username));
    return new Set([target]);
};

const main = async () => {
    if (SET_PASSWORD) {
        if (!NEW_PASSWORD || NEW_PASSWORD.length < 6) {
            console.error('ใส่รหัสใหม่ในตัวแปร NEW_PASSWORD อย่างน้อย 6 ตัว (Firebase บังคับ)');
            process.exit(2);
        }
        if (SET_PASSWORD !== 'all-staff' && !AUTHORIZED_USERS.some(u => u.username === SET_PASSWORD)) {
            console.error(`ไม่รู้จักบัญชี ${SET_PASSWORD}`);
            process.exit(2);
        }
    }
    const setTargets = setPasswordTargets(SET_PASSWORD);
    for (const target of [RESET, ENABLE, DISABLE]) {
        if (target && !AUTHORIZED_USERS.some(u => u.username === target)) {
            console.error(`ไม่รู้จักบัญชี ${target}`);
            process.exit(2);
        }
    }

    const auth = getAuth(initApp());
    const issued: { username: string; name: string; password: string; note: string }[] = [];
    const lines: string[] = [];

    for (const u of AUTHORIZED_USERS) {
        const email = usernameToEmail(u.username);
        const claims = claimsForAccount(u) as unknown as Record<string, unknown>;
        let rec: UserRecord | null = await auth.getUserByEmail(email).catch(() => null);
        const state = rec ? (rec.disabled ? 'มีแล้ว (ปิดอยู่)' : 'มีแล้ว') : 'ยังไม่มี';
        const actions: string[] = [];

        if (!rec) {
            const password = generatePassword();
            const disabled = u.role === 'PARTNER';
            actions.push(disabled ? 'สร้าง (ปิดใช้งานไว้ก่อน)' : 'สร้าง');
            if (APPLY) {
                rec = await auth.createUser({ email, password, displayName: u.name, disabled });
                issued.push({ username: u.username, name: u.name, password, note: disabled ? 'ปิดใช้งานอยู่ — รออนุมัติ' : 'ใหม่' });
            }
        } else if (setTargets.has(u.username)) {
            actions.push('ตั้งรหัสที่กำหนด + ยกเลิกเซสชันเดิม');
            if (APPLY) {
                await auth.updateUser(rec.uid, { password: NEW_PASSWORD! });
                await auth.revokeRefreshTokens(rec.uid);
            }
        } else if (RESET === u.username) {
            actions.push('รีเซ็ตรหัส + ยกเลิกเซสชันเดิม');
            if (APPLY) {
                const password = generatePassword();
                await auth.updateUser(rec.uid, { password });
                await auth.revokeRefreshTokens(rec.uid);
                issued.push({ username: u.username, name: u.name, password, note: 'รีเซ็ต' });
            }
        }

        if (!rec || !sameClaims(rec.customClaims, claims)) {
            actions.push(`ตั้งบัตรผ่าน ${JSON.stringify(claims)}`);
            if (APPLY && rec) await auth.setCustomUserClaims(rec.uid, claims);
        }

        if (rec && ENABLE === u.username && rec.disabled) {
            actions.push('เปิดใช้งาน');
            if (APPLY) await auth.updateUser(rec.uid, { disabled: false });
        }
        if (rec && DISABLE === u.username && !rec.disabled) {
            actions.push('ปิดใช้งาน + ยกเลิกเซสชัน');
            if (APPLY) {
                await auth.updateUser(rec.uid, { disabled: true });
                await auth.revokeRefreshTokens(rec.uid);
            }
        }

        lines.push(`${u.username.padEnd(18)} ${state.padEnd(16)} ${actions.join(' · ') || 'ไม่ต้องทำอะไร'}`);
    }

    console.log(`${EMULATOR ? '[ตัวจำลอง] ' : ''}${APPLY ? 'ทำจริง' : 'ซ้อม (ยังไม่แก้อะไร — ใส่ --apply เพื่อทำจริง)'}`);
    console.log(lines.join('\n'));

    if (issued.length) {
        mkdirSync(OUT_DIR, { recursive: true });
        // ห้ามเขียนทับไฟล์เดิมเด็ดขาด — ถ้ารหัสชุดก่อนหาย บัญชีนั้นต้องรีเซ็ตใหม่ทั้งหมด
        const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
        let file = join(OUT_DIR, `รหัสผ่านระบบพาเลท_${stamp}.csv`);
        for (let n = 2; existsSync(file); n++) file = join(OUT_DIR, `รหัสผ่านระบบพาเลท_${stamp}_${n}.csv`);
        const csv = '﻿' + ['บัญชี,ชื่อ,รหัสผ่าน,หมายเหตุ']
            .concat(issued.map(r => [r.username, r.name, r.password, r.note].map(v => `"${v.replace(/"/g, '""')}"`).join(',')))
            .join('\r\n');
        writeFileSync(file, csv, { encoding: 'utf8', flag: 'wx' });
        console.log(`\nรหัสผ่าน ${issued.length} บัญชี บันทึกที่: ${file}`);
        console.log('ไฟล์นี้เป็นความลับ — แจกรหัสแล้วลบไฟล์ทิ้ง ห้ามส่งเข้ากลุ่มแชต');
    }
};

main().then(() => process.exit(0)).catch(e => {
    console.error('ผิดพลาด:', e?.message || e);
    process.exit(1);
});
