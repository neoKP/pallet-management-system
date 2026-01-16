import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronDown, Check } from 'lucide-react';
import { BranchId, PalletId } from '../../types';
import { BRANCHES, PALLET_TYPES } from '../../constants';

interface SlicersProps {
    isOpen: boolean;
    onClose: () => void;
    filters: {
        branches: BranchId[];
        palletTypes: PalletId[];
        years: number[];
    };
    onFilterChange: (type: 'branches' | 'palletTypes' | 'years', value: any) => void;
    isDarkMode: boolean;
}

export const Slicers: React.FC<SlicersProps> = ({
    isOpen,
    onClose,
    filters,
    onFilterChange,
    isDarkMode
}) => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2];

    const toggleSelection = (type: 'branches' | 'palletTypes' | 'years', id: any) => {
        const current = filters[type] as any[];
        const next = current.includes(id)
            ? current.filter(item => item !== id)
            : [...current, id];
        onFilterChange(type, next);
    };

    const clearFilters = (type: 'branches' | 'palletTypes' | 'years') => {
        onFilterChange(type, []);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className={`fixed right-0 top-0 h-full w-80 z-50 shadow-2xl overflow-y-auto ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
                            }`}
                    >
                        <div className="p-6 space-y-8">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b pb-4 border-slate-700/50">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Filter className="w-5 h-5 text-indigo-500" />
                                    ฟิลเตอร์ขั้นสูง
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                                    title="Close filters"
                                    aria-label="Close filters"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Year Slicer */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-semibold opacity-60 uppercase tracking-wider">ปีงบประมาณ</label>
                                    <button onClick={() => clearFilters('years')} className="text-xs text-indigo-500 hover:underline">ล้าง</button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {years.map(year => (
                                        <button
                                            key={year}
                                            onClick={() => toggleSelection('years', year)}
                                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${filters.years.includes(year)
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                : isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            {year}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Pallet Type Slicer */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-semibold opacity-60 uppercase tracking-wider">ประเภทพาเลท</label>
                                    <button onClick={() => clearFilters('palletTypes')} className="text-xs text-indigo-500 hover:underline">ล้าง</button>
                                </div>
                                <div className="space-y-2">
                                    {PALLET_TYPES.map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => toggleSelection('palletTypes', type.id)}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${filters.palletTypes.includes(type.id)
                                                ? 'bg-indigo-600/10 border border-indigo-500/50 text-indigo-400'
                                                : isDarkMode ? 'bg-slate-800/50 border border-transparent text-slate-400 hover:bg-slate-800' : 'bg-slate-50 border border-transparent text-slate-600 hover:bg-slate-100'
                                                }`}
                                        >
                                            <span className="text-sm font-medium">{type.name}</span>
                                            {filters.palletTypes.includes(type.id) && <Check className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Branch Slicer */}
                            <div className="space-y-3 pb-8">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-semibold opacity-60 uppercase tracking-wider">เลือกสาขา</label>
                                    <button onClick={() => clearFilters('branches')} className="text-xs text-indigo-500 hover:underline">ล้าง</button>
                                </div>
                                <div className="space-y-1 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                    {BRANCHES.map(branch => (
                                        <button
                                            key={branch.id}
                                            onClick={() => toggleSelection('branches', branch.id)}
                                            className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all ${filters.branches.includes(branch.id)
                                                ? 'text-indigo-400 font-bold'
                                                : 'text-slate-400 hover:text-indigo-400'
                                                }`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${filters.branches.includes(branch.id)
                                                ? 'bg-indigo-600 border-indigo-600'
                                                : 'border-slate-600'
                                                }`}>
                                                {filters.branches.includes(branch.id) && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className="text-sm">{branch.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Apply Button (Visual only for now) */}
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                อัปเดตข้อมูล
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
