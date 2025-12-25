import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Stock, Transaction, BranchId, PalletId, TransactionType } from '../types';
import { INITIAL_STOCK, INITIAL_TRANSACTIONS, BRANCHES } from '../constants';
import * as firebaseService from '../services/firebase';

interface StockContextType {
    stock: Stock;
    transactions: Transaction[];
    addTransaction: (transaction: Partial<Transaction>) => void;
    addMovementBatch: (data: {
        type: TransactionType;
        source: string;
        dest: string;
        items: { palletId: PalletId; qty: number }[];
        docNo?: string;
        carRegistration?: string;
        vehicleType?: string;
        driverName?: string;
        transportCompany?: string;
        referenceDocNo?: string;
    }) => void;
    confirmTransaction: (txId: number) => void;
    processBatchMaintenance: (data: {
        items: { palletId: PalletId; qty: number }[];
        fixedQty: number;
        scrappedQty: number;
        note: string;
        branchId: BranchId;
        targetBranchId?: BranchId;
    }) => void;
    getStockForBranch: (branchId: BranchId) => Record<PalletId, number>;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

export const useStock = () => {
    const context = useContext(StockContext);
    if (!context) {
        throw new Error('useStock must be used within a StockProvider');
    }
    return context;
};

interface StockProviderProps {
    children: ReactNode;
}

export const StockProvider: React.FC<StockProviderProps> = ({ children }) => {
    const [stock, setStock] = useState<Stock>(INITIAL_STOCK);
    const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

    // --- Firebase Sync ---
    useEffect(() => {
        // Subscribe to Stock
        firebaseService.subscribeToStock((data) => {
            if (data) setStock(data);
        });

        // Subscribe to Transactions
        firebaseService.subscribeToTransactions((data) => {
            if (data) setTransactions(data);
        });

        // Cleanup: Ideally we should unsubscribe, but our service wrapper currently returns void.
        // Future TODO: Update service to return unsubscribe function.
        return () => {
            // unsubscribeStock();
            // unsubscribeTransactions();
        };
    }, []);

    const generateDocNo = useCallback((type: TransactionType, source: string, dest: string, dateStr: string) => {
        const isSourceBranch = BRANCHES.some(b => b.id === source);
        const isDestBranch = BRANCHES.some(b => b.id === dest);

        let prefix = 'INT';
        if (type === 'ADJUST') {
            prefix = 'ADJ';
        } else if (isSourceBranch && isDestBranch) {
            prefix = 'INT'; // Internal Transfer
        } else if (!isSourceBranch && isDestBranch) {
            prefix = 'EXT-IN'; // External Receive
        } else if (isSourceBranch && !isDestBranch) {
            prefix = 'EXT-OUT'; // External Dispatch
        }

        const datePart = dateStr.replace(/-/g, '');
        // Note: usage of 'transactions' here depends on the closure. 
        // With firebase async updates, this might slightly lag but acceptable for doc generation.
        const existingDocs = transactions.filter(t => t.docNo && t.docNo.startsWith(`${prefix}-${datePart}`));
        const running = (existingDocs.length + 1).toString().padStart(3, '0');

        return `${prefix}-${datePart}-${running}`;
    }, [transactions]);

    const addTransaction = useCallback((txData: Partial<Transaction>) => {
        const dateStr = new Date().toISOString().split('T')[0];
        // Ensure required fields for generateDocNo are present
        if (!txData.type || !txData.source || !txData.dest) {
            console.error("Missing required transaction data for doc number generation.");
            return;
        }
        const docNo = generateDocNo(txData.type, txData.source, txData.dest, dateStr);

        const isSourceBranch = BRANCHES.some(b => b.id === txData.source);
        const isDestBranch = BRANCHES.some(b => b.id === txData.dest);
        const isInternalTransfer = isSourceBranch && isDestBranch && txData.type === 'OUT';

        const status = isInternalTransfer ? 'PENDING' : 'COMPLETED';

        const newTx: Transaction = {
            ...txData,
            id: Date.now(),
            date: dateStr,
            docNo,
            status,
            // Ensure palletId and qty are defined for Transaction type
            palletId: txData.palletId || 'unknown', // Default or handle error
            qty: txData.qty || 0, // Default or handle error
        } as Transaction; // Cast to Transaction after ensuring all fields

        // Calculate New Stock State locally
        const nextStock = { ...stock };

        // Deduct from source if it's a branch
        if (newTx.source && nextStock[newTx.source as BranchId]) {
            const s = { ...nextStock[newTx.source as BranchId] } as Record<PalletId, number>;
            s[newTx.palletId] = Math.max(0, (s[newTx.palletId] || 0) - newTx.qty);
            nextStock[newTx.source as BranchId] = s;
        }

        // Add to destination ONLY if it's NOT pending
        if (status === 'COMPLETED' && newTx.dest && nextStock[newTx.dest as BranchId]) {
            const d = { ...nextStock[newTx.dest as BranchId] } as Record<PalletId, number>;
            d[newTx.palletId] = (d[newTx.palletId] || 0) + newTx.qty;
            nextStock[newTx.dest as BranchId] = d;
        }

        // Send to Firebase
        firebaseService.updateTransactionAndStock(newTx, nextStock);

    }, [stock, generateDocNo]);

    const confirmTransaction = useCallback((txId: number) => {
        const tx = transactions.find(t => t.id === txId);
        if (!tx || tx.status === 'COMPLETED') return;

        // Update Transaction
        const updatedTx = { ...tx, status: 'COMPLETED' as const };

        // Update Stock (Add to Dest)
        const nextStock = { ...stock };
        if (updatedTx.dest && nextStock[updatedTx.dest as BranchId]) {
            const d = { ...nextStock[updatedTx.dest as BranchId] } as Record<PalletId, number>;
            d[updatedTx.palletId] = (d[updatedTx.palletId] || 0) + updatedTx.qty;
            nextStock[updatedTx.dest as BranchId] = d;
        }

        // Send to Firebase
        firebaseService.updateTransactionAndStock(updatedTx, nextStock);

    }, [stock, transactions]);

    const addMovementBatch = useCallback((data: {
        type: TransactionType;
        source: string;
        dest: string;
        items: { palletId: PalletId; qty: number }[];
        docNo?: string;
        carRegistration?: string;
        vehicleType?: string;
        driverName?: string;
        transportCompany?: string;
        referenceDocNo?: string;
    }) => {
        const dateStr = new Date().toISOString().split('T')[0];
        const docNo = data.docNo || generateDocNo(data.type, data.source, data.dest, dateStr);

        const isSourceBranch = BRANCHES.some(b => b.id === data.source);
        const isDestBranch = BRANCHES.some(b => b.id === data.dest);
        const isInternalTransfer = isSourceBranch && isDestBranch && data.type === 'OUT';
        const status = isInternalTransfer ? 'PENDING' : 'COMPLETED';

        const newTransactions: Transaction[] = [];
        const nextStock = { ...stock };

        data.items.forEach((item, index) => {
            const newTx: Transaction = {
                id: Date.now() + index, // Ensure unique IDs for batch
                date: dateStr,
                docNo,
                type: data.type,
                status,
                source: data.source,
                dest: data.dest,
                palletId: item.palletId,
                qty: item.qty,
                carRegistration: data.carRegistration,
                vehicleType: data.vehicleType,
                driverName: data.driverName,
                transportCompany: data.transportCompany,
                referenceDocNo: data.referenceDocNo,
            } as Transaction;

            newTransactions.push(newTx);

            // Deduct from source
            if (data.source && nextStock[data.source as BranchId]) {
                const s = { ...nextStock[data.source as BranchId] } as Record<PalletId, number>;
                s[item.palletId] = Math.max(0, (s[item.palletId] || 0) - item.qty);
                nextStock[data.source as BranchId] = s;
            }

            // Add to dest (if completed)
            if (status === 'COMPLETED' && data.dest && nextStock[data.dest as BranchId]) {
                const d = { ...nextStock[data.dest as BranchId] } as Record<PalletId, number>;
                d[item.palletId] = (d[item.palletId] || 0) + item.qty;
                nextStock[data.dest as BranchId] = d;
            }
        });

        // Directly access firebase utils for batch update here
        // Assuming window.firebase is available globally or imported
        if (typeof window !== 'undefined' && window.firebase && window.firebase.utils && window.firebase.database()) {
            const { utils, database } = window.firebase;
            const updates: Record<string, any> = {};

            updates['/transactions'] = newTransactions;
            updates['/stock'] = nextStock;

            utils.update(utils.ref(database(), '/'), updates);
        } else {
            console.error("Firebase utilities not available for batch update.");
            // Fallback or error handling if firebase is not initialized or window.firebase is not set
        }

    }, [stock, generateDocNo]);

    const processBatchMaintenance = useCallback(
        (data: {
            items: { palletId: PalletId; qty: number }[];
            fixedQty: number;
            scrappedQty: number;
            note: string;
            branchId: BranchId;
            targetBranchId?: BranchId;
        }) => {
            const totalProcessed = data.items.reduce((sum, item) => sum + item.qty, 0);
            const targetBranch = data.targetBranchId || data.branchId;
            const dateStr = new Date().toISOString().split('T')[0];

            const datePart = dateStr.replace(/-/g, '');
            const existingDocs = transactions.filter(t => t.docNo && t.docNo.startsWith(`MNT-${datePart}`));
            const running = (existingDocs.length + 1).toString().padStart(3, '0');
            const docNo = `MNT-${datePart}-${running}`;

            const newTx: Transaction = {
                id: Date.now(),
                date: dateStr,
                docNo,
                type: 'MAINTENANCE',
                status: 'COMPLETED',
                source: data.branchId,
                dest: targetBranch,
                palletId: 'general', // Maintenance typically deals with 'general' or specific pallet types
                qty: totalProcessed,
                action: 'REPAIR_CONVERT', // Specific action for maintenance
                note: data.note,
                noteExtended: `Batch: ${data.items.map((i) => `${i.palletId} ${i.qty}`).join(', ')} | Fixed: ${data.fixedQty}, Scrap: ${data.scrappedQty}`,
                qtyRepaired: data.fixedQty,
                targetPallet: 'general', // Pallet type after repair/conversion
            };

            const nextStock = { ...stock };

            // Deduct from source (maintenance_stock)
            if (nextStock[data.branchId]) {
                const s = { ...nextStock[data.branchId] } as Record<PalletId, number>;
                data.items.forEach((item) => {
                    s[item.palletId] = Math.max(0, (s[item.palletId] || 0) - item.qty);
                });
                nextStock[data.branchId] = s;
            }

            // Add Fixed General to target (hub_nks)
            if (nextStock[targetBranch]) {
                const t = { ...nextStock[targetBranch] } as Record<PalletId, number>;
                if (data.fixedQty > 0) {
                    t['general'] = (t['general'] || 0) + data.fixedQty;
                }
                nextStock[targetBranch] = t;
            }

            firebaseService.updateTransactionAndStock(newTx, nextStock);
        },
        [stock, transactions]
    );

    const getStockForBranch = useCallback(
        (branchId: BranchId): Record<PalletId, number> => {
            return stock[branchId] || {};
        },
        [stock]
    );

    return (
        <StockContext.Provider
            value={{
                stock,
                transactions,
                addTransaction,
                addMovementBatch,
                confirmTransaction,
                processBatchMaintenance,
                getStockForBranch,
            }}
        >
            {children}
        </StockContext.Provider>
    );
};
