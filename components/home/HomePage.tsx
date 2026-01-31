import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    PackagePlus,
    ClipboardList,
    Wrench,
    BarChart3,
    Settings,
    Shield,
    RefreshCw,
    LogOut,
    Truck,
    Clock,
    CheckCircle2,
    Lock,
    LayoutGrid,
    Activity,
    History,
    User as UserIcon,
    Calendar
} from 'lucide-react';
import { User, BranchId, Stock, Transaction, PalletId } from '../../types';
import { PALLET_TYPES, BRANCHES } from '../../constants';

interface HomePageProps {
    currentUser: User | null;
    selectedBranch: BranchId | 'ALL';
    stock: Stock;
    transactions: Transaction[];
    onNavigate: (tab: 'dashboard' | 'record' | 'maintenance' | 'settings' | 'analytics' | 'history' | 'home') => void;
    onLogout: () => void;
    openLogin: () => void;
}

const headerNavItems = [
    { id: 'home', label: 'HOME HUB', icon: LayoutGrid },
    { id: 'dashboard', label: 'DASHBOARD', icon: Activity },
];

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'record', label: 'Movement', icon: PackagePlus },
    { id: 'history', label: 'Inventory Log', icon: ClipboardList, showBadge: true },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, maintenanceOnly: true },
    { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
];

const HomePage: React.FC<HomePageProps> = ({
    currentUser,
    selectedBranch,
    stock,
    transactions,
    onNavigate,
    onLogout,
    openLogin,
}) => {
    // Real-time clock state
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Format date as "Saturday, January 31, 2026"
    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Format time as "11:14:41 AM"
    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    // Calculate stats
    const calculateTotalStock = (): Record<PalletId, number> => {
        const totals: Record<string, number> = {};
        PALLET_TYPES.forEach(p => totals[p.id] = 0);

        if (selectedBranch === 'ALL') {
            BRANCHES.forEach(branch => {
                if (stock[branch.id]) {
                    PALLET_TYPES.forEach(p => {
                        totals[p.id] += stock[branch.id][p.id] || 0;
                    });
                }
            });
        } else if (stock[selectedBranch]) {
            PALLET_TYPES.forEach(p => {
                totals[p.id] = stock[selectedBranch][p.id] || 0;
            });
        }
        return totals as Record<PalletId, number>;
    };

    const totalJobs = transactions.length;
    const activeMovement = transactions.filter(t => t.status === 'PENDING').length;
    const completedJobs = transactions.filter(t => t.status === 'COMPLETED').length;
    const successRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 100;

    const canAccessMaintenance = currentUser && (
        currentUser.role === 'ADMIN' ||
        currentUser.branchId === 'hub_nw'
    );

    const visibleNavItems = navItems.filter(item => {
        if (!currentUser) return !item.adminOnly && !item.maintenanceOnly;
        if (item.adminOnly && currentUser.role !== 'ADMIN') return false;
        if (item.maintenanceOnly && !canAccessMaintenance) return false;
        return true;
    });

    const branchName = currentUser?.branchId
        ? BRANCHES.find(b => b.id === currentUser.branchId)?.name || currentUser.branchId
        : '';

    return (
        <div className="min-h-screen bg-black flex flex-col relative overflow-hidden font-sans">
            {/* Background Image with High Contrast Overlay */}
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070')]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />

            {/* Top Navigation Bar - Glass Morphism Style - Mobile Adaptive */}
            <header className="relative z-50">
                {/* Main Header Bar with Glass Effect */}
                <div className="bg-slate-900/70 backdrop-blur-2xl border-b border-white/10 shadow-2xl">
                    <div className="max-w-full mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
                        {/* Left: Logo & Title Section - Adaptive */}
                        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
                            <div className="bg-white p-1 sm:p-1.5 rounded-lg shadow-lg shadow-white/10">
                                <img
                                    src="/logo.png"
                                    alt="NeoSiam"
                                    className="h-6 sm:h-7 md:h-8 object-contain"
                                />
                            </div>
                            <div className="hidden sm:flex flex-col">
                                <span className="text-cyan-400 font-black text-sm sm:text-base md:text-lg tracking-tight" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                                    NeoSiam Logistics
                                </span>
                                <span className="text-slate-500 text-[7px] sm:text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em]">
                                    PALLET-MANAGEMENT-SYSTEM
                                </span>
                            </div>
                        </div>

                        {/* Center: Navigation Tabs - NOW VISIBLE ON ALL SCREENS */}
                        <nav className="flex items-center gap-0.5 sm:gap-1 bg-slate-800/50 rounded-lg sm:rounded-xl p-0.5 sm:p-1 border border-white/5">
                            {headerNavItems.map((item) => {
                                const isActive = item.id === 'home';
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onNavigate(item.id as any)}
                                        className={`relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 md:px-4 xl:px-6 py-1.5 sm:py-2 text-[9px] sm:text-[10px] md:text-xs xl:text-sm font-bold tracking-wider transition-all duration-300 rounded-md sm:rounded-lg whitespace-nowrap ${isActive
                                            ? 'bg-cyan-400 text-slate-900 shadow-lg shadow-cyan-400/30'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <item.icon size={12} className="sm:hidden" />
                                        <item.icon size={14} className="hidden sm:block" />
                                        <span className="hidden sm:inline">{item.label}</span>
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Right: Date, Time, User Section - Adaptive */}
                        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                            {/* Date Display - Hidden on smaller screens */}
                            <div className="hidden xl:flex items-center gap-2 text-slate-300">
                                <Calendar size={14} className="text-slate-500" />
                                <span className="text-sm font-medium tracking-wide">
                                    {formatDate(currentTime)}
                                </span>
                            </div>

                            {/* Time Display with Cyan Background - Compact on Mobile */}
                            <div className="bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-lg px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 shadow-lg shadow-cyan-500/30">
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <Clock size={12} className="text-slate-900 sm:hidden" />
                                    <Clock size={14} className="text-slate-900 hidden sm:block" />
                                    <span className="text-slate-900 font-black text-[10px] sm:text-xs md:text-sm tracking-wide font-mono">
                                        {formatTime(currentTime)}
                                    </span>
                                </div>
                            </div>

                            {/* User Section - Adaptive */}
                            {currentUser ? (
                                <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 bg-slate-800/50 backdrop-blur-xl border border-white/5 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5">
                                    {/* User Icon */}
                                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-slate-700 rounded-full flex items-center justify-center border border-slate-600">
                                        <UserIcon size={12} className="text-slate-300 sm:hidden" />
                                        <UserIcon size={14} className="text-slate-300 hidden sm:block md:hidden" />
                                        <UserIcon size={16} className="text-slate-300 hidden md:block" />
                                    </div>
                                    {/* Username - Hidden on small mobile */}
                                    <span className="text-white font-bold text-xs sm:text-sm uppercase hidden lg:block">
                                        {currentUser.username}
                                    </span>
                                    {/* Divider - Hidden on mobile */}
                                    <div className="w-px h-4 sm:h-5 md:h-6 bg-white/10 hidden md:block" />
                                    {/* Sign Out Button - Compact on Mobile */}
                                    <button
                                        onClick={onLogout}
                                        className="px-2 sm:px-3 py-1 sm:py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-[9px] sm:text-[10px] md:text-xs font-bold rounded-md sm:rounded-lg transition-all border border-cyan-500/30 uppercase tracking-wider"
                                        title="ออกจากระบบ"
                                    >
                                        <span className="hidden md:inline">SIGN OUT</span>
                                        <LogOut size={12} className="md:hidden" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={openLogin}
                                    className="px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-black rounded-lg sm:rounded-xl transition-all shadow-lg shadow-cyan-400/20 uppercase text-[9px] sm:text-[10px] md:text-xs tracking-widest"
                                >
                                    LOGIN
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Hero Section - Adaptive Layout */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-3 sm:px-4 md:px-6 max-w-7xl mx-auto w-full py-4 sm:py-6 md:py-8">
                <div className="text-center mb-6 sm:mb-8 md:mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center"
                    >
                        {/* Main Title - Fully Adaptive Font Sizes */}
                        <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-white tracking-tighter leading-none font-premium">
                            NEOSIAM <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">LOGISTICS</span>
                        </h1>
                        <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-bold text-white tracking-[0.1em] sm:tracking-[0.15em] md:tracking-[0.2em] leading-none mt-2 sm:mt-3 md:mt-4 font-premium">
                            & TRANSPORT
                        </h1>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-6 sm:mt-8 md:mt-12 flex flex-col items-center px-2"
                    >
                        {/* Thai Company Name - Adaptive */}
                        <p className="text-white text-sm xs:text-base sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-wide mb-3 sm:mb-4 md:mb-6 font-thai">
                            บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด
                        </p>

                        {/* Cyan Separator - Adaptive Width */}
                        <div className="w-24 sm:w-32 md:w-40 lg:w-48 h-0.5 sm:h-1 bg-cyan-500 rounded-full mb-4 sm:mb-6 md:mb-8 shadow-[0_0_15px_rgba(6,182,212,0.5)]" />

                        {/* Description - Adaptive */}
                        <p className="text-slate-300 text-xs sm:text-sm md:text-lg lg:text-xl xl:text-2xl italic font-medium tracking-wide max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-3xl xl:max-w-4xl font-thai leading-relaxed">
                            " ให้บริการด้านการขนส่ง และกระจายสินค้า<br className="hidden sm:block" />
                            <span className="sm:hidden"> </span>ทั้งแบบสินค้าพัสดุภัณฑ์ทั่วไป และแบบสินค้าเหมาคัน "
                        </p>
                    </motion.div>
                </div>

                {/* Stats Grid - Adaptive Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 w-full max-w-sm sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mt-4 sm:mt-6 md:mt-8">
                    {/* Card 1: Total Jobs */}
                    <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/5 rounded-xl sm:rounded-2xl md:rounded-[2rem] p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col items-center justify-center transition-all hover:bg-slate-800/80 active:scale-[0.98]">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-cyan-950/50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 md:mb-6 border border-cyan-500/20 shadow-inner">
                            <Truck className="text-cyan-400" size={20} />
                        </div>
                        <p className="text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-1 sm:mb-2">Total Jobs</p>
                        {currentUser ? (
                            <p className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black">{totalJobs}</p>
                        ) : (
                            <Lock className="text-slate-700" size={32} />
                        )}
                    </div>

                    {/* Card 2: Active Movement */}
                    <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/5 rounded-xl sm:rounded-2xl md:rounded-[2rem] p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col items-center justify-center transition-all hover:bg-slate-800/80 active:scale-[0.98]">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-blue-950/50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 md:mb-6 border border-blue-500/20 shadow-inner">
                            <Clock className="text-blue-400" size={20} />
                        </div>
                        <p className="text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-1 sm:mb-2">Active Movement</p>
                        {currentUser ? (
                            <p className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black">{activeMovement}</p>
                        ) : (
                            <Lock className="text-slate-700" size={32} />
                        )}
                    </div>

                    {/* Card 3: Success Rate */}
                    <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/5 rounded-xl sm:rounded-2xl md:rounded-[2rem] p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col items-center justify-center transition-all hover:bg-slate-800/80 active:scale-[0.98]">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-green-950/50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 md:mb-6 border border-green-500/20 shadow-inner">
                            <CheckCircle2 className="text-green-400" size={20} />
                        </div>
                        <p className="text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-1 sm:mb-2">Success Rate</p>
                        {currentUser ? (
                            <p className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black">{successRate}%</p>
                        ) : (
                            <Lock className="text-slate-700" size={32} />
                        )}
                    </div>
                </div>

                {/* Sub Navigation / CTA for logged-in users - Adaptive Grid */}
                {currentUser && (
                    <div className="mt-6 sm:mt-8 md:mt-12 w-full max-w-sm sm:max-w-2xl md:max-w-4xl lg:max-w-5xl">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap md:justify-center gap-2 sm:gap-3 md:gap-4">
                            {visibleNavItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onNavigate(item.id as any)}
                                    className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white/5 hover:bg-white/10 active:bg-white/15 rounded-lg sm:rounded-xl text-white text-[10px] sm:text-xs md:text-sm font-bold border border-white/10 transition-all flex items-center justify-center gap-1.5 sm:gap-2 md:gap-3"
                                >
                                    <item.icon size={14} className="text-cyan-400 sm:hidden" />
                                    <item.icon size={16} className="text-cyan-400 hidden sm:block md:hidden" />
                                    <item.icon size={18} className="text-cyan-400 hidden md:block" />
                                    <span className="truncate">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Footer - Adaptive */}
            <footer className="relative z-10 py-4 sm:py-6 md:py-8">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 text-center">
                    <p className="text-slate-600 text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs uppercase font-bold tracking-wider sm:tracking-widest">
                        © 2569 NEOSIAM LOGISTICS \ TRANSPORT. ALL RIGHTS RESERVED.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default HomePage;
