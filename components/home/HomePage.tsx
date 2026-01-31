import React from 'react';
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
    History
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
    { id: 'home', label: 'Home', icon: LayoutGrid },
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'record', label: 'Movement', icon: ClipboardList },
    { id: 'history', label: 'Inventory Log', icon: History, showBadge: true },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
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

            {/* Top Navigation Bar - Pill Style */}
            <header className="relative z-50 py-4 px-6">
                <div className="max-w-full mx-auto flex items-center justify-between">
                    {/* Left: Logo & Title Section */}
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-2 rounded-lg shadow-lg">
                            <img
                                src="/neosiam-logo.png.jpg"
                                alt="NeoSiam"
                                className="h-10 object-contain"
                            />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                                <span className="text-white font-black text-xl tracking-tight">NEOSIAM</span>
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">LOGISTICS & TRANSPORT</span>
                            </div>
                            <span className="text-cyan-400 text-[10px] font-black tracking-[0.2em] uppercase">INOUT-RECORD SYSTEM</span>
                        </div>
                    </div>

                    {/* Center: Pill Navigation */}
                    <nav className="hidden lg:flex items-center bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl p-1.5 shadow-2xl">
                        {headerNavItems.map((item) => {
                            const isActive = item.id === 'home';
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onNavigate(item.id as any)}
                                    className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${isActive
                                        ? 'bg-cyan-400 text-slate-900 shadow-lg shadow-cyan-400/20'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <item.icon size={18} />
                                    {item.label}
                                    {item.showBadge && transactions.filter(t => t.status === 'PENDING').length > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900 px-1">
                                            {transactions.filter(t => t.status === 'PENDING').length}+
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Right: User Section */}
                    <div className="flex items-center gap-4">
                        {currentUser ? (
                            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl pl-5 pr-2 py-1.5 flex items-center gap-6 shadow-2xl">
                                <div className="text-right">
                                    <p className="text-white font-black text-sm leading-tight uppercase">{currentUser.username}</p>
                                    <p className="text-cyan-400 text-[9px] font-black uppercase tracking-wider">{branchName || currentUser.role}</p>
                                </div>
                                <div className="w-[1px] h-8 bg-white/10" />
                                <button
                                    onClick={onLogout}
                                    className="p-2 text-slate-400 hover:text-white transition-colors"
                                    title="Logout"
                                >
                                    <LogOut size={20} className="rotate-180" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={openLogin}
                                className="px-8 py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-black rounded-2xl transition-all shadow-lg shadow-cyan-400/20 uppercase text-xs tracking-widest"
                            >
                                LOGIN
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Navigation Pill */}
                <div className="lg:hidden mt-4 flex justify-center">
                    <nav className="flex items-center bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-xl p-1 overflow-x-auto max-w-full">
                        {headerNavItems.slice(0, 4).map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id as any)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${item.id === 'home' ? 'bg-cyan-400 text-slate-900' : 'text-slate-400'}`}
                            >
                                <item.icon size={14} />
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            {/* Main Hero Section */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 max-w-7xl mx-auto w-full">
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center"
                    >
                        <h1 className="text-6xl md:text-9xl font-bold text-white tracking-tighter leading-none font-premium">
                            NEOSIAM <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">LOGISTICS</span>
                        </h1>
                        <h1 className="text-5xl md:text-8xl font-bold text-white tracking-[0.2em] leading-none mt-4 font-premium">
                            & TRANSPORT
                        </h1>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-12 flex flex-col items-center"
                    >
                        <p className="text-white text-xl md:text-4xl font-bold tracking-wide mb-6 font-thai">
                            บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด
                        </p>

                        {/* Cyan Separator */}
                        <div className="w-48 h-1 bg-cyan-500 rounded-full mb-8 shadow-[0_0_15px_rgba(6,182,212,0.5)]" />

                        <p className="text-slate-300 text-lg md:text-2xl italic font-medium tracking-wide max-w-4xl font-thai">
                            " ให้บริการด้านการขนส่ง และกระจายสินค้า<br />
                            ทั้งแบบสินค้าพัสดุภัณฑ์ทั่วไป และแบบสินค้าเหมาคัน "
                        </p>
                    </motion.div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mt-8">
                    {/* Card 1: Total Jobs */}
                    <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-10 flex flex-col items-center justify-center transition-all hover:bg-slate-800/80">
                        <div className="w-16 h-16 bg-cyan-950/50 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/20 shadow-inner">
                            <Truck className="text-cyan-400" size={32} />
                        </div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em] mb-2">Total Jobs</p>
                        {currentUser ? (
                            <p className="text-white text-6xl font-black">{totalJobs}</p>
                        ) : (
                            <Lock className="text-slate-700" size={48} />
                        )}
                    </div>

                    {/* Card 2: Active Movement */}
                    <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-10 flex flex-col items-center justify-center transition-all hover:bg-slate-800/80">
                        <div className="w-16 h-16 bg-blue-950/50 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 shadow-inner">
                            <Clock className="text-blue-400" size={32} />
                        </div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em] mb-2">Active Movement</p>
                        {currentUser ? (
                            <p className="text-white text-6xl font-black">{activeMovement}</p>
                        ) : (
                            <Lock className="text-slate-700" size={48} />
                        )}
                    </div>

                    {/* Card 3: Success Rate */}
                    <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-10 flex flex-col items-center justify-center transition-all hover:bg-slate-800/80">
                        <div className="w-16 h-16 bg-green-950/50 rounded-2xl flex items-center justify-center mb-6 border border-green-500/20 shadow-inner">
                            <CheckCircle2 className="text-green-400" size={32} />
                        </div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em] mb-2">Success Rate</p>
                        {currentUser ? (
                            <p className="text-white text-6xl font-black">{successRate}%</p>
                        ) : (
                            <Lock className="text-slate-700" size={48} />
                        )}
                    </div>
                </div>

                {/* Sub Navigation / CTA for logged-in users */}
                {currentUser && (
                    <div className="mt-12 flex flex-wrap justify-center gap-4">
                        {visibleNavItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id as any)}
                                className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white text-sm font-bold border border-white/10 transition-all flex items-center gap-3"
                            >
                                <item.icon size={18} className="text-cyan-400" />
                                {item.label}
                            </button>
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="relative z-10 py-8">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-slate-600 text-[10px] sm:text-xs uppercase font-bold tracking-widest">
                        © 2569 NEOSIAM LOGISTICS \ TRANSPORT. ALL RIGHTS RESERVED.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default HomePage;
