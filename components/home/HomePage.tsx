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

    // Format date
    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Format time
    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
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

    return (
        <div className="min-h-screen bg-black flex flex-col relative overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* Background Image with High Contrast Overlay */}
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070')]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />

            {/* Top Navigation Bar */}
            <header className="relative z-50">
                <div className="bg-slate-900/70 backdrop-blur-2xl border-b border-white/10 shadow-2xl">
                    <div className="max-w-full mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
                        {/* Left: Logo & Title Section */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="flex items-center gap-4 shrink-0"
                        >
                            <div className="bg-white p-1.5 rounded-lg shadow-xl shadow-cyan-500/10">
                                <img
                                    src="/logo.png"
                                    alt="NeoSiam"
                                    className="h-8 object-contain"
                                />
                            </div>
                            <div className="hidden sm:flex flex-col">
                                <span className="text-white font-black text-lg tracking-tight font-orbitron">
                                    Neo<span className="text-cyan-400">Siam</span>
                                </span>
                                <span className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mt-0.5">
                                    Operational Systems
                                </span>
                            </div>
                        </motion.div>

                        {/* Center: Navigation Tabs */}
                        <nav className="flex items-center gap-1 bg-slate-900/50 rounded-2xl p-1 border border-white/5">
                            {headerNavItems.map((item) => {
                                const isActive = item.id === 'home';
                                return (
                                    <motion.button
                                        key={item.id}
                                        whileHover={{ y: -1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => onNavigate(item.id as any)}
                                        className={`relative flex items-center gap-2 px-6 py-2.5 text-xs font-black tracking-widest transition-all duration-300 rounded-xl cursor-pointer ${isActive
                                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-900 shadow-xl shadow-cyan-500/20'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <item.icon size={14} />
                                        <span className="hidden md:inline uppercase">{item.label}</span>
                                    </motion.button>
                                );
                            })}
                        </nav>

                        {/* Right: Date, Time, User Section */}
                        <div className="flex items-center gap-4">
                            {/* Time Display */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-2xl px-4 py-2 hidden sm:flex items-center gap-3"
                            >
                                <Clock size={16} className="text-cyan-400" />
                                <span className="text-cyan-400 font-black text-sm tracking-widest font-mono">
                                    {formatTime(currentTime)}
                                </span>
                            </motion.div>

                            {/* User Section */}
                            {currentUser ? (
                                <div className="flex items-center gap-4 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-2xl px-3 py-1.5 hover:bg-white/10 transition-colors">
                                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center border border-white/10 shadow-lg">
                                        <UserIcon size={16} className="text-slate-900" />
                                    </div>
                                    <div className="hidden lg:flex flex-col">
                                        <span className="text-white font-black text-[10px] uppercase leading-none">
                                            {currentUser.username}
                                        </span>
                                        <span className="text-cyan-400 text-[8px] font-black uppercase tracking-tighter mt-1 opacity-80">
                                            {currentUser.role}
                                        </span>
                                    </div>
                                    <div className="w-px h-6 bg-white/10 hidden lg:block" />
                                    <motion.button
                                        whileHover={{ scale: 1.1, color: '#f87171' }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={onLogout}
                                        className="p-2 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                                        title="คิกออฟ"
                                    >
                                        <LogOut size={16} />
                                    </motion.button>
                                </div>
                            ) : (
                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(6,182,212,0.4)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={openLogin}
                                    className="px-8 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-black rounded-2xl transition-all shadow-xl shadow-cyan-400/20 uppercase text-xs tracking-[0.2em] cursor-pointer"
                                >
                                    Login
                                </motion.button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Hero Section */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 md:px-6 max-w-7xl mx-auto w-full py-8">
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: -40 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center"
                    >
                        <h1 className="text-4xl xs:text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black text-white tracking-tighter leading-none font-premium filter drop-shadow-2xl">
                            NEOSIAM <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent">LOGISTICS</span>
                        </h1>
                        <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-white tracking-[0.2em] leading-none mt-4 font-premium opacity-90">
                            & TRANSPORT
                        </h1>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="mt-12 flex flex-col items-center"
                    >
                        <p className="text-white text-base xs:text-lg sm:text-2xl md:text-3xl font-black tracking-[0.1em] mb-6 font-thai">
                            บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด
                        </p>
                        <div className="w-48 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent rounded-full mb-8 shadow-[0_0_20px_rgba(6,182,212,0.8)]" />
                        <p className="text-slate-300 text-sm sm:text-lg md:text-2xl font-bold tracking-wide max-w-4xl font-thai leading-relaxed italic">
                            " ให้บริการด้านการขนส่ง และกระจายสินค้า ครบวงจร<br className="hidden sm:block" />
                            <span className="text-cyan-400 not-italic font-black mt-2 inline-block">ก้าวไปข้างหน้ากับระบบจัดการข้อมูลที่แม่นยำ</span> "
                        </p>
                    </motion.div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-6xl mt-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        whileHover={{ y: -10, backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
                        className="bg-slate-900/80 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 flex flex-col items-center justify-center transition-all shadow-2xl group cursor-help"
                    >
                        <div className="w-16 h-16 bg-cyan-950/30 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/20 shadow-inner group-hover:scale-110 transition-transform">
                            <Truck className="text-cyan-400" size={24} />
                        </div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Total Activity</p>
                        {currentUser ? (
                            <p className="text-white text-6xl font-black tracking-tighter">{totalJobs.toLocaleString()}</p>
                        ) : (
                            <Lock className="text-slate-800" size={40} />
                        )}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        whileHover={{ y: -10, backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
                        className="bg-slate-900/80 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 flex flex-col items-center justify-center transition-all shadow-2xl group cursor-help"
                    >
                        <div className="w-16 h-16 bg-blue-950/30 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 shadow-inner group-hover:scale-110 transition-transform">
                            <Clock className="text-blue-400" size={24} />
                        </div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Ongoing Flow</p>
                        {currentUser ? (
                            <p className="text-white text-6xl font-black tracking-tighter">{activeMovement.toLocaleString()}</p>
                        ) : (
                            <Lock className="text-slate-800" size={40} />
                        )}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        whileHover={{ y: -10, backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
                        className="bg-slate-900/80 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 flex flex-col items-center justify-center transition-all shadow-2xl group cursor-help"
                    >
                        <div className="w-16 h-16 bg-green-950/30 rounded-2xl flex items-center justify-center mb-6 border border-green-500/20 shadow-inner group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="text-green-400" size={24} />
                        </div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Success Rate</p>
                        {currentUser ? (
                            <p className="text-white text-6xl font-black tracking-tighter">{successRate}%</p>
                        ) : (
                            <Lock className="text-slate-800" size={40} />
                        )}
                    </motion.div>
                </div>

                {/* Sub Navigation */}
                {currentUser && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 }}
                        className="mt-16 w-full max-w-5xl"
                    >
                        <div className="flex flex-wrap justify-center gap-4">
                            {visibleNavItems.map((item) => (
                                <motion.button
                                    key={item.id}
                                    whileHover={{ y: -5, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onNavigate(item.id as any)}
                                    className="px-8 py-4 bg-white/5 backdrop-blur-xl hover:bg-white/10 rounded-2xl text-white text-xs font-black uppercase tracking-widest border border-white/10 transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg active:shadow-inner"
                                >
                                    <item.icon size={18} className="text-cyan-400" />
                                    <span>{item.label}</span>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Footer */}
            <footer className="relative z-10 py-10">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />
                    <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.5em] hover:text-slate-500 transition-colors cursor-default">
                        © 2569 NEOSIAM LOGISTICS & TRANSPORT. ENTERPRISE GRADE SYSTEM.
                    </p>
                </div>
            </footer>
        </div>
    );
};


export default HomePage;
