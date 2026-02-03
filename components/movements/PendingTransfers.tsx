import React from 'react';
import { Truck, Clock, Building, Car, User as UserIcon, CheckCircle } from 'lucide-react';
import { Transaction } from '../../types';
import { BRANCHES, PALLET_TYPES, VEHICLE_TYPES } from '../../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface PendingTransfersProps {
    pendingGroups: Transaction[][];
    onViewTimeline: (tx: Transaction) => void;
    onBatchConfirm: (txs: Transaction[]) => void;
    isProcessing?: boolean;
    isDarkMode?: boolean;
}

const PendingTransfers: React.FC<PendingTransfersProps> = ({
    pendingGroups,
    onViewTimeline,
    onBatchConfirm,
    isProcessing,
    isDarkMode = true
}) => {
    if (pendingGroups.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                p-8 rounded-[2.5rem] border mb-8 relative overflow-hidden backdrop-blur-xl
                ${isDarkMode ? 'bg-slate-900/40 border-white/5 shadow-2xl' : 'bg-orange-50/50 border-orange-100 shadow-xl'}
            `}
        >
            {/* Animated Glow Accent */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 blur-[100px] rounded-full" />

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <motion.div
                        whileHover={{ rotate: 180 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        className={`p-4 rounded-2xl shadow-lg ${isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}
                    >
                        <Truck size={28} />
                    </motion.div>
                    <div>
                        <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Incoming Deliveries
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {pendingGroups.length} batches waiting for acceptance
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {pendingGroups.map((group, groupIdx) => {
                        const mainTx = group[0];
                        return (
                            <motion.div
                                key={mainTx.docNo}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: groupIdx * 0.1 }}
                                whileHover={{ y: -5 }}
                                className={`
                                    p-6 rounded-3xl border flex flex-col justify-between transition-all duration-300
                                    ${isDarkMode
                                        ? 'bg-slate-950/60 border-white/5 hover:border-orange-500/30'
                                        : 'bg-white border-slate-100 shadow-lg hover:shadow-orange-200/50'
                                    }
                                `}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>DOCUMENT ID</span>
                                            <span className={`text-lg font-black ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                                {mainTx.docNo}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => onViewTimeline(mainTx)}
                                            className={`p-2 rounded-xl transition-all border flex items-center gap-2 group ${isDarkMode
                                                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-400 hover:text-white'
                                                : 'bg-slate-50 border-slate-100 hover:bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-100'
                                                }`}
                                        >
                                            <Clock size={16} className="group-hover:rotate-12 transition-transform" />
                                            <span className="text-xs font-bold">Timeline</span>
                                        </button>
                                    </div>

                                    <div className={`space-y-4 mb-6 pt-4 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-50'}`}>
                                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/5">
                                            <div className="flex gap-2 items-center">
                                                <Building size={16} className="text-indigo-400" />
                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Origin</span>
                                            </div>
                                            <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{BRANCHES.find(b => b.id === mainTx.source)?.name || mainTx.source}</span>
                                        </div>

                                        {(mainTx.carRegistration || mainTx.transportCompany) && (
                                            <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-600'} space-y-2`}>
                                                {mainTx.transportCompany && <div className="flex items-center gap-2 text-xs font-bold leading-tight"><Building size={14} className="opacity-70 text-indigo-400" /> {mainTx.transportCompany}</div>}
                                                {mainTx.carRegistration && <div className="flex items-center gap-2 text-xs font-bold leading-tight"><Car size={14} className="opacity-70 text-indigo-400" /> {mainTx.carRegistration} {(mainTx.vehicleType) ? `(${VEHICLE_TYPES.find(v => v.id === mainTx.vehicleType)?.name || mainTx.vehicleType})` : ''}</div>}
                                                {mainTx.driverName && <div className="flex items-center gap-2 text-xs font-bold leading-tight"><UserIcon size={14} className="opacity-70 text-indigo-400" /> {mainTx.driverName}</div>}
                                            </div>
                                        )}

                                        <div className={`rounded-2xl p-4 ${isDarkMode ? 'bg-orange-500/5 border border-orange-500/10' : 'bg-orange-50 border border-orange-100'} space-y-3`}>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 block">Inventory</span>
                                            {Object.values(group.reduce((acc, item) => {
                                                if (!acc[item.palletId]) {
                                                    acc[item.palletId] = { ...item, qty: 0 };
                                                }
                                                acc[item.palletId].qty += item.qty;
                                                return acc;
                                            }, {} as Record<string, Transaction>)).map((tx, idx) => (
                                                <div key={idx} className="flex justify-between items-center group/item hover:translate-x-1 transition-transform">
                                                    <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{PALLET_TYPES.find(p => p.id === tx.palletId)?.name}</span>
                                                    <span className="text-sm font-black text-orange-500">x{tx.qty}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onBatchConfirm(group)}
                                    disabled={isProcessing}
                                    className={`
                                        w-full py-4 rounded-2xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden
                                        ${isProcessing
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-[0_10px_30px_rgba(249,115,22,0.3)] hover:shadow-orange-500/50'
                                        }
                                    `}
                                >
                                    {isProcessing ? (
                                        <div className="w-5 h-5 border-3 border-slate-600 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle size={20} className="drop-shadow-lg" />
                                            <span>VERIFY & ACCEPT</span>
                                        </>
                                    )}
                                </motion.button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default PendingTransfers;
