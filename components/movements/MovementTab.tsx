import React from 'react';
import { ArrowRightLeft, ClipboardList } from 'lucide-react';
import ReceiveModal from './ReceiveModal';
import TransactionTimelineModal from './TransactionTimelineModal';
import DocumentPreviewModal from './DocumentPreviewModal';
import PalletRequestTab from './PalletRequestTab';
import MovementForm from './MovementForm';
import PendingTransfers from './PendingTransfers';
import TransactionHistory from './TransactionHistory';
import { BranchId, Transaction, User } from '../../types';
import { useMovementLogic } from '../../hooks/useMovementLogic';

interface MovementTabProps {
    selectedBranch: BranchId;
    transactions: Transaction[];
    currentUser?: User;
}

const MovementTab: React.FC<MovementTabProps> = ({ selectedBranch, transactions, currentUser }) => {
    const logic = useMovementLogic(selectedBranch, transactions);

    return (
        <div className="space-y-6">
            <div className="flex gap-4 border-b border-slate-200 pb-1">
                <button
                    onClick={() => logic.setSubTab('movement')}
                    className={`pb-3 px-2 text-sm font-bold transition-all relative ${logic.subTab === 'movement' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <ArrowRightLeft size={16} />
                        Record Movement
                    </div>
                    {logic.subTab === 'movement' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                </button>
                <button
                    onClick={() => logic.setSubTab('requests')}
                    className={`pb-3 px-2 text-sm font-bold transition-all relative ${logic.subTab === 'requests' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <ClipboardList size={16} />
                        Pallet Requests
                    </div>
                    {logic.subTab === 'requests' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                </button>
            </div>

            {logic.subTab === 'movement' ? (
                <>
                    <PendingTransfers
                        pendingGroups={logic.pendingGroups}
                        onViewTimeline={logic.handleViewTimeline}
                        onBatchConfirm={logic.handleBatchConfirm}
                    />

                    <ReceiveModal
                        isOpen={logic.isReceiveModalOpen}
                        onClose={() => logic.setIsReceiveModalOpen(false)}
                        group={logic.verifyingGroup || []}
                        onConfirm={logic.handleConfirmReceive}
                    />

                    {logic.timelineTx && (
                        <TransactionTimelineModal
                            isOpen={logic.isTimelineOpen}
                            onClose={() => logic.setIsTimelineOpen(false)}
                            transactions={[logic.timelineTx]}
                        />
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <MovementForm
                            transactionType={logic.transactionType}
                            setTransactionType={logic.setTransactionType}
                            target={logic.target}
                            setTarget={logic.setTarget}
                            transactionDate={logic.transactionDate}
                            setTransactionDate={logic.setTransactionDate}
                            referenceDocNo={logic.referenceDocNo}
                            setReferenceDocNo={logic.setReferenceDocNo}
                            items={logic.items}
                            handleItemChange={logic.handleItemChange}
                            handleRemoveItem={logic.handleRemoveItem}
                            handleAddItem={logic.handleAddItem}
                            transportInfo={logic.transportInfo}
                            setTransportInfo={logic.setTransportInfo}
                            onSubmit={logic.handleSubmit}
                            selectedBranch={selectedBranch}
                        />

                        <TransactionHistory
                            historyGroups={logic.historyGroups}
                            onViewTimeline={logic.handleViewTimeline}
                            onVerifyDocument={logic.handleVerifyDocument}
                        />
                    </div>
                </>
            ) : (
                <PalletRequestTab selectedBranch={selectedBranch} currentUser={currentUser} />
            )}

            <DocumentPreviewModal
                isOpen={logic.isPreviewOpen}
                onClose={() => logic.setIsPreviewOpen(false)}
                onConfirm={logic.handleConfirmSave}
                data={logic.previewData}
            />
        </div>
    );
};

export default MovementTab;
