import React from 'react';
import { LayoutDashboard, ArrowRightLeft, Wrench, BarChart3, List, Home, Trash2 } from 'lucide-react';
import { BranchId, User } from '../../types';

interface MobileNavProps {
    activeTab: 'home' | 'inventory' | 'dashboard' | 'record' | 'maintenance' | 'settings' | 'analytics' | 'history' | 'scrapsales';
    setActiveTab: (tab: 'home' | 'inventory' | 'dashboard' | 'record' | 'maintenance' | 'settings' | 'analytics' | 'history' | 'scrapsales') => void;
    selectedBranch: BranchId | 'ALL';
    currentUser: User | null;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab, selectedBranch, currentUser }) => {
    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around p-2 pb-safe">
            <button onClick={() => setActiveTab('home')} className={`p-2 rounded-lg flex flex-col items-center ${activeTab === 'home' ? 'text-blue-600' : 'text-slate-400'}`}>
                <Home size={22} />
                <span className="text-[10px] font-bold mt-1">Home</span>
            </button>

            <button onClick={() => setActiveTab('inventory')} className={`p-2 rounded-lg flex flex-col items-center ${activeTab === 'inventory' ? 'text-blue-600' : 'text-slate-400'}`}>
                <LayoutDashboard size={22} />
                <span className="text-[10px] font-bold mt-1">Inv</span>
            </button>

            <button onClick={() => setActiveTab('dashboard')} className={`p-2 rounded-lg flex flex-col items-center ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}>
                <LayoutDashboard size={22} />
                <span className="text-[10px] font-bold mt-1">Dash</span>
            </button>

            {(selectedBranch !== 'ALL') && (
                <button onClick={() => setActiveTab('record')} className={`p-2 rounded-lg flex flex-col items-center ${activeTab === 'record' ? 'text-blue-600' : 'text-slate-400'}`}>
                    <ArrowRightLeft size={22} />
                    <span className="text-[10px] font-bold mt-1">Move</span>
                </button>
            )}

            {(currentUser?.role === 'ADMIN' || currentUser?.branchId === 'hub_nw' || currentUser?.branchId === 'maintenance_stock') && (
                <button onClick={() => setActiveTab('maintenance')} className={`p-2 rounded-lg flex flex-col items-center ${activeTab === 'maintenance' ? 'text-blue-600' : 'text-slate-400'}`}>
                    <Wrench size={22} />
                    <span className="text-[10px] font-bold mt-1">Maint</span>
                </button>
            )}

            {(currentUser?.role === 'ADMIN' || currentUser?.branchId === 'maintenance_stock') && (
                <button onClick={() => setActiveTab('scrapsales')} className={`p-2 rounded-lg flex flex-col items-center ${activeTab === 'scrapsales' ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <Trash2 size={22} />
                    <span className="text-[10px] font-bold mt-1">Scrap</span>
                </button>
            )}

            <button onClick={() => setActiveTab('history')} className={`p-2 rounded-lg flex flex-col items-center ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400'}`}>
                <List size={22} />
                <span className="text-[10px] font-bold mt-1">Logs</span>
            </button>
        </div>
    );
};

export default MobileNav;
