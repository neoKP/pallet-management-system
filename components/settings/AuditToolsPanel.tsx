import React, { useEffect, useState } from 'react';
import { ClipboardCheck, FileSpreadsheet, Lock, Unlock } from 'lucide-react';
import Swal from 'sweetalert2';
import { useStock } from '../../contexts/StockContext';
import * as firebaseService from '../../services/firebase';
import {
    COUNT_FREEZE_HOUR_OPTIONS,
    Quarter,
    buildCountFreeze,
    buildCutoffSnapshot,
    getPreviousQuarter,
    isCountFreezeActive,
} from '../../utils/auditControls';
import { exportCutoffSnapshotToExcel } from '../../utils/cutoffExport';

interface AuditToolsPanelProps {
    userName: string;
}

/**
 * เครื่องมือสำหรับวันตรวจนับสต็อกรายไตรมาส (เฉพาะผู้ดูแลระบบ)
 *   - เปิด/ปิดโหมดตรวจนับ: ปิดรับการบันทึกทุกสาขาชั่วคราว
 *   - ส่งออกข้อมูล ณ เวลาตัดยอด: ยอดคงเหลือและรายการทั้งไตรมาสในไฟล์เดียว
 */
export const AuditToolsPanel: React.FC<AuditToolsPanelProps> = ({ userName }) => {
    const { config, updateSystemConfig } = useStock();
    const freeze = config?.countFreeze;
    const [now, setNow] = useState(() => Date.now());
    const [isBusy, setIsBusy] = useState(false);

    useEffect(() => {
        if (!freeze?.active) return;
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(timer);
    }, [freeze?.active, freeze?.until]);

    const isFrozen = isCountFreezeActive(freeze, now);
    const formatTime = (iso: string) =>
        new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    const handleStartFreeze = async () => {
        const { value } = await Swal.fire({
            title: 'เปิดโหมดตรวจนับสต็อก',
            html:
                `<div class="text-left">
                    <p class="text-xs text-slate-500 mb-4">ทุกสาขาจะบันทึกรับ-จ่าย โอนย้าย ซ่อม และปรับยอดไม่ได้จนกว่าจะปิดโหมดหรือครบเวลา</p>
                    <label class="block text-sm font-bold text-slate-700 mb-1">ปิดรับการบันทึกนาน</label>
                    <select id="swal-freeze-hours" class="swal2-select w-full m-0">
                        ${COUNT_FREEZE_HOUR_OPTIONS.map(h => `<option value="${h}" ${h === 4 ? 'selected' : ''}>${h} ชั่วโมง</option>`).join('')}
                    </select>
                    <label class="block text-sm font-bold text-slate-700 mt-4 mb-1">หมายเหตุ (ไม่บังคับ)</label>
                    <input id="swal-freeze-note" class="swal2-input w-full m-0" maxlength="200" placeholder="เช่น ตรวจนับ Q1/2026">
                </div>`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'เปิดโหมดตรวจนับ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#d97706',
            preConfirm: () => ({
                hours: parseInt((document.getElementById('swal-freeze-hours') as HTMLSelectElement).value, 10),
                note: (document.getElementById('swal-freeze-note') as HTMLInputElement).value,
            }),
        });
        if (!value) return;

        setIsBusy(true);
        try {
            const next = buildCountFreeze({ hours: value.hours, note: value.note, by: userName, now: new Date() });
            await updateSystemConfig({ countFreeze: next });
            Swal.fire({
                icon: 'success',
                title: 'เปิดโหมดตรวจนับแล้ว',
                text: `ระบบปิดรับการบันทึกถึงเวลา ${formatTime(next.until)} น. อย่าลืมส่งออกข้อมูล ณ เวลาตัดยอด`,
            });
        } catch (error: any) {
            Swal.fire({ icon: 'error', title: 'เปิดโหมดไม่สำเร็จ', text: error?.message || 'กรุณาลองใหม่อีกครั้ง' });
        } finally {
            setIsBusy(false);
        }
    };

    const handleStopFreeze = async () => {
        const result = await Swal.fire({
            icon: 'question',
            title: 'ปิดโหมดตรวจนับ?',
            text: 'ทุกสาขาจะกลับมาบันทึกรายการได้ตามปกติ ควรปิดหลังยืนยันผลกระทบยอดแล้ว',
            showCancelButton: true,
            confirmButtonText: 'ปิดโหมดและเปิดระบบ',
            cancelButtonText: 'ยกเลิก',
        });
        if (!result.isConfirmed) return;

        setIsBusy(true);
        try {
            await updateSystemConfig({ countFreeze: null });
            Swal.fire({ icon: 'success', title: 'เปิดระบบแล้ว', timer: 2000, showConfirmButton: false });
        } catch (error: any) {
            Swal.fire({ icon: 'error', title: 'ปิดโหมดไม่สำเร็จ', text: error?.message || 'กรุณาลองใหม่อีกครั้ง' });
        } finally {
            setIsBusy(false);
        }
    };

    const handleExportCutoff = async () => {
        const fallback = getPreviousQuarter(new Date());
        const { value } = await Swal.fire({
            title: 'ส่งออกข้อมูล ณ เวลาตัดยอด',
            html:
                `<div class="text-left">
                    <p class="text-xs text-slate-500 mb-4">ไฟล์ Excel จะมียอดคงเหลือ ณ ขณะนี้ และรายการทั้งหมดของไตรมาสที่เลือก</p>
                    <label class="block text-sm font-bold text-slate-700 mb-1">ไตรมาสที่ตรวจ</label>
                    <select id="swal-cutoff-quarter" class="swal2-select w-full m-0">
                        ${[1, 2, 3, 4].map(q => `<option value="${q}" ${q === fallback.quarter ? 'selected' : ''}>Q${q}</option>`).join('')}
                    </select>
                    <label class="block text-sm font-bold text-slate-700 mt-4 mb-1">ปี (ค.ศ.)</label>
                    <input id="swal-cutoff-year" type="number" class="swal2-input w-full m-0" min="2020" max="2100" value="${fallback.year}">
                </div>`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'ส่งออก Excel',
            cancelButtonText: 'ยกเลิก',
            preConfirm: () => {
                const quarter = parseInt((document.getElementById('swal-cutoff-quarter') as HTMLSelectElement).value, 10);
                const year = parseInt((document.getElementById('swal-cutoff-year') as HTMLInputElement).value, 10);
                if (![1, 2, 3, 4].includes(quarter) || !Number.isInteger(year) || year < 2020 || year > 2100) {
                    Swal.showValidationMessage('กรุณาระบุไตรมาสและปี ค.ศ. ให้ถูกต้อง');
                    return false;
                }
                return { quarter: quarter as Quarter, year };
            },
        });
        if (!value) return;

        setIsBusy(true);
        try {
            // อ่านสดจากเซิร์ฟเวอร์ครั้งเดียว เพื่อให้ยอดคงเหลือและรายการมาจากจุดเวลาเดียวกัน
            const fresh = await firebaseService.fetchStockAndTransactions();
            const snapshot = buildCutoffSnapshot(fresh.stock, fresh.transactions, { ...value, cutoffAt: new Date() });
            const fileName = await exportCutoffSnapshotToExcel(snapshot, userName);
            Swal.fire({
                icon: 'success',
                title: 'ส่งออกแล้ว',
                text: `${fileName} — ส่งให้หัวหน้าผู้ตรวจเท่านั้น ห้ามเปิดเผยยอดแก่ผู้นับ`,
            });
        } catch (error: any) {
            Swal.fire({ icon: 'error', title: 'ส่งออกไม่สำเร็จ', text: error?.message || 'กรุณาลองใหม่อีกครั้ง' });
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className={`p-6 rounded-3xl border shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${isFrozen ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
            <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${isFrozen ? 'bg-amber-500' : 'bg-slate-900'}`}>
                    <ClipboardCheck size={22} />
                </div>
                <div>
                    <h3 className="font-black text-slate-900">เครื่องมือตรวจนับสต็อก (Audit)</h3>
                    {isFrozen ? (
                        <p className="text-xs font-bold text-amber-700 mt-1">
                            กำลังตรวจนับ — ปิดรับการบันทึกถึงเวลา {formatTime(freeze!.until)} น. (เปิดโดย {freeze!.by})
                            {freeze!.note ? ` · ${freeze!.note}` : ''}
                        </p>
                    ) : (
                        <p className="text-xs font-bold text-slate-400 mt-1">
                            วันตรวจ: เปิดโหมดตรวจนับ ➔ ส่งออกข้อมูล ณ เวลาตัดยอด ➔ นับและกระทบยอด ➔ ปิดโหมด
                        </p>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {isFrozen ? (
                    <button
                        onClick={handleStopFreeze}
                        disabled={isBusy}
                        className="px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <Unlock size={16} /> ปิดโหมดและเปิดระบบ
                    </button>
                ) : (
                    <button
                        onClick={handleStartFreeze}
                        disabled={isBusy}
                        className="px-4 py-2.5 rounded-xl text-xs font-black bg-amber-500 text-white hover:bg-amber-600 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <Lock size={16} /> เปิดโหมดตรวจนับ
                    </button>
                )}
                <button
                    onClick={handleExportCutoff}
                    disabled={isBusy}
                    className="px-4 py-2.5 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    <FileSpreadsheet size={16} /> ส่งออกข้อมูล ณ เวลาตัดยอด
                </button>
            </div>
        </div>
    );
};
