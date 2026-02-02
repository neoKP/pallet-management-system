import React from 'react';
import { LogOut } from 'lucide-react';
import { BranchId, User } from '../../types';
import { BRANCHES } from '../../constants';
// @ts-ignore
import Swal from 'sweetalert2';

interface HeaderProps {
    activeTab: string;
    currentUser: User;
    selectedBranch: BranchId | 'ALL';
    setSelectedBranch: (branch: BranchId | 'ALL') => void;
    canViewAll: boolean;
    handleLogout: () => void;
    setIsScannerOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({
    activeTab,
    currentUser,
    selectedBranch,
    setSelectedBranch,
    canViewAll,
    handleLogout,
    setIsScannerOpen
}) => {
    return (
        <header className="bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40 border-b border-white/10 px-6 py-4 flex justify-between items-center h-20 transition-all duration-300">
            {/* Left Side (Branding on Mobile) */}
            <div className="flex items-center gap-3 md:hidden">
                <div className="bg-white p-1 rounded-lg shadow-lg">
                    <img src="/logo.png" alt="Logo" className="h-6 object-contain" />
                </div>
                <div className="flex flex-col">
                    <span className="text-white font-bold text-xs leading-none font-premium tracking-wider">NEOSIAM</span>
                    <span className="text-cyan-400 text-[8px] font-black leading-none uppercase mt-1">INOUT SYSTEM</span>
                </div>
                <button
                    onClick={() => setIsScannerOpen(true)}
                    className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg ml-2 hover:bg-cyan-500/30 transition-colors cursor-pointer"
                    aria-label="Open Scanner"
                    title="สแกน QR"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" /><path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" /></svg>
                </button>
            </div>

            {/* Left Side (Desktop Page Title) */}
            <div className="hidden md:flex flex-col">
                <div className="text-white font-black text-xl tracking-tight uppercase font-premium animate-in fade-in slide-in-from-top-2 duration-500 text-glow">
                    {activeTab === 'dashboard' && 'Inventory Overview'}
                    {activeTab === 'record' && 'Movement Records'}
                    {activeTab === 'maintenance' && 'Maintenance & Repairs'}
                    {activeTab === 'settings' && 'System Settings'}
                    {activeTab === 'analytics' && 'Performance Analytics'}
                    {activeTab === 'history' && 'Transaction History'}
                </div>
                <div className="text-cyan-400/80 text-[10px] font-black tracking-[0.2em] uppercase mt-0.5">
                    Neosiam Logistics & Transport
                </div>
            </div>

            {/* Right Side: Branch Select & User Profile */}
            <div className="flex items-center gap-4 md:gap-6">

                {/* Hub Selection */}
                <div className="flex items-center">
                    {canViewAll ? (
                        <div className="relative group">
                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value as BranchId | 'ALL')}
                                className="appearance-none bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-6 pr-12 text-center text-sm font-bold text-white shadow-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 cursor-pointer hover:bg-white/10 transition-all min-w-[240px] font-thai"
                                aria-label="เลือกสาขา"
                            >
                                <option value="ALL" className="bg-slate-900 text-white">ทุกสาขา (All Branches)</option>
                                {BRANCHES.map(b => (
                                    <option key={b.id} value={b.id} className="bg-slate-900 text-white">{b.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-cyan-400 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-end px-4 py-1.5 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-white font-bold text-base leading-tight font-thai">
                                {BRANCHES.find(b => b.id === selectedBranch)?.name || selectedBranch}
                            </div>
                            <div className="text-cyan-400 text-[9px] font-black uppercase tracking-widest mt-0.5 opacity-80">Current Hub</div>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-white/10 hidden md:block"></div>

                {/* User Profile */}
                <div className="hidden md:flex items-center bg-white/5 rounded-2xl pl-5 pr-2 py-2 border border-white/5 gap-4 hover:bg-white/10 transition-colors">
                    <div className="text-right">
                        <div className="text-xs font-black text-white leading-none uppercase selection:bg-transparent">{currentUser.username}</div>
                        <div className="text-[9px] text-cyan-400 font-black uppercase tracking-tighter mt-1 opacity-80">
                            {currentUser.role}
                        </div>
                    </div>
                    <div className="w-px h-6 bg-white/10"></div>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-slate-500 hover:text-red-400 transition-all cursor-pointer hover:scale-110 active:scale-95"
                        title="ออกจากระบบ"
                        aria-label="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>

                {/* Scan QR Button */}
                <button
                    onClick={() => {
                        Swal.fire({
                            title: 'วิธีรับพาเลทแบบรวดเร็ว (Quick Receive)',
                            html: `
                    <div class="text-left space-y-4 pt-4">
                      <div class="flex items-start gap-4">
                        <div class="bg-cyan-500 text-white w-8 h-8 flex items-center justify-center rounded-xl font-black shrink-0 shadow-lg shadow-cyan-500/20">1</div>
                        <p class="text-sm pt-1">ใช้มือถือสแกน <b>QR Code</b> ที่มุมบนของใบส่งคืนพาเลท</p>
                      </div>
                      <div class="flex items-start gap-4">
                        <div class="bg-cyan-500 text-white w-8 h-8 flex items-center justify-center rounded-xl font-black shrink-0 shadow-lg shadow-cyan-500/20">2</div>
                        <p class="text-sm pt-1">กดลิงก์ที่ปรากฏบนหน้าจอเพื่อเปิดแอป</p>
                      </div>
                      <div class="flex items-start gap-4">
                        <div class="bg-cyan-500 text-white w-8 h-8 flex items-center justify-center rounded-xl font-black shrink-0 shadow-lg shadow-cyan-500/20">3</div>
                        <p class="text-sm pt-1">ระบบจะแสดงปุ่ม <b>"ยืนยันการรับ"</b> ให้ทันทีโดยไม่ต้องค้นหาเลขที่เอกสาร</p>
                      </div>
                    </div>
                  `,
                            icon: 'info',
                            confirmButtonText: 'เข้าใจแล้ว',
                            confirmButtonColor: '#06b6d4',
                            customClass: {
                                popup: 'rounded-[2rem] p-8',
                                title: 'font-black text-2xl',
                            }
                        });
                    }}
                    className="hidden md:flex items-center gap-3 px-5 py-2.5 bg-cyan-500/10 text-cyan-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-cyan-500/20 transition-all border border-cyan-500/20 cursor-pointer shadow-lg shadow-cyan-900/10"
                >
                    <div className="w-5 h-5 flex items-center justify-center bg-cyan-500 text-slate-900 rounded-lg shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" /><path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" /></svg>
                    </div>
                    Scan QR
                </button>

            </div>
        </header>
    );
};


export default Header;
