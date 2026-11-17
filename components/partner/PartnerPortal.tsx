import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    LogOut, Eye, Clock, ArrowDownLeft, ArrowUpRight, SlidersHorizontal, Loader2, RefreshCw,
    Search, Download, X, CalendarRange, CheckCircle2, FileText, ShieldCheck, Info,
} from 'lucide-react';
import { User } from '../../types';
import { PALLET_TYPES } from '../../constants';
import {
    PartnerHistoryKind, PartnerHistoryRow, PartnerPortalPublicView, PartnerHistoryFilter, QuickRangeKey,
    filterPartnerHistory, summarizePartnerByMonth, formatBangkokDate, formatThaiMonth, quickRange, formatThaiShortDate,
} from '../../utils/partnerPortal';
import { getIdToken } from '../../services/authService';

/**
 * หน้าสำหรับผู้ใช้คู่ค้า (role PARTNER) — ดูอย่างเดียว
 *
 * App.tsx จะแสดงเฉพาะหน้านี้ให้ผู้ใช้คู่ค้า ไม่มีเมนู / ปุ่มบันทึก / สแกน QR ใด ๆ
 * ข้อมูลขอจากเซิร์ฟเวอร์ (api/partner/view) ซึ่งตรวจบัตรผ่าน แล้วส่งเฉพาะเอกสารของคู่ค้ารายนี้
 * ที่ตัดช่องข้อมูลภายในออกแล้ว — หน้าเว็บของคู่ค้าไม่เคยได้ข้อมูลของสาขา / คู่ค้ารายอื่น
 *
 * หน้าตา: โทนเดียวกับระบบหลัก (น้ำเงินเข้ม → คราม · การ์ดมุมมน · Kanit) ตาม design-system/MASTER.md
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

const KIND_LABEL: Record<PartnerHistoryKind, { text: string; cls: string; bar: string; Icon: React.ElementType }> = {
    RECEIVE: { text: 'ส่งให้นีโอสยาม', cls: 'bg-amber-50 text-amber-700 ring-amber-200', bar: 'bg-amber-500', Icon: ArrowDownLeft },
    RETURN: { text: 'นีโอสยามคืน', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-600', Icon: ArrowUpRight },
    AUTO: { text: 'คืนอัตโนมัติ (ระบบ)', cls: 'bg-slate-100 text-slate-600 ring-slate-200', bar: 'bg-slate-400', Icon: ArrowUpRight },
    ADJUST: { text: 'ปรับยอด', cls: 'bg-violet-50 text-violet-700 ring-violet-200', bar: 'bg-violet-500', Icon: SlidersHorizontal },
};

/** ป้ายรายการ — รายการปรับยอดบอกทิศทางด้วย (effect < 0 = ยอดที่นีโอสยามค้างเพิ่มขึ้น) */
const kindText = (h: PartnerHistoryRow) =>
    h.kind === 'ADJUST' ? `${KIND_LABEL.ADJUST.text} (${h.effect < 0 ? 'ค้างเพิ่ม' : 'ค้างลด'})` : KIND_LABEL[h.kind].text;

/** สีประจำประเภทพาเลท (ตามทะเบียนพาเลทของระบบ) */
const palletDot = (palletId: string) => PALLET_TYPES.find(p => p.id === palletId)?.color || 'bg-slate-400';

/** สีแท่งกราฟรายเดือน — ตรวจด้วย dataviz validator แล้ว (ผ่าน · CVD 7.9 จึงมีตัวเลขกำกับทุกแท่ง) */
const BAR_RECEIVE = '#d97706';
const BAR_RETURN = '#059669';

const QUICK_RANGES: { key: QuickRangeKey; label: string }[] = [
    { key: 'thisMonth', label: 'เดือนนี้' },
    { key: 'lastMonth', label: 'เดือนก่อน' },
    { key: 'last30', label: '30 วันล่าสุด' },
];

const fmt = (n: number) => n.toLocaleString('th-TH');

const Badge: React.FC<{ h: PartnerHistoryRow }> = ({ h }) => {
    const k = KIND_LABEL[h.kind];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 text-xs font-semibold whitespace-nowrap ${k.cls}`}>
            <k.Icon size={12} /> {kindText(h)}
        </span>
    );
};

/**
 * ช่องเลือกวันที่ที่แสดงเป็นวันที่ไทยทุกเครื่อง (เช่น "1 พ.ย. 2569")
 * ช่องวันที่ของเบราว์เซอร์แสดงตามภาษาเครื่อง (บางเครื่องเป็น mm/dd/yyyy) จึงวางช่องจริงแบบโปร่งใสทับไว้
 * แตะตรงไหนก็เปิดปฏิทินของเครื่อง · ค่าที่เก็บยังเป็น YYYY-MM-DD เหมือนเดิม
 */
const ThaiDateField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => {
    const ref = useRef<HTMLInputElement>(null);
    const text = formatThaiShortDate(value);
    return (
        <div className="min-w-0">
            <span className="block text-xs font-medium text-slate-500">{label}</span>
            <div className="relative mt-1 rounded-xl bg-slate-50 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-blue-500">
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm pointer-events-none">
                    <span className={text ? 'text-slate-800 font-medium' : 'text-slate-400'}>{text || 'เลือกวันที่'}</span>
                    <CalendarRange size={16} className="shrink-0 text-slate-400" />
                </div>
                <input
                    ref={ref}
                    type="date"
                    value={value}
                    aria-label={label}
                    onChange={e => onChange(e.target.value)}
                    onClick={() => { try { ref.current?.showPicker?.(); } catch { /* เบราว์เซอร์เก่า: ใช้การแตะปกติ */ } }}
                    onKeyDown={e => {
                        // คีย์บอร์ด: Enter / Space เปิดปฏิทิน (ช่องจริงโปร่งใส กรอบจะมีเส้นฟ้าเมื่อโฟกัส)
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            try { ref.current?.showPicker?.(); } catch { /* ไม่รองรับ */ }
                        }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
            </div>
            {value && (
                <button type="button" onClick={() => onChange('')} className="mt-1 text-xs font-medium text-slate-500 hover:text-slate-800 underline underline-offset-2">
                    ล้างวันที่
                </button>
            )}
        </div>
    );
};

const PartnerPortal: React.FC<PartnerPortalProps> = ({ currentUser, onLogout, onSessionExpired }) => {
    const [visible, setVisible] = useState(PAGE_SIZE);
    const [state, setState] = useState<LoadState>({ status: 'loading' });
    const [filter, setFilter] = useState<PartnerHistoryFilter>({ q: '', from: '', to: '' });
    const [tab, setTab] = useState<'history' | 'monthly'>('history');
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');
    const [refreshError, setRefreshError] = useState('');
    const [quickKey, setQuickKey] = useState<QuickRangeKey | 'all' | null>('all');
    // เก็บใน ref — ฟังก์ชันจาก App ถูกสร้างใหม่ทุกครั้งที่ App วาดใหม่ ถ้าใส่เป็น dependency จะโหลดซ้ำไม่หยุด
    const expiredRef = useRef(onSessionExpired);
    expiredRef.current = onSessionExpired;

    const load = useCallback(async () => {
        // มีข้อมูลอยู่แล้ว (กดโหลดใหม่) → ล้มเหลวก็เก็บข้อมูลเดิมไว้ แจ้งแค่ข้อความเตือน
        const fail = (message: string) => setState(s => {
            if (s.status === 'ok') { setRefreshError(message); return s; }
            return { status: 'error', message };
        });
        setState(s => (s.status === 'ok' ? s : { status: 'loading' }));
        try {
            const token = await getIdToken();
            if (!token) { expiredRef.current(); return; }
            const res = await fetch('/api/partner/view', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok && data.view) {
                setRefreshError('');
                setState({ status: 'ok', view: data.view as PartnerPortalPublicView, loadedAt: new Date() });
                return;
            }
            if (res.status === 401) { expiredRef.current(); return; } // หมดเวลา / บัตรผ่านใช้ไม่ได้ → ล็อกอินใหม่
            fail(typeof data?.error === 'string' ? data.error : 'โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่');
        } catch {
            fail('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่');
        }
    }, []);

    const [refreshing, setRefreshing] = useState(false);
    const refresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    useEffect(() => { load(); }, [load]);

    const view = state.status === 'ok' ? state.view : null;

    // ช่วงเวลาด่วน (เช่น 30 วันล่าสุด) คำนวณใหม่ทุกครั้งที่โหลดข้อมูล — เปิดหน้าค้างข้ามเที่ยงคืนแล้วกดโหลดใหม่ ช่วงจะเลื่อนตาม
    const loadedAtMs = state.status === 'ok' ? state.loadedAt.getTime() : 0;
    useEffect(() => {
        if (!loadedAtMs || !quickKey || quickKey === 'all') return;
        const r = quickRange(quickKey);
        setFilter(f => (f.from === r.from && f.to === r.to ? f : { ...f, ...r }));
    }, [loadedAtMs, quickKey]);

    // ตัวกรองใช้กับทั้งตาราง สรุปรายเดือน และไฟล์ Excel — ทั้งสามจึงตรงกันเสมอ
    const filtered = useMemo(() => (view ? filterPartnerHistory(view.history, filter) : []), [view, filter]);
    const monthly = useMemo(() => summarizePartnerByMonth(filtered), [filtered]);
    const monthGroups = useMemo(() => {
        const map = new Map<string, typeof monthly>();
        for (const m of monthly) map.set(m.month, [...(map.get(m.month) || []), m]);
        return [...map.entries()];
    }, [monthly]);
    const barMax = useMemo(() => Math.max(1, ...monthly.flatMap(m => [m.received, m.returned])), [monthly]);
    const isFiltered = !!(filter.q?.trim() || filter.from || filter.to);

    const updateFilter = (patch: Partial<PartnerHistoryFilter>, quick?: QuickRangeKey | 'all') => {
        // แก้วันที่เอง = ไม่ใช่ช่วงด่วนแล้ว · ล้างวันที่ = ทุกช่วงเวลา
        if ('from' in patch || 'to' in patch) {
            const next = { ...filter, ...patch };
            setQuickKey(quick ?? (!next.from && !next.to ? 'all' : null));
        }
        setFilter(f => ({ ...f, ...patch }));
        setVisible(PAGE_SIZE);
        setExportError('');
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

    const partnerName = view?.partner.name || currentUser.name;

    const hero = (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white">
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-20 w-72 h-72 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />
            <div className="relative max-w-5xl mx-auto px-4 pt-4 pb-20 sm:pb-24">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 bg-white rounded-xl p-1.5 shadow-lg shadow-black/20">
                            <img src="/logo.png" alt="Neo Siam Logistics" className="h-7 w-auto object-contain" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-medium text-blue-200/80 leading-tight">Neo Siam Logistics</p>
                            <p className="text-xs font-semibold text-white/90 leading-tight">ระบบพาเลท · สำหรับคู่ค้า</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onLogout}
                        className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 ring-1 ring-white/20 text-sm font-semibold hover:bg-white/20 active:scale-95 transition"
                    >
                        <LogOut size={16} />
                        <span>ออกจากระบบ</span>
                    </button>
                </div>

                <div className="mt-6 sm:mt-8">
                    <p className="text-sm text-blue-200">ภาพรวมพาเลทกับนีโอสยาม</p>
                    <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">{partnerName}</h1>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15">
                            <Eye size={13} /> ดูข้อมูลอย่างเดียว
                        </span>
                        {state.status === 'ok' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15">
                                <Clock size={13} /> ข้อมูล ณ {state.loadedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                            </span>
                        )}
                        {state.status === 'ok' && (
                            <button
                                type="button"
                                onClick={refresh}
                                disabled={refreshing}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white text-blue-900 font-semibold hover:bg-blue-50 disabled:opacity-70"
                            >
                                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> โหลดใหม่
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    if (state.status !== 'ok' || !view) {
        return (
            <div className="min-h-screen bg-slate-100">
                {hero}
                <main className="relative max-w-5xl mx-auto px-4 -mt-12">
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 p-8 text-center text-slate-600 font-semibold space-y-4">
                        {state.status === 'loading' ? (
                            <p className="inline-flex items-center gap-2"><Loader2 size={20} className="animate-spin text-blue-600" /> กำลังโหลดข้อมูล…</p>
                        ) : (
                            <>
                                <p>{state.status === 'error' ? state.message : 'ไม่พบข้อมูล'}</p>
                                <button type="button" onClick={load} className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500">
                                    <RefreshCw size={16} /> ลองใหม่
                                </button>
                            </>
                        )}
                    </div>
                </main>
            </div>
        );
    }

    const shownHistory = filtered.slice(0, visible);

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
            {hero}

            <main className="relative max-w-5xl mx-auto px-4 -mt-14 sm:-mt-16 pb-10 space-y-5">
                {refreshError && (
                    <div role="alert" className="flex items-start justify-between gap-3 rounded-2xl bg-red-50 ring-1 ring-red-200 px-4 py-3 text-sm text-red-700 shadow">
                        <span>โหลดข้อมูลล่าสุดไม่สำเร็จ ({refreshError}) · ยังแสดงข้อมูลชุดเดิม</span>
                        <button type="button" onClick={() => setRefreshError('')} aria-label="ปิดข้อความ" className="shrink-0 p-1 rounded-lg hover:bg-red-100"><X size={16} /></button>
                    </div>
                )}
                {/* ยอดคงค้าง */}
                {view.showTotals ? (
                    <section aria-label="ยอดพาเลทคงค้าง" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {view.balances.map(b => {
                            const owed = b.owed > 0 ? b.owed : 0;
                            const over = b.owed < 0 ? -b.owed : 0;
                            const status = owed
                                ? { text: 'นีโอสยามต้องคืน', cls: 'bg-amber-50 text-amber-700 ring-amber-200' }
                                : over
                                    ? { text: 'นีโอสยามคืนเกินยอดที่ยืม', cls: 'bg-blue-50 text-blue-700 ring-blue-200' }
                                    : { text: 'ไม่มียอดค้าง', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
                            const hasDetail = !view.balanceOnly && typeof b.received === 'number' && typeof b.returned === 'number';
                            const received = b.received ?? 0;
                            const returned = b.returned ?? 0;
                            const ratio = received > 0 ? Math.min(1, returned / received) : 0;
                            return (
                                <div key={b.palletId} className="relative overflow-hidden bg-white rounded-3xl shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 p-5">
                                    <div className={`absolute inset-x-0 top-0 h-1.5 ${palletDot(b.palletId)}`} />
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="inline-flex items-center gap-2 text-base font-semibold text-slate-700">
                                            <span className={`w-3 h-3 rounded-full ${palletDot(b.palletId)}`} /> {b.palletName}
                                        </p>
                                        <span className="text-xs font-medium text-slate-500">{owed ? 'ยอดที่ต้องคืน' : 'ยอดคงค้าง'}</span>
                                    </div>
                                    <p className="mt-3 text-5xl font-bold tracking-tight tabular-nums">
                                        {fmt(owed || over)} <span className="text-lg font-semibold text-slate-400">ใบ</span>
                                    </p>
                                    <span className={`mt-2 inline-flex px-3 py-1 rounded-full ring-1 text-sm font-semibold ${status.cls}`}>{status.text}</span>
                                    {hasDetail && (
                                        <>
                                            <div className="mt-4 grid grid-cols-2 gap-3">
                                                <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
                                                    <p className="text-sm text-slate-500">ส่งให้นีโอสยามรวม</p>
                                                    <p className="text-lg font-bold tabular-nums">{fmt(received)} <span className="text-sm font-medium text-slate-400">ใบ</span></p>
                                                </div>
                                                <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
                                                    <p className="text-sm text-slate-500">นีโอสยามคืนแล้วรวม</p>
                                                    <p className="text-lg font-bold tabular-nums">{fmt(returned)} <span className="text-sm font-medium text-slate-400">ใบ</span></p>
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden" aria-hidden>
                                                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${ratio * 100}%` }} />
                                                </div>
                                                <p className="mt-1.5 text-sm text-slate-500">
                                                    {returned > received
                                                        ? `คืนมากกว่าที่ส่งให้ ${fmt(returned - received)} ใบ — เพราะยอดคงค้างรวมยอดยกมาและการปรับยอดด้วย`
                                                        : received <= 0
                                                            ? 'ยังไม่มีรายการส่งให้นีโอสยาม'
                                                            : `คืนแล้ว ${Math.round((returned / received) * 100)}% ของที่ส่งให้`}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                    {view.balanceOnly && (
                                        <p className="mt-3 text-sm text-slate-500">ยอดตามบัญชีของนีโอสยาม ณ เวลาที่แสดง</p>
                                    )}
                                </div>
                            );
                        })}
                    </section>
                ) : (
                    <section className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 p-5 flex gap-3 text-sm text-slate-600">
                        <Info size={20} className="shrink-0 text-blue-600" />
                        <p>
                            ยอดคงค้างรวมจะแสดงในหน้านี้หลังนีโอสยามและ {view.partner.name} กระทบยอดร่วมกันแล้ว
                            ระหว่างนี้ตรวจสอบได้จากประวัติรับ-คืนรายเอกสารด้านล่าง
                        </p>
                    </section>
                )}

                {/* อายุพาเลทที่ยังไม่คืน (ไม่แสดงในโหมดยอดอย่างเดียว) */}
                {view.showTotals && !view.balanceOnly && (
                    <section className="bg-white rounded-3xl ring-1 ring-slate-200 p-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h2 className="text-base font-bold">อายุพาเลทที่ยังไม่คืน</h2>
                            <p className="text-xs text-slate-500">นับจากวันที่ส่งให้ · ฟรี {view.graceDays} วัน · ตัดคืนแบบมาก่อนคืนก่อน</p>
                        </div>
                        {view.aging.length === 0 ? (
                            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-emerald-50 ring-1 ring-emerald-100 p-4 text-sm text-emerald-800">
                                <CheckCircle2 size={22} className="shrink-0 text-emerald-600" />
                                <span className="font-semibold">ไม่มีพาเลทค้างคืน</span>
                            </div>
                        ) : (
                            <div className="mt-3 divide-y divide-slate-100">
                                {view.aging.map((a, i) => (
                                    <div key={`${a.docNo}-${i}`} className="py-3 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold truncate">{a.docNo}</p>
                                            <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                                                <span className={`w-2 h-2 rounded-full ${palletDot(a.palletId)}`} />
                                                {a.palletName} · ส่งเมื่อ {formatBangkokDate(`${a.borrowDate}T12:00:00+07:00`)}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold tabular-nums">{fmt(a.qty)} ใบ</p>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${a.overdueDays > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                                <Clock size={11} />
                                                {a.ageDays} วัน{a.overdueDays > 0 ? ` · เกิน ${a.overdueDays} วัน` : ''}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* ตัวกรอง + ดาวน์โหลด */}
                <section className="bg-white rounded-3xl ring-1 ring-slate-200 p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-base font-bold">ค้นหาและดาวน์โหลด</h2>
                        {isFiltered && (
                            <button
                                type="button"
                                onClick={() => updateFilter({ q: '', from: '', to: '' })}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
                            >
                                <X size={13} /> ล้างตัวกรอง
                            </button>
                        )}
                    </div>
                    <label className="flex items-center gap-2 px-3 rounded-2xl bg-slate-50 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-blue-500">
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
                    <div className="flex flex-wrap gap-2" aria-label="ช่วงเวลาด่วน">
                        {QUICK_RANGES.map(r => (
                            <button
                                key={r.key}
                                type="button"
                                onClick={() => updateFilter(quickRange(r.key), r.key)}
                                aria-pressed={quickKey === r.key}
                                className={`px-3.5 py-2 rounded-full text-xs font-semibold ring-1 transition ${quickKey === r.key ? 'bg-blue-600 text-white ring-blue-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}
                            >
                                {r.label}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => updateFilter({ from: '', to: '' }, 'all')}
                            aria-pressed={quickKey === 'all'}
                            className={`px-3.5 py-2 rounded-full text-xs font-semibold ring-1 transition ${quickKey === 'all' ? 'bg-blue-600 text-white ring-blue-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}
                        >
                            ทุกช่วงเวลา
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <ThaiDateField label="ตั้งแต่วันที่" value={filter.from || ''} onChange={v => updateFilter({ from: v })} />
                        <ThaiDateField label="ถึงวันที่" value={filter.to || ''} onChange={v => updateFilter({ to: v })} />
                    </div>
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={exporting || filtered.length === 0}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-semibold shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50 disabled:shadow-none transition"
                    >
                        {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        ดาวน์โหลด Excel · {fmt(filtered.length)} รายการ
                    </button>
                    {exportError && <p className="text-sm font-semibold text-red-600">{exportError}</p>}
                </section>

                {/* สลับ: รายเอกสาร / สรุปรายเดือน */}
                <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-white ring-1 ring-slate-200" role="group" aria-label="เลือกมุมมอง">
                    {([
                        ['history', 'ประวัติรายเอกสาร', FileText, filtered.length],
                        ['monthly', 'สรุปรายเดือน', CalendarRange, monthGroups.length],
                    ] as const).map(([key, label, Icon, n]) => (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={tab === key}
                            onClick={() => setTab(key)}
                            className={`inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${tab === key ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            <Icon size={16} /> {label}
                            <span className={`text-[11px] px-1.5 rounded-full ${tab === key ? 'bg-white/20' : 'bg-slate-100'}`}>{fmt(n)}</span>
                        </button>
                    ))}
                </div>

                {tab === 'monthly' && (
                    <section className="bg-white rounded-3xl ring-1 ring-slate-200 p-4 sm:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-base font-bold">สรุปรับ-คืนรายเดือน</h2>
                            <div className="flex items-center gap-3 text-xs text-slate-600" aria-label="คำอธิบายสี">
                                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: BAR_RECEIVE }} /> ส่งให้นีโอสยาม</span>
                                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: BAR_RETURN }} /> นีโอสยามคืน</span>
                            </div>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">นับเฉพาะเอกสารรับ-คืนจริง ตามตัวกรองด้านบน · ไม่ใช่ยอดคงค้าง</p>
                        {monthGroups.length === 0 ? (
                            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">ไม่มีรายการ</p>
                        ) : (
                            <div className="mt-4 space-y-4">
                                {monthGroups.map(([month, rows]) => (
                                    <div key={month} className="rounded-2xl bg-slate-50 p-3 sm:p-4">
                                        <p className="text-sm font-bold">{formatThaiMonth(month)}</p>
                                        <div className="mt-2 space-y-3">
                                            {rows.map(m => (
                                                <div key={m.palletId}>
                                                    <p className="text-xs font-semibold text-slate-600 inline-flex items-center gap-1.5">
                                                        <span className={`w-2 h-2 rounded-full ${palletDot(m.palletId)}`} /> {m.palletName}
                                                        <span className="text-slate-400 font-normal">· {fmt(m.docs)} เอกสาร</span>
                                                    </p>
                                                    {([['ส่งให้นีโอสยาม', m.received, BAR_RECEIVE], ['นีโอสยามคืน', m.returned, BAR_RETURN]] as const).map(([label, val, color]) => (
                                                        <div key={label} className="mt-1 flex items-center gap-2" title={`${formatThaiMonth(month)} · ${m.palletName} · ${label} ${fmt(val)} ใบ`}>
                                                            <div className="flex-1 h-2.5 rounded-r bg-white">
                                                                <div className="h-full rounded-r" style={{ width: `${(val / barMax) * 100}%`, minWidth: val > 0 ? 3 : 0, background: color }} />
                                                            </div>
                                                            <span className="w-28 shrink-0 text-right text-xs tabular-nums text-slate-700">
                                                                <span className="sr-only">{label} </span>{fmt(val)} ใบ
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {tab === 'history' && (
                    <section className="bg-white rounded-3xl ring-1 ring-slate-200 overflow-hidden">
                        <div className="px-4 sm:px-5 py-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100">
                            <h2 className="text-base font-bold">ประวัติรับ-คืน</h2>
                            <p className="text-xs text-slate-500">
                                {isFiltered ? `${fmt(filtered.length)} จาก ${fmt(view.history.length)}` : fmt(view.history.length)} รายการ · ใหม่สุดอยู่บน
                            </p>
                        </div>
                        {filtered.length === 0 ? (
                            <p className="p-6 text-sm text-center text-slate-500">
                                {isFiltered ? 'ไม่พบรายการตามตัวกรอง' : 'ยังไม่มีรายการ'}
                            </p>
                        ) : (
                            <>
                                {/* มือถือ: การ์ด */}
                                <div className="md:hidden divide-y divide-slate-100">
                                    {shownHistory.map((h, i) => (
                                        <div key={`${h.id ?? ''}-${h.docNo}-${i}`} className="relative pl-5 pr-4 py-3">
                                            <span aria-hidden className={`absolute left-0 top-2 bottom-2 w-1 rounded-r ${KIND_LABEL[h.kind].bar}`} />
                                            <div className="flex items-center justify-between gap-2">
                                                <Badge h={h} />
                                                <span className="text-base font-bold tabular-nums">{fmt(h.qty)} <span className="text-xs font-medium text-slate-400">ใบ</span></span>
                                            </div>
                                            <p className="mt-1.5 text-sm font-semibold break-all">{h.docNo}</p>
                                            <p className="mt-0.5 text-xs text-slate-500 inline-flex flex-wrap items-center gap-x-1.5">
                                                <span>{formatBangkokDate(h.date)}</span>·
                                                <span className="inline-flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${palletDot(h.palletId)}`} />{h.palletName}</span>·
                                                <span>{h.branchName}</span>
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {/* จอใหญ่: ตาราง */}
                                <div className="hidden md:block">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 text-slate-500 text-xs">
                                            <tr>
                                                <th className="text-left font-semibold px-5 py-3">วันที่</th>
                                                <th className="text-left font-semibold px-3 py-3">เลขที่เอกสาร</th>
                                                <th className="text-left font-semibold px-3 py-3">รายการ</th>
                                                <th className="text-left font-semibold px-3 py-3">ประเภทพาเลท</th>
                                                <th className="text-left font-semibold px-3 py-3">สาขานีโอสยาม</th>
                                                <th className="text-right font-semibold px-5 py-3">จำนวน</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {shownHistory.map((h, i) => (
                                                <tr key={`${h.id ?? ''}-${h.docNo}-${i}`} className="hover:bg-blue-50/40 transition-colors">
                                                    <td className="px-5 py-3 whitespace-nowrap text-slate-600 tabular-nums">{formatBangkokDate(h.date)}</td>
                                                    <td className="px-3 py-3 font-semibold">{h.docNo}</td>
                                                    <td className="px-3 py-3"><Badge h={h} /></td>
                                                    <td className="px-3 py-3">
                                                        <span className="inline-flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${palletDot(h.palletId)}`} />{h.palletName}</span>
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-600">{h.branchName}</td>
                                                    <td className="px-5 py-3 text-right font-bold tabular-nums">{fmt(h.qty)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {visible < filtered.length && (
                                    <div className="p-4 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => setVisible(v => v + PAGE_SIZE)}
                                            className="w-full py-3 rounded-2xl bg-slate-50 ring-1 ring-slate-200 font-semibold text-slate-700 hover:bg-slate-100"
                                        >
                                            ดูเพิ่มอีก {fmt(Math.min(PAGE_SIZE, filtered.length - visible))} รายการ
                                            <span className="text-slate-400 font-normal"> · แสดง {fmt(Math.min(visible, filtered.length))} / {fmt(filtered.length)}</span>
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                )}

                <footer className="pt-2 text-center text-xs text-slate-400">
                    <ShieldCheck size={13} className="inline -mt-0.5 mr-1" />
                    ข้อมูลเฉพาะ {view.partner.name} · บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด
                </footer>
            </main>
        </div>
    );
};

export default PartnerPortal;
