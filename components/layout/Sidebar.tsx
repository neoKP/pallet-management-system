import React from 'react';
import { LayoutDashboard, ArrowRightLeft, Wrench, Menu, Settings, ChevronLeft, ChevronRight, BarChart3, List, Home, Trash2 } from 'lucide-react';
import { BranchId, User } from '../../types';

interface SidebarProps {
    activeTab: 'home' | 'dashboard' | 'record' | 'maintenance' | 'settings' | 'analytics' | 'history' | 'scrapsales';
    setActiveTab: (tab: 'home' | 'dashboard' | 'record' | 'maintenance' | 'settings' | 'analytics' | 'history' | 'scrapsales') => void;
    currentUser: User | null;
    selectedBranch: BranchId | 'ALL';
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    activeTab,
    setActiveTab,
    currentUser,
    selectedBranch,
    isCollapsed,
    setIsCollapsed
}) => {
    return (
        <aside
            className={`fixed left-0 top-0 h-screen bg-white border-r border-slate-200 shadow-xl z-50 hidden md:flex flex-col transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isCollapsed ? 'w-20' : 'w-64'}`}
            aria-label="Main Sidebar"
        >
            {/* Logo Section */}
            <div className={`p-6 border-b border-slate-100 flex items-center gap-3 relative overflow-hidden h-[85px] shrink-0`}>
                <img
                    src="/logo.png"
                    alt="NeoSiam Logo"
                    className={`rounded-xl shadow-lg shrink-0 transition-all duration-300 ${isCollapsed ? 'h-10 mx-auto' : 'h-12'}`}
                />
                {!isCollapsed && (
                    <h1 className="font-black text-2xl tracking-tight text-slate-800 whitespace-nowrap animate-in fade-in zoom-in-95 duration-500">
                        Neo<span className="text-blue-600">Siam</span>
                    </h1>
                )}
            </div>

            {/* Collapse Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-20 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 shadow-lg z-50 transition-all hover:scale-110 cursor-pointer active:scale-95"
                aria-label={isCollapsed ? "ขยายแถบข้าง" : "พับแถบข้าง"}
                title={isCollapsed ? "ขยาย" : "พับ"}
            >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            {/* Navigation Menu */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
                {/* Home Menu */}
                <button
                    onClick={() => setActiveTab('home')}
                    title={isCollapsed ? 'หน้าแรก' : ''}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold group text-slate-500 hover:bg-blue-50 hover:text-blue-600 cursor-pointer ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                    <Home size={20} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                    {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-300">กลับหน้าหลัก</span>}
                </button>

                <div className="border-t border-slate-100 my-2 opacity-50" />

                <button
                    onClick={() => setActiveTab('dashboard')}
                    title={isCollapsed ? 'Dashboard' : ''}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold group cursor-pointer ${activeTab === 'dashboard'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
                        } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                    <LayoutDashboard size={20} className={activeTab === 'dashboard' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600 transition-colors'} />
                    {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-300">Dashboard</span>}
                </button>

                {/* Analytics Menu */}
                <button
                    onClick={() => setActiveTab('analytics')}
                    title={isCollapsed ? 'Analytics' : ''}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold group cursor-pointer ${activeTab === 'analytics'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-purple-200'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-purple-600'
                        } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                    <BarChart3 size={20} className={activeTab === 'analytics' ? 'text-white' : 'text-slate-400 group-hover:text-purple-600 transition-colors'} />
                    {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-300">Analytics</span>}
                </button>

                <button
                    onClick={() => setActiveTab('history')}
                    title={isCollapsed ? 'Inventory Log' : ''}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold group cursor-pointer ${activeTab === 'history'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
                        } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                    <List size={20} className={activeTab === 'history' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600 transition-colors'} />
                    {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-300">Inventory Log</span>}
                </button>

                {selectedBranch !== 'ALL' && (
                    <button
                        onClick={() => setActiveTab('record')}
                        title={isCollapsed ? 'Movement' : ''}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold group cursor-pointer ${activeTab === 'record'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
                            } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                        <ArrowRightLeft size={20} className={activeTab === 'record' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600 transition-colors'} />
                        {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-300">Movement</span>}
                    </button>
                )}

                {/* Maintenance Menu */}
                {(currentUser?.role === 'ADMIN' || currentUser?.branchId === 'hub_nw' || currentUser?.branchId === 'maintenance_stock') && (
                    <button
                        onClick={() => setActiveTab('maintenance')}
                        title={isCollapsed ? 'Maintenance' : ''}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold group cursor-pointer ${activeTab === 'maintenance'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
                            } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                        <Wrench size={20} className={activeTab === 'maintenance' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600 transition-colors'} />
                        {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-300">Maintenance</span>}
                    </button>
                )}

                {/* Scrap Sales Menu */}
                {(currentUser?.role === 'ADMIN' || currentUser?.branchId === 'maintenance_stock') && (
                    <button
                        onClick={() => setActiveTab('scrapsales')}
                        title={isCollapsed ? 'ขายซาก' : ''}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold group cursor-pointer ${activeTab === 'scrapsales'
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'
                            } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                        <Trash2 size={20} className={activeTab === 'scrapsales' ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600 transition-colors'} />
                        {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-300">ขายซาก (Scrap)</span>}
                    </button>
                )}

                {/* Settings Menu */}
                {currentUser?.role === 'ADMIN' && (
                    <button
                        onClick={() => setActiveTab('settings')}
                        title={isCollapsed ? 'System Settings' : ''}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold group cursor-pointer ${activeTab === 'settings'
                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                        <Settings size={20} className={activeTab === 'settings' ? 'text-white' : 'text-slate-400 group-hover:text-slate-900 transition-colors'} />
                        {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-300 text-xs">System Settings</span>}
                    </button>
                )}
            </nav>

            {/* Footer / Version Info */}
            <div className={`p-6 border-t border-slate-100 transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
                <div className={`text-slate-400 font-medium text-center transition-all duration-300 selection:bg-transparent ${isCollapsed ? 'text-[8px]' : 'text-[10px]'}`}>
                    {isCollapsed ? 'Neo' : 'Pallet Management System v1.0'}
                    {!isCollapsed && <div className="mt-1 opacity-50">Dev by Paweewat Phosanga</div>}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
