import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, Eye, Clock, ArrowDownLeft, ArrowUpRight, SlidersHorizontal, Loader2, RefreshCw, Search, Download, X, CalendarRange } from 'lucide-react';
import BrandLogo from '../common/BrandLogo';
import { User } from '../../types';
import {
    PartnerHistoryKind, PartnerHistoryRow, PartnerPortalPublicView, PartnerHistoryFilter,
    filterPartnerHistory, summarizePartnerByMonth, formatBangkokDate, formatThaiMonth,
} from '../../utils/partnerPortal';
import { formatDateShort } from '../../utils/helpers';
import { getIdToken } from '../../services/authService';

/**
 * หน้าสำหรับผู้ใช้คู่ค้า (role PARTNER) — ดูอย่างเดียว
 *
 * App.tsx จะแสดงเฉพาะหน้านี้ให้ผู้ใช้คู่ค้า ไม่มีเมนู / ปุ่มบันทึก / สแกน QR ใด ๆ
 * ข้อมูลขอจากเซิร์ฟเวอร์ (api/partner/view) ซึ่งตรวจบัตรผ่าน แล้วส่งเฉพาะเอกสารของคู่ค้ารายนี้
 * ที่ตัดช่องข้อมูลภายในออกแล้ว — หน้าเว็บของคู่ค้าไม่เคยได้ข้อมูลของสาขา / คู่ค้ารายอื่น
 */

interface PartnerPortalProps {
    currentUser: User;
    /** ปุ่มออกจากระบบ (มีกล่องยืนยัน) */
    onLogout: () => void;
    /** หมดเวลา / บัตรผ่านใช้ไม่ได้ → ออกจากระบบทันทีโดยไม่ถาม */
    onSessionExpired: () => void;
}

type LoadState =
    | { status: 'loading' }
    | { status: 'ok'; view: PartnerPortalPublicView; loadedAt: Date }
    | { status: 'error'; message: string };

const PAGE_SIZE = 50;

const KIND_LABEL: Record<PartnerHistoryKind, { text: string; cls: string; Icon: React.ElementType }> = {
    RECEIVE: { text: 'ส่งให้นีโอสยาม', cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: ArrowDownLeft },
    RETURN: { text: 'นีโอสยามคืน', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: ArrowUpRight },
    AUTO: { text: 'คืนอัตโนมัติ (ระบบ)', cls: 'bg-slate-100 text-slate-600 border-slate-200', Icon: ArrowUpRight },
    ADJUST: { text: 'ปรับยอด', cls: 'bg-slate-100 text-slate-600 border-slate-200', Icon: SlidersHorizontal },
};

/** ป้ายรายการ — รายการปรับยอดบอกทิศทางด้วย (effect < 0 = ยอดที่นีโอสยามค้างเพิ่มขึ้น) */
const kindText = (h: PartnerHistoryRow) =>
    h.kind === 'ADJUST' ? `${KIND_LABEL.ADJUST.text} (${h.effect < 0 ? 'ค้างเพิ่ม' : 'ค้างลด'})` : KIND_LABEL[h.kind].text;

const fmt = (n: number) => n.toLocaleString('th-TH');

const PartnerPortal: React.FC<PartnerPortalProps> = ({ currentUser, onLogout, onSessionExpired }) => {
    const [visible, setVisible] = useState(PAGE_SIZE);
    const [state, setState] = useState<LoadState>({ status: 'loading' });
    const [filter, setFilter] = useState<PartnerHistoryFilter>({ q: '', from: '', to: '' });
    const [tab, setTab] = useState<'history' | 'monthly'>('history');
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');
    // เก็บใน ref — ฟังก์ชันจาก App ถูกสร้างใหม่ทุกครั้งที่ App วาดใหม่ ถ้าใส่เป็น dependency จะโหลดซ้ำไม่หยุด
    const expiredRef = useRef(onSessionExpired);
    expiredRef.current = onSessionExpired;

    const load = useCallback(async () => {
        setState({ status: 'loading' });
        try {
            const token = await getIdToken();
            if (!token) { expiredRef.current(); return; }
            const res = await fetch('/api/partner/view', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok && data.view) {
                setState({ status: 'ok', view: data.view as PartnerPortalPublicView, loadedAt: new Date() });
                return;
            }
            if (res.status === 401) { expiredRef.current(); return; } // หมดเวลา / บัตรผ่านใช้ไม่ได้ → ล็อกอินใหม่
            setState({ status: 'error', message: typeof data?.error === 'string' ? data.error : 'โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่' });
        } catch {
            setState({ status: 'error', message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่' });
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const view = state.status === 'ok' ? state.view : null;
    const isDataLoaded = state.status === 'ok';

    // ตัวกรองใช้กับทั้งตาราง สรุปรายเดือน และไฟล์ Excel — ทั้งสามจึงตรงกันเสมอ
    const filtered = useMemo(() => (view ? filterPartnerHistory(view.history, filter) : []), [view, filter]);
    const monthly = useMemo(() => summarizePartnerByMonth(filtered), [filtered]);
    const isFiltered = !!(filter.q?.trim() || filter.from || filter.to);
    const updateFilter = (patch: Partial<PartnerHistoryFilter>) => {
        setFilter(f => ({ ...f, ...patch }));
        setVisible(PAGE_SIZE);
    };

    const handleExport = async () => {
        if (!view) return;
        setExporting(true);
        setExportError('');
        try {
            // โหลดตัวสร้าง Excel เมื่อกดเท่านั้น หน้าแรกจะได้ไม่หนัก
            const { downloadPartnerWorkbook } = await import('../../utils/partnerExport');
            await downloadPartnerWorkbook(view.partner.name, filtered, monthly, filter);
        } catch (e) {
            console.error('[partner] export failed', e);
            setExportError('สร้างไฟล์ไม่สำเร็จ กรุณาลองใหม่');
        } finally {
            setExporting(false);
        }
    };

    const header = (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <BrandLogo className="w-10 h-10 !rounded-xl" />
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-400 leading-tight">Neo Siam Logistics · ระบบพาเลท</p>
                        <h1 className="text-sm sm:text-base font-black text-slate-900 truncate">
                            {view?.partner.name || currentUser.name}
                        </h1>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onLogout}
                    className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 active:scale-95"
                >
                    <LogOut size={16} />
                    <span>ออกจากระบบ</span>
                </button>
            </div>
        </header>
    );

    if (state.status !== 'ok') {
        return (
            <div className="min-h-screen bg-slate-50">
                {header}
                <main className="max-w-5xl mx-auto px-4 py-10 text-center text-slate-600 font-bold space-y-4">
                    {state.status === 'loading' ? (
                        <p className="inline-flex items-center gap-2"><Loader2 size={20} className="animate-spin" /> กำลังโหลดข้อมูล…</p>
                    ) : (
                        <>
                            <p>{state.message}</p>
                            <button type="button" onClick={load} className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50">
                                <RefreshCw size={16} /> ลองใหม่
                            </button>
                        </>
                    )}
                </main>
            </div>
        );
    }
    if (!view) return null;

    const shownHistory = filtered.slice(0, visible);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {header}

            <main className="max-w-5xl mx-auto px-4 py-5 space-y-6">
                <div className="flex items-start gap-2 p-3 rounded-2xl bg-blue-50 border border-blue-100 text-blue-800 text-sm">
                    <Eye size={18} className="shrink-0 mt-0.5" />
                    <p>
                        หน้านี้สำหรับดูข้อมูลอย่างเดียว แสดงเฉพาะรายการพาเลทระหว่าง {view.partner.name} กับนีโอสยาม
                    </p>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>ข้อมูล ณ {state.loadedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                    <button type="button" onClick={load} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">
                        <RefreshCw size={14} /> โหลดใหม่
                    </button>
                </div>

                {!isDataLoaded ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-slate-500 font-bold">
                        <Loader2 size={20} className="animate-spin" /> กำลังโหลดข้อมูล…
                    </div>
                ) : (
                    <>
                        {!view.showTotals && (
                            <p className="p-3 rounded-2xl bg-white border border-slate-200 text-sm text-slate-600">
                                ยอดคงค้างรวมจะแสดงในหน้านี้หลังนีโอสยามและ {view.partner.name} กระทบยอดร่วมกันแล้ว
                                ระหว่างนี้ตรวจสอบได้จากประวัติรับ-คืนรายเอกสารด้านล่าง
                            </p>
                        )}

                        {view.showTotals && (<>
                        {/* ยอดคงค้างแยกประเภทพาเลท */}
                        <section>
                            <h2 className="text-base font-black mb-3">ยอดพาเลทคงค้าง</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {view.balances.map(b => {
                                    const owed = b.balance < 0 ? -b.balance : 0;
                                    const over = b.balance > 0 ? b.balance : 0;
                                    return (
                                        <div key={b.palletId} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                                            <p className="text-sm font-bold text-slate-500">{b.palletName}</p>
                                            <p className="mt-1 text-3xl font-black">
                                                {fmt(owed || over)} <span className="text-base font-bold text-slate-400">ใบ</span>
                                            </p>
                                            <p className={`text-sm font-bold ${owed ? 'text-amber-700' : over ? 'text-blue-700' : 'text-emerald-700'}`}>
                                                {owed ? 'นีโอสยามยืมอยู่ (ยังไม่คืน)' : over ? 'คืนเกินยอดที่ยืม' : 'ไม่มียอดค้าง'}
                                            </p>
                                            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-500">
                                                <span>ส่งให้นีโอสยามรวม <b className="text-slate-800">{fmt(b.received)}</b></span>
                                                <span>คืนแล้วรวม <b className="text-slate-800">{fmt(b.returned)}</b></span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* อายุพาเลทที่ยังไม่คืน */}
                        <section>
                            <h2 className="text-base font-black mb-1">อายุพาเลทที่ยังไม่คืน</h2>
                            <p className="text-xs text-slate-500 mb-3">
                                นับจากวันที่ส่งให้นีโอสยาม · ฟรี {view.graceDays} วัน · ตัดคืนแบบมาก่อนคืนก่อน
                            </p>
                            {view.aging.length === 0 ? (
                                <p className="bg-white rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">ไม่มีพาเลทค้างคืน</p>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
                                    {view.aging.map((a, i) => (
                                        <div key={`${a.docNo}-${i}`} className="p-3 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold truncate">{a.docNo}</p>
                                                <p className="text-xs text-slate-500">
                                                    {a.palletName} · ส่งเมื่อ {formatDateShort(a.borrowDate)}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-black">{fmt(a.qty)} ใบ</p>
                                                <p className={`text-xs font-bold inline-flex items-center gap-1 ${a.overdueDays > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                                    <Clock size={12} />
                                                    {a.ageDays} วัน{a.overdueDays > 0 ? ` (เกิน ${a.overdueDays} วัน)` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                        </>)}

                        {/* ตัวกรอง + ดาวน์โหลด */}
                        <section className="bg-white rounded-2xl border border-slate-200 p-3 space-y-3">
                            <label className="flex items-center gap-2 px-3 rounded-xl border border-slate-200 focus-within:border-blue-400">
                                <Search size={16} className="text-slate-400 shrink-0" />
                                <input
                                    type="search"
                                    inputMode="search"
                                    value={filter.q}
                                    onChange={e => updateFilter({ q: e.target.value })}
                                    placeholder="ค้นเลขที่เอกสาร เช่น EXT-IN-20261113"
                                    className="w-full min-w-0 py-3 text-sm outline-none bg-transparent"
                                    aria-label="ค้นเลขที่เอกสาร"
                                />
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="min-w-0 text-xs font-bold text-slate-500">
                                    ตั้งแต่วันที่
                                    <input
                                        type="date"
                                        value={filter.from}
                                        onChange={e => updateFilter({ from: e.target.value })}
                                        className="mt-1 w-full min-w-0 px-2 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white"
                                    />
                                </label>
                                <label className="min-w-0 text-xs font-bold text-slate-500">
                                    ถึงวันที่
                                    <input
                                        type="date"
                                        value={filter.to}
                                        onChange={e => updateFilter({ to: e.target.value })}
                                        className="mt-1 w-full min-w-0 px-2 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white"
                                    />
                                </label>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleExport}
                                    disabled={exporting || filtered.length === 0}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 disabled:opacity-50"
                                >
                                    {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                    ดาวน์โหลด Excel ({fmt(filtered.length)} รายการ)
                                </button>
                                {isFiltered && (
                                    <button
                                        type="button"
                                        onClick={() => updateFilter({ q: '', from: '', to: '' })}
                                        className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
                                    >
                                        <X size={14} /> ล้างตัวกรอง
                                    </button>
                                )}
                            </div>
                            {exportError && <p className="text-sm font-bold text-red-600">{exportError}</p>}
                        </section>

                        {/* สลับ: รายเอกสาร / สรุปรายเดือน */}
                        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-200/60" role="tablist">
                            {([['history', 'ประวัติรายเอกสาร'], ['monthly', 'สรุปรายเดือน']] as const).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === key}
                                    onClick={() => setTab(key)}
                                    className={`py-2.5 rounded-lg text-sm font-bold ${tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {tab === 'monthly' && (
                            <section>
                                <h2 className="text-base font-black mb-1 inline-flex items-center gap-2">
                                    <CalendarRange size={18} /> สรุปรับ-คืนรายเดือน
                                </h2>
                                <p className="text-xs text-slate-500 mb-3">นับเฉพาะเอกสารรับ-คืนจริง ตามตัวกรองด้านบน · ไม่ใช่ยอดคงค้าง</p>
                                {monthly.length === 0 ? (
                                    <p className="bg-white rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">ไม่มีรายการ</p>
                                ) : (
                                    <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
                                        <table className="w-full min-w-[320px] text-sm">
                                            <thead className="bg-slate-50 text-slate-500 text-xs">
                                                <tr>
                                                    <th className="text-left p-3">เดือน</th>
                                                    <th className="text-left p-3">ประเภทพาเลท</th>
                                                    <th className="text-right p-3">ส่งให้นีโอสยาม</th>
                                                    <th className="text-right p-3">นีโอสยามคืน</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {monthly.map(m => (
                                                    <tr key={`${m.month}-${m.palletId}`}>
                                                        <td className="p-3 whitespace-nowrap font-bold">{formatThaiMonth(m.month)}</td>
                                                        <td className="p-3">{m.palletName}</td>
                                                        <td className="p-3 text-right font-black text-amber-700">{fmt(m.received)}</td>
                                                        <td className="p-3 text-right font-black text-emerald-700">{fmt(m.returned)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* ประวัติรับ-คืน */}
                        {tab === 'history' && (
                        <section>
                            <h2 className="text-base font-black mb-3">
                                ประวัติรับ-คืน <span className="text-sm font-bold text-slate-400">
                                    ({isFiltered ? `${fmt(filtered.length)} จาก ${fmt(view.history.length)}` : fmt(view.history.length)} รายการ)
                                </span>
                            </h2>
                            {filtered.length === 0 ? (
                                <p className="bg-white rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
                                    {isFiltered ? 'ไม่พบรายการตามตัวกรอง' : 'ยังไม่มีรายการ'}
                                </p>
                            ) : (
                                <>
                                    {/* มือถือ: การ์ด */}
                                    <div className="md:hidden bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
                                        {shownHistory.map((h, i) => {
                                            const k = KIND_LABEL[h.kind];
                                            return (
                                                <div key={`${h.id ?? ''}-${h.docNo}-${i}`} className="p-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold ${k.cls}`}>
                                                            <k.Icon size={12} /> {kindText(h)}
                                                        </span>
                                                        <span className="text-sm font-black">{fmt(h.qty)} ใบ</span>
                                                    </div>
                                                    <p className="mt-1 text-sm font-bold break-all">{h.docNo}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {formatBangkokDate(h.date)} · {h.palletName} · {h.branchName}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* จอใหญ่: ตาราง */}
                                    <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 text-slate-500 text-xs">
                                                <tr>
                                                    <th className="text-left p-3">วันที่</th>
                                                    <th className="text-left p-3">เลขที่เอกสาร</th>
                                                    <th className="text-left p-3">รายการ</th>
                                                    <th className="text-left p-3">ประเภทพาเลท</th>
                                                    <th className="text-left p-3">สาขานีโอสยาม</th>
                                                    <th className="text-right p-3">จำนวน</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {shownHistory.map((h, i) => {
                                                    const k = KIND_LABEL[h.kind];
                                                    return (
                                                        <tr key={`${h.id ?? ''}-${h.docNo}-${i}`}>
                                                            <td className="p-3 whitespace-nowrap">{formatBangkokDate(h.date)}</td>
                                                            <td className="p-3 font-bold">{h.docNo}</td>
                                                            <td className="p-3">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold ${k.cls}`}>
                                                                    <k.Icon size={12} /> {kindText(h)}
                                                                </span>
                                                            </td>
                                                            <td className="p-3">{h.palletName}</td>
                                                            <td className="p-3">{h.branchName}</td>
                                                            <td className="p-3 text-right font-black">{fmt(h.qty)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {visible < filtered.length && (
                                        <button
                                            type="button"
                                            onClick={() => setVisible(v => v + PAGE_SIZE)}
                                            className="mt-3 w-full py-3 rounded-xl bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-50"
                                        >
                                            ดูเพิ่มอีก {fmt(Math.min(PAGE_SIZE, filtered.length - visible))} รายการ
                                        </button>
                                    )}
                                </>
                            )}
                        </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default PartnerPortal;
