import React from 'react';
import { ArrowDownToLine, Settings } from 'lucide-react';
import { Stock, BranchId, Transaction } from '../../types';
import { useMaintenanceLogic } from '../../hooks/useMaintenanceLogic';
import RepairInboundForm from './RepairInboundForm';
import RepairProcessForm from './RepairProcessForm';

interface MaintenanceTabProps {
    stock: Stock;
    selectedBranch: BranchId;
    onBatchMaintenance: (data: any) => void;
    onAddTransaction: (transaction: Partial<Transaction>) => void;
}

const MaintenanceTab: React.FC<MaintenanceTabProps> = ({ stock, selectedBranch, onBatchMaintenance, onAddTransaction }) => {
    const logic = useMaintenanceLogic(stock, selectedBranch, onBatchMaintenance, onAddTransaction);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Sub-Tab Navigation */}
            <div className="flex p-1.5 bg-slate-100 rounded-[2rem] border border-slate-200 shadow-inner">
                <button
                    onClick={() => logic.setSubTab('inbound')}
                    className={`flex-1 py-3.5 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-2 transition-all ${logic.subTab === 'inbound' ? 'bg-white shadow-xl text-blue-600 scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                >
                    <ArrowDownToLine size={18} />
                    1. รับเข้าคลังซ่อม
                </button>
                <button
                    onClick={() => logic.setSubTab('process')}
                    className={`flex-1 py-3.5 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-2 transition-all ${logic.subTab === 'process' ? 'bg-white shadow-xl text-blue-600 scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                >
                    <Settings size={18} />
                    2. บันทึกผลการซ่อม
                </button>
            </div>

            {logic.subTab === 'inbound' ? (
                <RepairInboundForm
                    form={logic.inboundForm}
                    onChange={logic.setInboundForm}
                    onSubmit={logic.handleInboundSubmit}
                />
            ) : (
                <RepairProcessForm
                    pendingStock={logic.pendingStock}
                    batchItems={logic.batchItems}
                    addBatchItem={logic.addBatchItem}
                    removeBatchItem={logic.removeBatchItem}
                    updateBatchItem={logic.updateBatchItem}
                    fixedQty={logic.fixedQty}
                    setFixedQty={logic.setFixedQty}
                    scrappedQty={logic.scrappedQty}
                    setScrappedQty={logic.setScrappedQty}
                    totalProcessed={logic.totalProcessed}
                    onSubmit={logic.handleSubmit}
                />
            )}
        </div>
    );
};

export default MaintenanceTab;
