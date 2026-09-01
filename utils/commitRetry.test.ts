import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StockValidationError } from './stockMutation';
import { withCommitRetry, COMMIT_MAX_RETRIES, COMMIT_RETRY_DELAYS_MS } from './commitRetry';

/**
 * ทดสอบตรรกะการลองใหม่ที่ services/firebase.ts ใช้จริง
 * (ไม่ใช่สำเนา — เรียก withCommitRetry ตัวเดียวกับที่ production ใช้)
 */

describe('การลองใหม่อัตโนมัติเมื่อบันทึกไม่สำเร็จ', () => {
    // ใช้ fake timer เพื่อไม่ต้องรอหน่วงเวลาจริง (รวมกัน 3.4 วินาที)
    // แต่ยังทดสอบ withCommitRetry ตัวเดียวกับที่ production ใช้
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    /** เดินเวลาให้ครบทุกช่วงหน่วง เพื่อให้ retry ทำงานจนจบ */
    const runAllRetries = async (promise: Promise<unknown>) => {
        await vi.runAllTimersAsync();
        return promise;
    };

    it('สำเร็จตั้งแต่ครั้งแรก ต้องไม่ลองซ้ำ', async () => {
        const fn = vi.fn().mockResolvedValue(undefined);
        await withCommitRetry(fn);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('ชนกับผู้ใช้อื่นครั้งแรก แล้วสำเร็จในครั้งที่สอง', async () => {
        const fn = vi.fn()
            .mockRejectedValueOnce(new Error('อาจมีผู้ใช้อื่นแก้ไขพร้อมกัน'))
            .mockResolvedValue(undefined);

        await runAllRetries(withCommitRetry(fn));
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('ลองใหม่สูงสุด 3 ครั้ง (รวมครั้งแรกเป็น 4)', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('ชนกันตลอด'));

        const p = withCommitRetry(fn);
        await expect(runAllRetries(p)).rejects.toThrow('ชนกันตลอด');
        expect(fn).toHaveBeenCalledTimes(COMMIT_MAX_RETRIES + 1);
    });

    it('ข้อจำกัดเชิงธุรกิจ (สต็อกไม่พอ) ต้องไม่ลองซ้ำ', async () => {
        // ลองกี่ครั้งสต็อกก็ยังไม่พอ การลองซ้ำมีแต่ทำให้ผู้ใช้รอนานขึ้น
        const fn = vi.fn().mockRejectedValue(
            new StockValidationError('สต็อกไม่เพียงพอ: ศูนย์ฯ NW มี Loscam เหลือ 5 แต่ต้องการจ่าย 10')
        );

        await expect(withCommitRetry(fn)).rejects.toThrow(StockValidationError);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('รายการถูกยืนยันรับไปแล้ว ต้องไม่ลองซ้ำ', async () => {
        const fn = vi.fn().mockRejectedValue(
            new StockValidationError('รายการ INT-001 ถูกยืนยันรับไปแล้ว กรุณารีเฟรชหน้าจอ')
        );

        await expect(withCommitRetry(fn)).rejects.toThrow('ถูกยืนยันรับไปแล้ว');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('ส่งข้อความ error ของครั้งสุดท้ายออกไป ไม่ใช่ข้อความกลาง ๆ', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('เครือข่ายขัดข้อง'));
        const p = withCommitRetry(fn);
        await expect(runAllRetries(p)).rejects.toThrow('เครือข่ายขัดข้อง');
    });
});

describe('ค่าหน่วงเวลาก่อนลองใหม่', () => {
    it('เพิ่มขึ้นเรื่อย ๆ เพื่อลดโอกาสชนซ้ำที่เดิม', () => {
        for (let i = 1; i < COMMIT_RETRY_DELAYS_MS.length; i++) {
            expect(COMMIT_RETRY_DELAYS_MS[i]).toBeGreaterThan(COMMIT_RETRY_DELAYS_MS[i - 1]);
        }
    });

    it('มีค่าหน่วงครบตามจำนวนครั้งที่ลองใหม่', () => {
        expect(COMMIT_RETRY_DELAYS_MS.length).toBe(COMMIT_MAX_RETRIES);
    });

    it('รอรวมกันไม่เกิน 4 วินาที ผู้ใช้ไม่รอนานเกินไป', () => {
        const total = COMMIT_RETRY_DELAYS_MS.reduce((a, b) => a + b, 0);
        expect(total).toBeLessThanOrEqual(4000);
    });
});
