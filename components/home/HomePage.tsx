import React from 'react';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    PackagePlus,
    ClipboardList,
    Wrench,
    BarChart3,
    Settings,
    Package,
    TrendingUp,
    Shield,
    RefreshCw,
    LogOut,
    User as UserIcon,
    ChevronRight
} from 'lucide-react';
import { User, BranchId, Stock, Transaction, PalletId } from '../../types';
import { PALLET_TYPES, BRANCHES } from '../../constants';

interface HomePageProps {
    currentUser: User;
    selectedBranch: BranchId | 'ALL';
    stock: Stock;
    transactions: Transaction[];
    onNavigate: (tab: 'dashboard' | 'record' | 'maintenance' | 'settings' | 'analytics' | 'history') => void;
    onLogout: () => void;
}

// Navigation items
const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'record', label: 'Movement', icon: PackagePlus },
    { id: 'history', label: 'Inventory Log', icon: ClipboardList, showBadge: true },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, maintenanceOnly: true },
    { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
];

// Feature cards data
const features = [
    {
        icon: RefreshCw,
        title: 'Real-Time Tracking',
        description: 'ติดตามพาเลทแบบเรียลไทม์ทุกสาขา',
        color: 'from-cyan-400 to-blue-500',
    },
    {
        icon: TrendingUp,
        title: 'Smart Analytics',
        description: 'วิเคราะห์ข้อมูลอัจฉริยะ คาดการณ์แม่นยำ',
        color: 'from-purple-400 to-pink-500',
    },
    {
        icon: Shield,
        title: 'Secure & Reliable',
        description: 'ปลอดภัย มั่นใจ ระบบเสถียร 24/7',
        color: 'from-green-400 to-emerald-500',
    },
];

const HomePage: React.FC<HomePageProps> = ({
    currentUser,
    selectedBranch,
    stock,
    transactions,
    onNavigate,
    onLogout,
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

    const stockTotals = calculateTotalStock();
    const grandTotal = Object.values(stockTotals).reduce((a, b) => a + b, 0);
    const pendingCount = transactions.filter(t => t.status === 'PENDING').length;

    // Permission checks
    const canAccessMaintenance =
        currentUser.role === 'ADMIN' ||
        currentUser.branchId === 'hub_nw';

    const visibleNavItems = navItems.filter(item => {
        if (item.adminOnly && currentUser.role !== 'ADMIN') return false;
        if (item.maintenanceOnly && !canAccessMaintenance) return false;
        return true;
    });

    const branchName = currentUser.branchId
        ? BRANCHES.find(b => b.id === currentUser.branchId)?.name || currentUser.branchId
        : '';

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col relative overflow-hidden">
            {/* Background Image with Overlay */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
                style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070')`,
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900" />

            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Top Navigation Bar */}
            <header className="relative z-50 border-b border-white/10 backdrop-blur-xl bg-slate-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center">
                            <img
                                src="/neosiam-logo.png.jpg"
                                alt="NeoSiam Logistics & Transport"
                                className="h-10 sm:h-12 object-contain rounded-lg"
                            />
                        </div>

                        {/* Navigation Links - Desktop */}
                        <nav className="hidden md:flex items-center gap-1">
                            {visibleNavItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onNavigate(item.id as any)}
                                    className="relative px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 flex items-center gap-2"
                                >
                                    <item.icon size={16} />
                                    {item.label}
                                    {item.showBadge && pendingCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                                            {pendingCount}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </nav>

                        {/* User Info & Logout */}
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex flex-col items-end">
                                <span className="text-sm font-semibold text-white">
                                    {currentUser.name || currentUser.username}
                                </span>
                                <span className="text-xs text-cyan-400">
                                    {currentUser.role} {branchName && `• ${branchName}`}
                                </span>
                            </div>
                            <button
                                onClick={onLogout}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                title="ออกจากระบบ"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <div className="md:hidden border-t border-white/10 px-4 py-2 overflow-x-auto">
                    <div className="flex gap-2 min-w-max">
                        {visibleNavItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id as any)}
                                className="relative px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all flex items-center gap-1.5"
                            >
                                <item.icon size={14} />
                                {item.label}
                                {item.showBadge && pendingCount > 0 && (
                                    <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                        {pendingCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center max-w-4xl mx-auto"
                >
                    {/* Main Heading */}
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 leading-tight">
                        <span className="bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">
                            NEOSIAM LOGISTICS
                        </span>
                        <br />
                        <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            & TRANSPORT
                        </span>
                    </h1>

                    {/* Company Name Thai */}
                    <p className="text-cyan-300 text-base sm:text-lg md:text-xl font-semibold mb-3">
                        บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด
                    </p>

                    {/* Subtitle */}
                    <p className="text-slate-400 text-sm sm:text-base md:text-lg mb-8 max-w-3xl mx-auto leading-relaxed">
                        ให้บริการด้านการขนส่ง และกระจายสินค้า<br className="hidden sm:block" />
                        ทั้งแบบสินค้าพัสดุภัณฑ์ทั่วไป และแบบสินค้าเหมาคัน
                    </p>

                    {/* Stats Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-10"
                    >
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-5 py-3">
                            <p className="text-cyan-400 text-2xl sm:text-3xl font-black">{grandTotal.toLocaleString()}</p>
                            <p className="text-slate-500 text-xs">Total Pallets</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-5 py-3">
                            <p className="text-green-400 text-2xl sm:text-3xl font-black">{BRANCHES.length}</p>
                            <p className="text-slate-500 text-xs">Active Branches</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-5 py-3">
                            <p className="text-amber-400 text-2xl sm:text-3xl font-black">{pendingCount}</p>
                            <p className="text-slate-500 text-xs">Pending Actions</p>
                        </div>
                    </motion.div>

                    {/* CTA Button */}
                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onNavigate('dashboard')}
                        className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition-all duration-300 flex items-center gap-2 mx-auto"
                    >
                        Go to Dashboard
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                </motion.div>

                {/* Feature Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-12 w-full max-w-4xl"
                >
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 + index * 0.1 }}
                            className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300"
                        >
                            <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                                <feature.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
                            <p className="text-slate-400 text-sm">{feature.description}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/10 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-slate-500 text-sm">
                            © 2569 NEOSIAM LOGISTICS & TRANSPORT. All rights reserved.
                        </p>
                        <div className="flex items-center gap-6 text-sm text-slate-500">
                            <span className="hover:text-cyan-400 cursor-pointer transition-colors">Support</span>
                            <span className="hover:text-cyan-400 cursor-pointer transition-colors">Privacy</span>
                            <span className="hover:text-cyan-400 cursor-pointer transition-colors">Terms</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default HomePage;
