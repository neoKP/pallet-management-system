import { describe, it, expect } from 'vitest';
import { Transaction, Partner } from '../types';
import { buildPartnerPortalView } from './partnerPortal';
import { calculatePartnerBalance } from './businessLogic';
import { EXTERNAL_PARTNERS } from '../constants';

// ทะเบียนคู่ค้าจำลองที่เปิดแสดงยอดรวม (ใช้ทดสอบการคำนวณยอด / อายุค้าง)
const PARTNERS_WITH_TOTALS: Partner[] = EXTERNAL_PARTNERS.map(p => (p.id === 'sino' ? { ...p, portalShowTotals: true } : p));
const viewWithTotals = (txs: Transaction[]) => buildPartnerPortalView(txs, 'sino', TODAY, PARTNERS_WITH_TOTALS)!;

const TODAY = new Date('2026-11-13T00:00:00.000Z');

let seq = 0;
const tx = (o: Partial<Transaction>): Transaction => ({
    id: ++seq,
    date: '2026-11-01T08:00:00.000Z',
    docNo: `DOC-${seq}`,
    type: 'IN',
    status: 'COMPLETED',
    source: 'sino',
    dest: 'kpp',
    palletId: 'loscam_red',
    qty: 10,
    ...o,
});

describe('buildPartnerPortalView', () => {
    it('คืน null เมื่อไม่พบคู่ค้า (ไม่เดาข้อมูล)', () => {
        expect(buildPartnerPortalView([], 'no_such_partner', TODAY)).toBeNull();
    });

    it('ไม่แสดงรายการของคู่ค้ารายอื่น / รายการสาขาภายใน / รอดำเนินการ / ยกเลิก', () => {
        const mine = tx({ docNo: 'SINO-IN', source: 'sino', dest: 'kpp', qty: 30 });
        const txs = [
            mine,
            tx({ docNo: 'LAMSOON', source: 'lamsoon', dest: 'sai3', qty: 99 }),
            tx({ docNo: 'UFC-OUT', type: 'OUT', source: 'sai3', dest: 'ufc', qty: 77 }),
            tx({ docNo: 'INTERNAL', type: 'OUT', source: 'kpp', dest: 'hub_nw', qty: 55 }),
            tx({ docNo: 'PENDING', source: 'sino', status: 'PENDING', qty: 5 }),
            tx({ docNo: 'CANCEL', source: 'sino', status: 'CANCELLED', qty: 6 }),
        ];

        const view = viewWithTotals(txs);
        expect(view.history.map(h => h.docNo)).toEqual(['SINO-IN']);
        expect(view.aging.every(a => a.docNo === 'SINO-IN')).toBe(true);
    });

    it('ยอดสุทธิตรงกับสูตรยอดค้างเดิมของระบบ (รวมยอดตั้งต้น / ปรับยอด)', () => {
        const txs = [
            tx({ isInitial: true, type: 'ADJUST', source: 'system', dest: 'sino', qty: 100, palletId: 'loscam_red' }),
            tx({ source: 'sino', dest: 'kpp', qty: 40, palletId: 'loscam_red' }),
            tx({ type: 'OUT', source: 'hub_nw', dest: 'sino', qty: 15, palletId: 'loscam_red' }),
            tx({ source: 'sino', dest: 'plk', qty: 8, palletId: 'loscam_blue' }),
        ];
        const view = viewWithTotals(txs);

        const red = view.balances.find(b => b.palletId === 'loscam_red')!;
        const blue = view.balances.find(b => b.palletId === 'loscam_blue')!;
        expect(red.balance).toBe(calculatePartnerBalance(txs, 'sino', 'loscam_red'));
        expect(red.balance).toBe(100 - 40 + 15);
        expect(red.received).toBe(40);
        expect(red.returned).toBe(15);
        expect(blue.balance).toBe(-8);

        const adjust = view.history.find(h => h.kind === 'ADJUST')!;
        expect(adjust.branchName).toBe('ปรับยอดโดยระบบ');
        const ret = view.history.find(h => h.kind === 'RETURN')!;
        expect(ret.branchName).toBe('ศูนย์ฯ NW (Hub)');
    });

    it('ไม่ส่งช่องข้อมูลภายใน (คนขับ / ทะเบียนรถ / หมายเหตุ / เงินค่าเช่า) ออกไปหน้าคู่ค้า', () => {
        const txs = [
            tx({
                source: 'sino', dest: 'kpp', qty: 20, date: '2026-10-01T08:00:00.000Z',
                driverName: 'สมชาย', carRegistration: '70-1234', note: 'หมายเหตุภายใน', transportCompany: 'ABC',
            }),
        ];
        const view = viewWithTotals(txs);
        const forbidden = ['driverName', 'carRegistration', 'note', 'transportCompany', 'accruedRent', 'rentalRate'];
        for (const row of [...view.history, ...view.aging]) {
            for (const key of forbidden) expect(row).not.toHaveProperty(key);
        }
        expect(JSON.stringify(view)).not.toContain('สมชาย');
        expect(JSON.stringify(view)).not.toContain('70-1234');
    });

    it('อายุค้างใช้ผลจากรายงาน Aging เดิม และวันฟรีมาจากทะเบียนคู่ค้า', () => {
        const txs = [tx({ source: 'sino', dest: 'kpp', qty: 12, date: '2026-10-29T00:00:00.000Z' })];
        const view = viewWithTotals(txs);
        expect(view.graceDays).toBe(10);
        expect(view.aging).toHaveLength(1);
        expect(view.aging[0]).toMatchObject({ qty: 12, ageDays: 15, overdueDays: 5 });
    });

    it('ประวัติเรียงใหม่สุดก่อน', () => {
        const txs = [
            tx({ docNo: 'OLD', date: '2026-09-01T00:00:00.000Z' }),
            tx({ docNo: 'NEW', date: '2026-11-10T00:00:00.000Z' }),
        ];
        const view = buildPartnerPortalView(txs, 'sino', TODAY)!;
        expect(view.history.map(h => h.docNo)).toEqual(['NEW', 'OLD']);
    });

    it('ซีโน่ตามทะเบียนจริง (portalShowTotals: false ตั้งแต่ 17 พ.ย. 69) — ไม่ส่งยอดรวม / อายุค้าง และไม่แสดงคืนอัตโนมัติ', () => {
        const txs = [
            tx({ docNo: 'EXT-IN-1', source: 'sino', dest: 'hub_nw', qty: 12, date: '2026-10-01T00:00:00.000Z' }),
            tx({ docNo: 'EXT-IN-1-AUTO', type: 'OUT', source: 'hub_nw', dest: 'sino', qty: 12 }),
            tx({ docNo: 'EXT-OUT-2', type: 'OUT', source: 'hub_nw', dest: 'sino', qty: 5 }),
        ];
        const view = buildPartnerPortalView(txs, 'sino', TODAY)!;
        expect(view.showTotals).toBe(false);
        expect(view.balances).toEqual([]);
        expect(view.aging).toEqual([]);
        expect(view.history.map(h => h.kind).sort()).toEqual(['RECEIVE', 'RETURN']);
    });

    it('คู่ค้าที่ไม่ได้ตั้งค่า portalShowTotals = ซ่อนยอดรวมเป็นค่าเริ่มต้น', () => {
        const view = buildPartnerPortalView([tx({ source: 'ufc', dest: 'sai3' })], 'ufc', TODAY)!;
        expect(view.showTotals).toBe(false);
        expect(view.balances).toEqual([]);
    });

    it('ยังไม่กระทบยอด: ไม่แสดงรายการคืนอัตโนมัติ -AUTO และรายการปรับยอดภายใน', () => {
        const txs = [
            tx({ docNo: 'EXT-IN-1', source: 'sino', dest: 'hub_nw', qty: 50 }),
            tx({ docNo: 'EXT-IN-1-AUTO', type: 'OUT', source: 'hub_nw', dest: 'sino', qty: 50, note: 'Auto-generated from EXT-IN-1' }),
            tx({ docNo: 'OLD-AUTO-NOTE', type: 'OUT', source: 'hub_nw', dest: 'sino', qty: 7, note: 'Auto-generated from X' }),
            tx({ docNo: 'ADJ-1', type: 'ADJUST', source: 'sino', dest: 'SYSTEM_ADJUSTMENT', qty: 436, note: 'ยอดยกมา' }),
            tx({ docNo: 'EXT-OUT-REAL', type: 'OUT', source: 'hub_nw', dest: 'sino', qty: 20 }),
        ];
        // โหมดซ่อนยอดรวม (คู่ค้าที่ยังไม่กระทบยอด) — ตั้ง portalShowTotals: false ให้ชัด
        const hidden = EXTERNAL_PARTNERS.map(p => (p.id === 'sino' ? { ...p, portalShowTotals: false } : p));
        const view = buildPartnerPortalView(txs, 'sino', TODAY, hidden)!;
        expect(view.showTotals).toBe(false);
        expect(view.balances).toEqual([]);
        expect(view.history.map(h => h.docNo).sort()).toEqual(['EXT-IN-1', 'EXT-OUT-REAL']);
        expect(view.history.find(h => h.docNo === 'EXT-OUT-REAL')!.kind).toBe('RETURN');
    });

    it('เปิดยอดรวมแล้ว: -AUTO แยกป้ายเป็น AUTO และยังนับในยอดตามสูตรระบบ', () => {
        const txs = [
            tx({ docNo: 'EXT-IN-1', source: 'sino', dest: 'hub_nw', qty: 50 }),
            tx({ docNo: 'EXT-IN-1-AUTO', type: 'OUT', source: 'hub_nw', dest: 'sino', qty: 50 }),
        ];
        const view = viewWithTotals(txs);
        expect(view.history.find(h => h.docNo === 'EXT-IN-1-AUTO')!.kind).toBe('AUTO');
        const red = view.balances.find(b => b.palletId === 'loscam_red')!;
        expect(red).toMatchObject({ received: 50, returned: 50, balance: 0 });
        expect(red.balance).toBe(calculatePartnerBalance(txs, 'sino', 'loscam_red'));
    });

    it('คู่ค้าที่สูตรพิเศษ / ฝั่งลูกค้า ยังไม่รองรับหน้านี้ (คืน null ไม่แสดงป้ายผิดความหมาย)', () => {
        expect(buildPartnerPortalView([], 'loscam_wangnoi', TODAY)).toBeNull();
        expect(buildPartnerPortalView([], 'neo_corp', TODAY)).toBeNull();
        expect(buildPartnerPortalView([], 'lamsoon', TODAY)).not.toBeNull();
    });
});

