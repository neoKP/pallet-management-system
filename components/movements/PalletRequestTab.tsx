import React from 'react';
import { Plus } from 'lucide-react';
import { BranchId, User } from '../../types';
import { usePalletRequestLogic } from '../../hooks/usePalletRequestLogic';
import PalletRequestForm from './PalletRequestForm';
import PalletRequestList from './PalletRequestList';

interface PalletRequestTabProps {
    selectedBranch: BranchId;
    currentUser?: User;
}

const PalletRequestTab: React.FC<PalletRequestTabProps> = ({ selectedBranch, currentUser }) => {
    const logic = usePalletRequestLogic(selectedBranch, currentUser);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-slate-900">Pallet Return Requests</h2>
                    <p className="text-sm text-slate-500">ระบบร้องขอการส่งคืนพาเลทจากสาขา NW</p>
                </div>
                <button
                    onClick={() => logic.setIsModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                >
                    <Plus size={18} /> สร้างคำขอใหม่
                </button>
            </div>

            <PalletRequestList
                requests={logic.displayRequests}
                isHub={logic.isHub}
                currentBranchId={selectedBranch}
                allDestinations={logic.ALL_DESTINATIONS}
                onApprove={logic.handleApprove}
                onReject={logic.handleReject}
                onShip={logic.handleShip}
                onEdit={logic.handleEdit}
            />

            <PalletRequestForm
                isOpen={logic.isModalOpen}
                onClose={logic.handleCloseModal}
                onSubmit={logic.handleCreateRequest}
                requestItems={logic.requestItems}
                handleAddItem={logic.handleAddItem}
                handleRemoveItem={logic.handleRemoveItem}
                handleItemChange={logic.handleItemChange}
                newRequestMeta={logic.newRequestMeta}
                setNewRequestMeta={logic.setNewRequestMeta}
                isEditing={!!logic.editingRequestId}
                isProcessing={logic.isProcessing}
            />
        </div>
    );
};

export default PalletRequestTab;
