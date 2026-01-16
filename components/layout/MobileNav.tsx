import React from 'react';
import { LayoutDashboard, ArrowRightLeft, Wrench, BarChart3 } from 'lucide-react';
import { BranchId, User } from '../../types';

interface MobileNavProps {
    activeTab: string;
    setActiveTab: (tab: any) => void;
    selectedBranch: BranchId | 'ALL';
    currentUser: User | null;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab, selectedBranch, currentUser }) => {
    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around p-2 pb-safe">
            <button onClick={() => setActiveTab('dashboard')} className={`p-2 rounded-lg flex flex-col items-center ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}>
                <LayoutDashboard size={24} />
                <span className="text-[10px] font-bold mt-1">Dash</span>
            </button>

            <button onClick={() => setActiveTab('analytics')} className={`p-2 rounded-lg flex flex-col items-center ${activeTab === 'analytics' ? 'text-purple-600' : 'text-slate-400'}`}>
                <BarChart3 size={24} />
                <span className="text-[10px] font-bold mt-1">Analytics</span>
            </button>

            {(selectedBranch !== 'ALL') && (
                <button onClick={() => setActiveTab('record')} className={`p-2 rounded-lg flex flex-col items-center ${activeTab === 'record' ? 'text-blue-600' : 'text-slate-400'}`}>
                    <ArrowRightLeft size={24} />
                    <span className="text-[10px] font-bold mt-1">Move</span>
                </button>
            )}

            {(selectedBranch === 'hub_nw' || currentUser?.branchId === 'hub_nw') && (
                <button onClick={() => setActiveTab('maintenance')} className={`p-2 rounded-lg flex flex-col items-center ${activeTab === 'maintenance' ? 'text-blue-600' : 'text-slate-400'}`}>
                    <Wrench size={24} />
                    <span className="text-[10px] font-bold mt-1">Maint</span>
                </button>
            )}
        </div>
    );
};

export default MobileNav;
