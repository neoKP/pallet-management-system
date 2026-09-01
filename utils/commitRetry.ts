import { StockValidationError } from './stockMutation';

/**
 * ตรรกะการลองใหม่เมื่อบันทึกข้อมูลไม่สำเร็จ
 *
 * แยกออกมาจาก services/firebase.ts เพื่อให้ทดสอบได้โดยไม่ต้องต่อ Firebase จริง
 * (firebase.ts พึ่ง window.firebase ซึ่งไม่มีในสภาพแวดล้อมทดสอบ)
 */

/** จำนวนครั้งที่ลองใหม่ (ไม่นับครั้งแรก) */
export const COMMIT_MAX_RETRIES = 3;

/** หน่วงก่อนลองใหม่ เพิ่มขึ้นเรื่อย ๆ เพื่อลดโอกาสชนซ้ำที่เดิม */
export const COMMIT_RETRY_DELAYS_MS = [400, 1000, 2000];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * เรียก attemptFn ซ้ำเมื่อล้มเหลวจากสาเหตุที่ "ลองใหม่แล้วมีโอกาสสำเร็จ"
 *
 * ทำไมต้องมี:
 *   การบันทึกใช้ runTransaction ที่ root ซึ่งต้องอ่านและเขียนข้อมูลทั้งก้อน
 *   ถ้ามีผู้ใช้อื่นบันทึกแทรกระหว่างนั้น Firebase จะยกเลิกแล้วต้องเริ่มใหม่
 *   ยิ่งข้อมูลใหญ่และเครือข่ายช้า (เช่นพนักงานใช้ 4G ที่หน้างาน) ยิ่งชนกันง่าย
 *   เดิมผู้ใช้ต้องกดเองใหม่ทุกครั้ง
 *
 * ไม่ลองใหม่เมื่อเป็นข้อจำกัดเชิงธุรกิจ (StockValidationError) เช่นสต็อกไม่พอ
 * หรือรายการถูกยืนยันไปแล้ว เพราะลองกี่ครั้งผลก็เหมือนเดิม มีแต่ทำให้ผู้ใช้รอนานขึ้น
 *
 * @param onRetry เรียกก่อนลองใหม่แต่ละครั้ง ใช้บันทึก log
 */
export const withCommitRetry = async (
    attemptFn: () => Promise<void>,
    onRetry?: (attempt: number, delayMs: number, error: Error) => void
): Promise<void> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= COMMIT_MAX_RETRIES; attempt++) {
        try {
            await attemptFn();
            return;
        } catch (err: any) {
            // ข้อจำกัดเชิงธุรกิจ ลองใหม่ก็ไม่ช่วย ต้องให้ผู้ใช้เห็นทันที
            if (err instanceof StockValidationError) throw err;

            lastError = err;
            if (attempt === COMMIT_MAX_RETRIES) break;

            const delay = COMMIT_RETRY_DELAYS_MS[attempt] ?? 2000;
            onRetry?.(attempt + 1, delay, err);
            await sleep(delay);
        }
    }

    throw lastError || new Error('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
};
