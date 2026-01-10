import React from 'react';
import { LayoutDashboard, ArrowRightLeft, Wrench, Menu, Settings } from 'lucide-react';
import { BranchId, User } from '../../types';

interface SidebarProps {
    activeTab: 'dashboard' | 'record' | 'maintenance' | 'settings';
    setActiveTab: (tab: 'dashboard' | 'record' | 'maintenance' | 'settings') => void;
    currentUser: User | null;
    selectedBranch: BranchId | 'ALL';
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser, selectedBranch }) => {
    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 shadow-xl z-50 hidden md:flex flex-col">
            {/* Logo Section */}
            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-2 rounded-xl shadow-lg">
                    <Menu size={20} />
                </div>
                <h1 className="font-black text-2xl tracking-tight text-slate-800">
                    Neo<span className="text-blue-600">Siam</span>
                </h1>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 p-4 space-y-2">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold group ${activeTab === 'dashboard'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
                        }`}
                >
                    <LayoutDashboard size={20} className={activeTab === 'dashboard' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'} />
                    Dashboard
                </button>

                {selectedBranch !== 'ALL' && (
                    <button
                        onClick={() => setActiveTab('record')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold group ${activeTab === 'record'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
                            }`}
                    >
                        <ArrowRightLeft size={20} className={activeTab === 'record' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'} />
                        Movement
                    </button>
                )}

                {/* Maintenance Menu: Visible if 'hub_nks' or user is Hub Operator */}
                {(selectedBranch === 'hub_nw' || currentUser?.branchId === 'hub_nw') && (
                    <button
                        onClick={() => setActiveTab('maintenance')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold group ${activeTab === 'maintenance'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
                            }`}
                    >
                        <Wrench size={20} className={activeTab === 'maintenance' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'} />
                        Maintenance
                    </button>
                )}
                {/* Settings Menu: Visible only/User Role Admin */}
                {currentUser?.role === 'ADMIN' && (
                    <button
                        onClick={() => setActiveTab('settings' as any)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold group ${activeTab === ('settings' as any)
                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <Settings size={20} className={activeTab === ('settings' as any) ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'} />
                        System Settings
                    </button>
                )}
            </nav>

            {/* Footer / Version Info */}
            <div className="p-6 border-t border-slate-100">
                <div className="text-xs text-slate-400 font-medium text-center">
                    Dev by Paweewat Phosanga
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
