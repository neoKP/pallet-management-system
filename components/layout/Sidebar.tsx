import React from 'react';
import { LayoutDashboard, ArrowRightLeft, Wrench, Menu, Settings, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { BranchId, User } from '../../types';

interface SidebarProps {
    activeTab: 'dashboard' | 'record' | 'maintenance' | 'settings' | 'analytics';
    setActiveTab: (tab: 'dashboard' | 'record' | 'maintenance' | 'settings' | 'analytics') => void;
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
        <aside className={`fixed left-0 top-0 h-screen bg-white border-r border-slate-200 shadow-xl z-50 hidden md:flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
            {/* Logo Section */}
            <div className={`p-6 border-b border-slate-100 flex items-center gap-3 relative overflow-hidden h-[85px] shrink-0`}>
                <div className={`bg-gradient-to-br from-blue-600 to-blue-800 text-white p-2 rounded-xl shadow-lg shrink-0 transition-all duration-300 ${isCollapsed ? 'mx-auto' : ''}`}>
                    <Menu size={20} />
                </div>
                {!isCollapsed && (
                    <h1 className="font-black text-2xl tracking-tight text-slate-800 whitespace-nowrap animate-in fade-in duration-300">
                        Neo<span className="text-blue-600">Siam</span>
                    </h1>
                )}
            </div>

            {/* Collapse Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 shadow-sm z-50 transition-all hover:scale-110"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Navigation Menu */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    title={isCollapsed ? 'Dashboard' : ''}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold group ${activeTab === 'dashboard'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
                        } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                    <LayoutDashboard size={20} className={activeTab === 'dashboard' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'} />
                    {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">Dashboard</span>}
                </button>

                {/* Analytics Menu */}
                <button
                    onClick={() => setActiveTab('analytics')}
                    title={isCollapsed ? 'Analytics' : ''}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold group ${activeTab === 'analytics'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-purple-200'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-purple-600'
                        } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                    <BarChart3 size={20} className={activeTab === 'analytics' ? 'text-white' : 'text-slate-400 group-hover:text-purple-600'} />
                    {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">Analytics</span>}
                </button>

                {selectedBranch !== 'ALL' && (
                    <button
                        onClick={() => setActiveTab('record')}
                        title={isCollapsed ? 'Movement' : ''}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold group ${activeTab === 'record'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
                            } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                        <ArrowRightLeft size={20} className={activeTab === 'record' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'} />
                        {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">Movement</span>}
                    </button>
                )}

                {/* Maintenance Menu */}
                {(selectedBranch === 'hub_nw' || currentUser?.branchId === 'hub_nw') && (
                    <button
                        onClick={() => setActiveTab('maintenance')}
                        title={isCollapsed ? 'Maintenance' : ''}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold group ${activeTab === 'maintenance'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
                            } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                        <Wrench size={20} className={activeTab === 'maintenance' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'} />
                        {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">Maintenance</span>}
                    </button>
                )}

                {/* Settings Menu */}
                {currentUser?.role === 'ADMIN' && (
                    <button
                        onClick={() => setActiveTab('settings')}
                        title={isCollapsed ? 'System Settings' : ''}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold group ${activeTab === 'settings'
                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                        <Settings size={20} className={activeTab === 'settings' ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'} />
                        {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300 text-xs">System Settings</span>}
                    </button>
                )}
            </nav>

            {/* Footer / Version Info */}
            <div className={`p-6 border-t border-slate-100 transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
                <div className={`text-slate-400 font-medium text-center transition-all duration-300 ${isCollapsed ? 'text-[8px]' : 'text-xs'}`}>
                    {isCollapsed ? 'Neo' : 'Dev by Paweewat Phosanga'}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;

