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
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 shadow-sm px-6 py-3 flex justify-between items-center h-16">
            {/* Left Side (Title or Breadcrumb - Optional) */}
            <div className="flex items-center gap-2 md:hidden">
                <div className="font-black text-xl text-slate-800">Neo<span className="text-blue-600">Siam</span></div>
                <button
                    onClick={() => setIsScannerOpen(true)}
                    className="p-1.5 bg-blue-50 text-blue-600 rounded-lg ml-2"
                    aria-label="Open Scanner"
                    title="สแกน QR"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" /><path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" /></svg>
                </button>
            </div>
            <div className="hidden md:block text-slate-400 font-medium text-sm">
                {activeTab === 'dashboard' && 'Inventory Overview'}
                {activeTab === 'record' && 'Movement Records'}
                {activeTab === 'maintenance' && 'Maintenance & Repairs'}
                {activeTab === 'settings' && 'System Settings'}
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
                                className="appearance-none bg-white border border-slate-200 rounded-full py-2 pl-6 pr-10 text-center text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer hover:bg-slate-50 transition-all min-w-[200px]"
                                aria-label="Select Branch Scope"
                            >
                                <option value="ALL">All Branches (ทุกสาขา)</option>
                                {BRANCHES.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-blue-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </div>
                    ) : (
                        <div className="text-lg font-bold text-slate-700">
                            {BRANCHES.find(b => b.id === selectedBranch)?.name || selectedBranch}
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

                {/* User Profile */}
                <div className="flex items-center gap-3">
                    <div className="hidden md:block text-right">
                        <div className="text-sm font-bold text-slate-900 leading-tight">{currentUser.name}</div>
                        <div className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                            {currentUser.role}
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100 shadow-sm"
                        title="ออกจากระบบ"
                    >
                        <LogOut size={18} />
                    </button>
                </div>

                {/* Scan QR Button (Quick Receive Prompt) */}
                <button
                    onClick={() => {
                        Swal.fire({
                            title: 'วิธีรับพาเลทแบบรวดเร็ว (Quick Receive)',
                            html: `
                    <div class="text-left space-y-4">
                      <div class="flex items-start gap-3">
                        <div class="bg-blue-100 text-blue-600 p-2 rounded-lg font-bold">1</div>
                        <p class="text-sm">ใช้มือถือสแกน <b>QR Code</b> ที่มุมบนของใบส่งคืนพาเลท</p>
                      </div>
                      <div class="flex items-start gap-3">
                        <div class="bg-blue-100 text-blue-600 p-2 rounded-lg font-bold">2</div>
                        <p class="text-sm">กดลิงก์ที่ปรากฏบนหน้าจอเพื่อเปิดแอป</p>
                      </div>
                      <div class="flex items-start gap-3">
                        <div class="bg-blue-100 text-blue-600 p-2 rounded-lg font-bold">3</div>
                        <p class="text-sm">ระบบจะแสดงปุ่ม <b>"ยืนยันการรับ"</b> ให้ทันทีโดยไม่ต้องค้นหาเลขที่เอกสาร</p>
                      </div>
                    </div>
                  `,
                            icon: 'info',
                            confirmButtonText: 'เข้าใจแล้ว',
                            confirmButtonColor: '#2563eb'
                        });
                    }}
                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full font-bold text-sm hover:bg-blue-100 transition-all border border-blue-100"
                >
                    <div className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white rounded-md">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" /><path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" /></svg>
                    </div>
                    Scan QR
                </button>

            </div>
        </header>
    );
};

export default Header;
