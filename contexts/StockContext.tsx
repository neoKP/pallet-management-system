import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Stock, Transaction, BranchId, PalletId, TransactionType, PalletRequest } from '../types';
import { INITIAL_STOCK, INITIAL_TRANSACTIONS, BRANCHES, EXTERNAL_PARTNERS, PALLET_TYPES } from '../constants';
import * as firebaseService from '../services/firebase';
import * as telegramService from '../services/telegramService';

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
        note?: string;
    }) => void;
    confirmTransaction: (txId: number) => void;
    confirmTransactionsBatch: (results: Transaction[]) => void;
    deleteTransaction: (txId: number) => void;
    processBatchMaintenance: (data: {
        items: { palletId: PalletId; qty: number }[];
        fixedQty: number;
        scrappedQty: number;
        note: string;
        branchId: BranchId;
        targetBranchId?: BranchId;
    }) => void;
    getStockForBranch: (branchId: BranchId) => Record<PalletId, number>;
    palletRequests: PalletRequest[];
    createPalletRequest: (data: Partial<PalletRequest>) => Promise<void>;
    updatePalletRequest: (req: PalletRequest) => Promise<void>;
    config: { telegramChatId: string };
    updateSystemConfig: (newConfig: Partial<{ telegramChatId: string }>) => Promise<void>;
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
    const [palletRequests, setPalletRequests] = useState<PalletRequest[]>([]);
    const [config, setConfig] = useState<{ telegramChatId: string }>({ telegramChatId: '' });

    // --- Firebase Sync ---
    useEffect(() => {
        firebaseService.initializeData().then(() => {
            console.log('Firebase data initialized/checked.');
        });

        firebaseService.subscribeToStock((data) => {
            if (data) setStock(data);
        });

        firebaseService.subscribeToTransactions((data) => {
            if (data) setTransactions(data);
        });

        firebaseService.subscribeToPalletRequests((data) => {
            if (data) setPalletRequests(data as PalletRequest[]);
        });

        firebaseService.subscribeToConfig((data) => {
            if (data) setConfig(data);
        });
    }, []);

    const generateDocNo = useCallback((type: TransactionType, source: string, dest: string, dateStr: string) => {
        const isSourceBranch = BRANCHES.some(b => b.id === source);
        const isDestBranch = BRANCHES.some(b => b.id === dest);

        let prefix = 'INT';
        if (type === 'ADJUST') {
            prefix = 'ADJ';
        } else if (isSourceBranch && isDestBranch) {
            prefix = 'INT';
        } else if (!isSourceBranch && isDestBranch) {
            prefix = 'EXT-IN';
        } else if (isSourceBranch && !isDestBranch) {
            prefix = 'EXT-OUT';
        }

        const datePart = dateStr.replace(/-/g, '');
        const existingDocNos = Array.from(new Set(transactions
            .filter(t => t.docNo && t.docNo.startsWith(`${prefix}-${datePart}`))
            .map(t => t.docNo)));
        const running = (existingDocNos.length + 1).toString().padStart(3, '0');

        return `${prefix}-${datePart}-${running}`;
    }, [transactions]);

    const generateRequestNo = useCallback((dateStr: string) => {
        const datePart = dateStr.replace(/-/g, '');
        const existingReqs = palletRequests.filter(r => r.requestNo.startsWith(`REQ-${datePart}`));
        const running = (existingReqs.length + 1).toString().padStart(3, '0');
        return `REQ-${datePart}-${running}`;
    }, [palletRequests]);

    const addTransaction = useCallback(async (txData: Partial<Transaction>) => {
        const dateStr = new Date().toISOString().split('T')[0];
        if (!txData.type || !txData.source || !txData.dest) return;

        // --- STRICT STOCK VALIDATION ---
        if (txData.type === 'OUT' && BRANCHES.some(b => b.id === txData.source)) {
            const sourceId = txData.source as BranchId;
            const palletId = txData.palletId as PalletId;
            const available = stock[sourceId]?.[palletId] || 0;
            const requested = txData.qty || 0;

            if (requested > available) {
                const branchName = BRANCHES.find(b => b.id === sourceId)?.name || sourceId;
                const palletName = PALLET_TYPES.find(p => p.id === palletId)?.name || palletId;
                throw new Error(`ไม่สามารถทำรายการได้เนื่องจากพาเลทไม่เพียงพอ: ${branchName} มี ${palletName} ในสต๊อก ${available} ตัว (ต้องการ ${requested} ตัว)`);
            }
        }

        const docNo = generateDocNo(txData.type, txData.source, txData.dest, dateStr);
        const isSourceBranch = BRANCHES.some(b => b.id === txData.source);
        const isDestBranch = BRANCHES.some(b => b.id === txData.dest);
        const isInternalTransfer = isSourceBranch && isDestBranch && txData.type === 'OUT';
        const status = isInternalTransfer ? 'PENDING' : 'COMPLETED';

        const newTx: Transaction = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            date: dateStr,
            docNo,
            type: txData.type,
            status,
            source: txData.source,
            dest: txData.dest,
            palletId: txData.palletId || 'unknown' as PalletId,
            qty: txData.qty || 0,
            note: txData.note,
            carRegistration: txData.carRegistration,
            vehicleType: txData.vehicleType,
            driverName: txData.driverName,
            transportCompany: txData.transportCompany,
            referenceDocNo: txData.referenceDocNo,
        } as Transaction;

        const nextStock = { ...stock };
        if (newTx.source && nextStock[newTx.source as BranchId]) {
            const s = { ...nextStock[newTx.source as BranchId] } as Record<PalletId, number>;
            s[newTx.palletId] = (s[newTx.palletId] || 0) - newTx.qty;
            nextStock[newTx.source as BranchId] = s;
        }
        if (status === 'COMPLETED' && newTx.dest && nextStock[newTx.dest as BranchId]) {
            const d = { ...nextStock[newTx.dest as BranchId] } as Record<PalletId, number>;
            d[newTx.palletId] = (d[newTx.palletId] || 0) + newTx.qty;
            nextStock[newTx.dest as BranchId] = d;
        }

        await firebaseService.addMovementBatch([newTx], nextStock);

        if (config?.telegramChatId) {
            const allEntities = [...BRANCHES, ...EXTERNAL_PARTNERS,
            { id: 'ADJUSTMENT', name: 'ปรับปรุงสต๊อก' },
            { id: 'maintenance_stock', name: 'คลังซ่อม' }
            ];
            const sourceName = allEntities.find(e => e.id === newTx.source)?.name || newTx.source;
            const destName = allEntities.find(e => e.id === newTx.dest)?.name || newTx.dest;
            const message = telegramService.formatMovementNotification({ ...newTx, items: [{ palletId: newTx.palletId, qty: newTx.qty }] }, sourceName, destName);
            telegramService.sendMessage(config.telegramChatId, message);
        }
    }, [stock, generateDocNo, config]);

    const confirmTransactionsBatch = useCallback(async (results: Transaction[]) => {
        const nextStock = { ...stock };
        const finalTxs: Transaction[] = [];

        results.forEach(item => {
            const originalTx = transactions.find(t => t.id === item.id);
            const isNew = !originalTx;

            let correctionNote = item.note || '';
            let originalPalletId: PalletId | undefined;
            let originalQty: number | undefined;

            if (!isNew && (item.palletId !== originalTx.palletId || item.qty !== originalTx.qty)) {
                const oldPalletName = PALLET_TYPES.find(p => p.id === originalTx.palletId)?.name || originalTx.palletId;
                const newPalletName = PALLET_TYPES.find(p => p.id === item.palletId)?.name || item.palletId;

                originalPalletId = originalTx.palletId;
                originalQty = originalTx.qty;

                const parts = [];
                if (item.palletId !== originalTx.palletId) parts.push(`เปลี่ยนประเภท: ${oldPalletName} -> ${newPalletName}`);
                if (item.qty !== originalTx.qty) parts.push(`แก้จำนวน: ${originalTx.qty} -> ${item.qty}`);

                correctionNote = `[แก้ไขการรับ] ${parts.join(', ')}` + (item.note ? ` | ${item.note}` : '');
            } else if (isNew) {
                correctionNote = `[รายการแยก] ` + (item.note || '');
            }

            const updatedTx: Transaction = {
                ...item,
                status: 'COMPLETED' as const,
                receivedAt: new Date().toISOString(),
                note: correctionNote,
                originalPalletId,
                originalQty
            };
            finalTxs.push(updatedTx);

            // Reconcile Source Stock if Pallet Type or Qty was changed during verification
            if (!isNew && (item.palletId !== originalTx.palletId || item.qty !== originalTx.qty)) {
                if (updatedTx.source && nextStock[updatedTx.source as BranchId]) {
                    const sId = updatedTx.source as BranchId;
                    const s = { ...nextStock[sId] } as Record<PalletId, number>;
                    // Rollback original deduction
                    s[originalTx.palletId] = (s[originalTx.palletId] || 0) + originalTx.qty;
                    // Apply actual deduction
                    s[item.palletId] = (s[item.palletId] || 0) - item.qty;
                    nextStock[sId] = s;
                }
            } else if (isNew) {
                // For new split items, deduct from source
                if (updatedTx.source && nextStock[updatedTx.source as BranchId]) {
                    const sId = updatedTx.source as BranchId;
                    const s = { ...nextStock[sId] } as Record<PalletId, number>;
                    s[item.palletId] = (s[item.palletId] || 0) - item.qty;
                    nextStock[sId] = s;
                }
            }

            // Always add to destination stock
            if (updatedTx.dest && nextStock[updatedTx.dest as BranchId]) {
                const dId = updatedTx.dest as BranchId;
                const d = { ...nextStock[dId] } as Record<PalletId, number>;
                d[updatedTx.palletId] = (d[updatedTx.palletId] || 0) + updatedTx.qty;
                nextStock[dId] = d;
            }
        });

        const originalGroupDocNo = results[0]?.docNo;
        if (originalGroupDocNo) {
            const originalGroupIds = transactions
                .filter(t => t.docNo === originalGroupDocNo && t.status === 'PENDING')
                .map(t => t.id);

            originalGroupIds.forEach(id => {
                if (!results.some(r => r.id === id)) {
                    const txToCancel = transactions.find(t => t.id === id);
                    if (txToCancel && txToCancel.source && nextStock[txToCancel.source as BranchId]) {
                        const sId = txToCancel.source as BranchId;
                        const s = { ...nextStock[sId] } as Record<PalletId, number>;
                        s[txToCancel.palletId] = (s[txToCancel.palletId] || 0) + txToCancel.qty;
                        nextStock[sId] = s;
                        finalTxs.push({ ...txToCancel, status: 'CANCELLED' });
                    }
                }
            });
        }

        if (finalTxs.length > 0) {
            await firebaseService.addMovementBatch(finalTxs, nextStock);

            if (config?.telegramChatId) {
                const docNo = finalTxs[0].docNo;
                const sourceName = BRANCHES.find(b => b.id === finalTxs[0].source)?.name || finalTxs[0].source;
                const destName = BRANCHES.find(b => b.id === finalTxs[0].dest)?.name || finalTxs[0].dest;
                const summaryData = {
                    type: 'IN',
                    docNo,
                    items: finalTxs.filter(t => t.status === 'COMPLETED').map(t => ({ palletId: t.palletId, qty: t.qty })),
                    referenceDocNo: finalTxs[0].referenceDocNo
                };
                const message = telegramService.formatMovementNotification(summaryData, sourceName, destName);
                telegramService.sendMessage(config.telegramChatId, message);
            }
        }
    }, [stock, transactions, config]);

    const confirmTransaction = useCallback((txId: number) => {
        const tx = transactions.find(t => t.id === txId);
        if (tx) confirmTransactionsBatch([tx]);
    }, [transactions, confirmTransactionsBatch]);

    const deleteTransaction = useCallback(async (txId: number) => {
        const tx = transactions.find(t => t.id === txId);
        if (!tx || tx.status === 'CANCELLED') return;

        const nextStock = { ...stock };
        if (tx.source && BRANCHES.some(b => b.id === tx.source)) {
            const bId = tx.source as BranchId;
            const s = { ...nextStock[bId] } as Record<PalletId, number>;
            s[tx.palletId] = (s[tx.palletId] || 0) + tx.qty;
            nextStock[bId] = s;
        }
        if (tx.status === 'COMPLETED' && tx.dest && BRANCHES.some(b => b.id === tx.dest)) {
            const dId = tx.dest as BranchId;
            const d = { ...nextStock[dId] } as Record<PalletId, number>;
            d[tx.palletId] = Math.max(0, (d[tx.palletId] || 0) - tx.qty);
            nextStock[dId] = d;
        }

        const updatedTx = { ...tx, status: 'CANCELLED' as const };
        await firebaseService.addMovementBatch([updatedTx], nextStock);
    }, [transactions, stock]);

    const addMovementBatch = useCallback(async (data: {
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
        note?: string;
    }) => {
        // --- STRICT STOCK VALIDATION ---
        if (data.type === 'OUT' && BRANCHES.some(b => b.id === data.source)) {
            const sourceId = data.source as BranchId;
            data.items.forEach(item => {
                const available = stock[sourceId]?.[item.palletId] || 0;
                if (item.qty > available) {
                    const branchName = BRANCHES.find(b => b.id === sourceId)?.name || sourceId;
                    const palletName = PALLET_TYPES.find(p => p.id === item.palletId)?.name || item.palletId;
                    throw new Error(`ไม่สามารถทำรายการได้เนื่องจากพาเลทไม่เพียงพอ: ${branchName} มี ${palletName} ในสต๊อก ${available} ตัว (ต้องการ ${item.qty} ตัว)`);
                }
            });
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const docNo = data.docNo || generateDocNo(data.type, data.source, data.dest, dateStr);
        const isSourceBranch = BRANCHES.some(b => b.id === data.source);
        const isDestBranch = BRANCHES.some(b => b.id === data.dest);
        const isInternalTransfer = isSourceBranch && isDestBranch && data.type === 'OUT';
        const status = isInternalTransfer ? 'PENDING' : 'COMPLETED';

        const newTransactions: Transaction[] = [];
        const nextStock = { ...stock };
        const baseId = Date.now() + Math.floor(Math.random() * 1000);

        data.items.forEach((item, index) => {
            const newTx: Transaction = {
                id: baseId + index,
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
                note: data.note,
            } as Transaction;

            newTransactions.push(newTx);

            if (data.source && nextStock[data.source as BranchId]) {
                const s = { ...nextStock[data.source as BranchId] } as Record<PalletId, number>;
                s[item.palletId] = (s[item.palletId] || 0) - item.qty;
                nextStock[data.source as BranchId] = s;
            }
            if (status === 'COMPLETED' && data.dest && nextStock[data.dest as BranchId]) {
                const d = { ...nextStock[data.dest as BranchId] } as Record<PalletId, number>;
                d[item.palletId] = (d[item.palletId] || 0) + item.qty;
                nextStock[data.dest as BranchId] = d;
            }
        });

        await firebaseService.addMovementBatch(newTransactions, nextStock);

        if (config?.telegramChatId) {
            const allEntities = [...BRANCHES, ...EXTERNAL_PARTNERS, { id: 'maintenance_stock', name: 'คลังซ่อม' }];
            const sourceName = allEntities.find(e => e.id === data.source)?.name || data.source;
            const destName = allEntities.find(e => e.id === data.dest)?.name || data.dest;

            if (data.referenceDocNo?.startsWith('REQ-')) {
                const message = telegramService.formatShipmentNotification({ requestNo: data.referenceDocNo, items: data.items }, docNo, sourceName, destName, data);
                telegramService.sendMessage(config.telegramChatId, message);
            } else {
                const message = telegramService.formatMovementNotification(data, sourceName, destName);
                telegramService.sendMessage(config.telegramChatId, message);
            }
        }
    }, [stock, generateDocNo, config]);

    const processBatchMaintenance = useCallback(async (data: {
        items: { palletId: PalletId; qty: number }[];
        fixedQty: number;
        scrappedQty: number;
        note: string;
        branchId: BranchId;
        targetBranchId?: BranchId;
    }) => {
        // --- STRICT STOCK VALIDATION ---
        data.items.forEach(item => {
            const available = stock[data.branchId]?.[item.palletId] || 0;
            if (item.qty > available) {
                const branchName = BRANCHES.find(b => b.id === data.branchId)?.name || data.branchId;
                const palletName = PALLET_TYPES.find(p => p.id === item.palletId)?.name || item.palletId;
                throw new Error(`ไม่สามารถทำรายการซ่อมได้เนื่องจากพาเลทไม่เพียงพอ: ${branchName} มี ${palletName} ในสต๊อก ${available} ตัว (ต้องการ ${item.qty} ตัว)`);
            }
        });

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
            palletId: 'general',
            qty: totalProcessed,
            action: 'REPAIR_CONVERT',
            note: data.note,
            noteExtended: `Batch: ${data.items.map((i) => `${i.palletId} ${i.qty}`).join(', ')} | Fixed: ${data.fixedQty}, Scrap: ${data.scrappedQty}`,
            qtyRepaired: data.fixedQty,
            targetPallet: 'general',
        } as Transaction;

        const nextStock = { ...stock };
        if (nextStock[data.branchId]) {
            const s = { ...nextStock[data.branchId] } as Record<PalletId, number>;
            data.items.forEach((item) => {
                s[item.palletId] = (s[item.palletId] || 0) - item.qty;
            });
            nextStock[data.branchId] = s;
        }
        if (nextStock[targetBranch]) {
            const t = { ...nextStock[targetBranch] } as Record<PalletId, number>;
            if (data.fixedQty > 0) t['general'] = (t['general'] || 0) + data.fixedQty;
            nextStock[targetBranch] = t;
        }

        await firebaseService.addMovementBatch([newTx], nextStock);
    }, [stock, transactions]);

    const createPalletRequest = useCallback(async (reqData: Partial<PalletRequest>) => {
        const dateStr = new Date().toISOString().split('T')[0];
        const requestNo = generateRequestNo(dateStr);

        const newReq: PalletRequest = {
            id: Date.now().toString(),
            date: dateStr,
            requestNo,
            branchId: reqData.branchId || 'hub_nw',
            items: reqData.items || [],
            targetBranchId: reqData.targetBranchId,
            purpose: reqData.purpose || '',
            priority: reqData.priority || 'NORMAL',
            status: 'PENDING',
            note: reqData.note || '',
        };

        await firebaseService.updatePalletRequest(newReq);

        if (config?.telegramChatId) {
            const branchName = BRANCHES.find(b => b.id === newReq.branchId)?.name || 'Unknown';
            const allEntities = [...BRANCHES, ...EXTERNAL_PARTNERS];
            const targetName = allEntities.find(d => d.id === newReq.targetBranchId)?.name;
            const message = telegramService.formatPalletRequest(newReq, branchName, targetName);
            telegramService.sendMessage(config.telegramChatId, message);
        }
    }, [generateRequestNo, config]);

    const updatePalletRequest = useCallback(async (req: PalletRequest) => {
        await firebaseService.updatePalletRequest(req);
    }, []);

    const getStockForBranch = useCallback((branchId: BranchId) => stock[branchId] || {}, [stock]);

    const updateSystemConfig = async (newConfig: Partial<{ telegramChatId: string }>) => {
        await firebaseService.updateConfig(newConfig);
    };

    return (
        <StockContext.Provider
            value={{
                stock,
                transactions,
                addTransaction,
                addMovementBatch,
                confirmTransaction,
                confirmTransactionsBatch,
                deleteTransaction,
                processBatchMaintenance,
                getStockForBranch,
                palletRequests,
                createPalletRequest,
                updatePalletRequest: updatePalletRequest,
                config,
                updateSystemConfig
            }}
        >
            {children}
        </StockContext.Provider>
    );
};
