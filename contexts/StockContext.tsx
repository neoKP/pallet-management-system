import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Stock, Transaction, BranchId, PalletId, TransactionType, PalletRequest, PalletRequestType, Branch, Partner, PalletType } from '../types';
import { INITIAL_STOCK, INITIAL_TRANSACTIONS, BRANCHES, EXTERNAL_PARTNERS, PALLET_TYPES } from '../constants';
import * as firebaseService from '../services/firebase';
import * as telegramService from '../services/telegramService';
import { calculatePartnerBalance } from '../utils/businessLogic';

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
    confirmTransactionsBatch: (results: Transaction[], originalTxs?: Transaction[]) => void;
    deleteTransaction: (txId: number) => void;
    processBatchMaintenance: (data: {
        items: { palletId: PalletId; qty: number }[];
        fixedQty: number;
        scrappedQty: number;
        note: string;
        branchId: BranchId;
        targetBranchId?: BranchId;
        targetPalletId?: PalletId;
        scrapRevenue?: number;
    }) => void;
    getStockForBranch: (branchId: BranchId) => Record<PalletId, number>;
    palletRequests: PalletRequest[];
    createPalletRequest: (data: Partial<PalletRequest>) => Promise<void>;
    updatePalletRequest: (req: PalletRequest) => Promise<void>;
    config: { telegramChatId: string };
    updateSystemConfig: (newConfig: Partial<{ telegramChatId: string }>) => Promise<void>;
    adjustStock: (data: {
        targetId: string;
        palletId: PalletId;
        newQty: number;
        reason: string;
        userName: string;
        isInitial?: boolean;
        customDate?: string;
    }) => Promise<void>;
    thresholds: any;
    updateThresholds: (data: any) => Promise<void>;
    updateTransaction: (tx: Transaction) => void;
    reconcileStock: (data: { targetId: string; palletId: PalletId; calculatedStock: number; userName: string }) => Promise<void>;
    isDataLoaded: boolean; // Loading Guard: ข้อมูลโหลดเสร็จหรือยัง
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
    const [thresholds, setThresholds] = useState<any>(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false); // Loading Guard

    useEffect(() => {
        let stockLoaded = false;
        let transactionsLoaded = false;

        const checkAllLoaded = () => {
            if (stockLoaded && transactionsLoaded) {
                setIsDataLoaded(true);
                console.log('✅ All data loaded from Firebase');
            }
        };

        firebaseService.initializeData().then(() => {
            console.log('Firebase data initialized/checked.');
        });
        firebaseService.subscribeToStock((data: Stock) => {
            if (data) {
                setStock(data);
                stockLoaded = true;
                checkAllLoaded();
            }
        });
        firebaseService.subscribeToTransactions((data: Transaction[]) => {
            if (data) {
                setTransactions(data);
                transactionsLoaded = true;
                checkAllLoaded();
            }
        });
        firebaseService.subscribeToPalletRequests((data: any[]) => {
            if (data) setPalletRequests(data as PalletRequest[]);
        });
        firebaseService.subscribeToConfig((data: any) => {
            if (data) setConfig(data);
        });
        firebaseService.subscribeToThresholds((data: any) => {
            if (data) setThresholds(data);
        });
    }, []);

    const generateDocNo = useCallback((type: TransactionType, source: string, dest: string, dateStr: string) => {
        const isSourceBranch = BRANCHES.some((b: Branch) => b.id === source);
        const isDestBranch = BRANCHES.some((b: Branch) => b.id === dest);
        let prefix = type === 'ADJUST' ? 'ADJ' : (isSourceBranch && isDestBranch ? 'INT' : (!isSourceBranch && isDestBranch ? 'EXT-IN' : 'EXT-OUT'));
        const datePart = dateStr.replace(/-/g, '');
        const existingDocNos = Array.from(new Set(transactions.filter(t => t.docNo && t.docNo.startsWith(`${prefix}-${datePart}`)).map(t => t.docNo)));
        const running = (existingDocNos.length + 1).toString().padStart(3, '0');
        return `${prefix}-${datePart}-${running}`;
    }, [transactions]);

    const generateRequestNo = useCallback((dateStr: string, requestType: PalletRequestType = 'PUSH') => {
        const datePart = dateStr.replace(/-/g, '');
        const prefix = requestType === 'PULL' ? 'REQ-PULL' : 'REQ-PUSH';
        const existingReqs = palletRequests.filter(r => r.requestNo.startsWith(`${prefix}-${datePart}`));
        const running = (existingReqs.length + 1).toString().padStart(3, '0');
        return `${prefix}-${datePart}-${running}`;
    }, [palletRequests]);

    const addTransaction = useCallback(async (txData: Partial<Transaction>) => {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timestamp = now.toISOString();
        if (!txData.type || !txData.source || !txData.dest) return;

        const docNo = generateDocNo(txData.type as TransactionType, txData.source, txData.dest, dateStr);
        const status = (BRANCHES.some((b: Branch) => b.id === txData.source) && BRANCHES.some((b: Branch) => b.id === txData.dest)) ? 'PENDING' : 'COMPLETED';

        const newTx: Transaction = {
            id: Date.now() + Math.floor(Math.random() * 1000), date: timestamp, docNo, type: txData.type as TransactionType,
            status, source: txData.source, dest: txData.dest, palletId: txData.palletId as PalletId, qty: txData.qty || 0,
            note: txData.note, carRegistration: txData.carRegistration, vehicleType: txData.vehicleType,
            driverName: txData.driverName, transportCompany: txData.transportCompany, referenceDocNo: txData.referenceDocNo,
        } as Transaction;

        const nextStock = { ...stock };
        if (nextStock[newTx.source as BranchId]) {
            const s = { ...nextStock[newTx.source as BranchId] } as any;
            s[newTx.palletId] -= newTx.qty;
            nextStock[newTx.source as BranchId] = s;
        }
        if (status === 'COMPLETED' && nextStock[newTx.dest as BranchId]) {
            const d = { ...nextStock[newTx.dest as BranchId] } as any;
            d[newTx.palletId] += newTx.qty;
            nextStock[newTx.dest as BranchId] = d;
        }
        await firebaseService.addMovementBatch([newTx], nextStock);
    }, [stock, generateDocNo]);

    const addMovementBatch = useCallback(async (data: any) => {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timestamp = now.toISOString();

        const docNo = data.docNo || generateDocNo(data.type, data.source, data.dest, dateStr);
        const status = (BRANCHES.some((b: Branch) => b.id === data.source) && BRANCHES.some((b: Branch) => b.id === data.dest)) ? 'PENDING' : 'COMPLETED';

        const batchTxs = data.items.map((item: any) => ({
            id: Date.now() + Math.floor(Math.random() * 1000000), date: timestamp, docNo, type: data.type, status,
            source: data.source, dest: data.dest, palletId: item.palletId, qty: item.qty,
            carRegistration: data.carRegistration, vehicleType: data.vehicleType, driverName: data.driverName,
            transportCompany: data.transportCompany, referenceDocNo: data.referenceDocNo, note: data.note
        } as Transaction));

        const nextStock = { ...stock };
        // Validation: ป้องกัน stock ติดลบ (เฉพาะ source ที่เป็น branch)
        const isBranchSource = BRANCHES.some((b: Branch) => b.id === data.source);
        if (isBranchSource && data.type !== 'ADJUST') {
            for (const tx of batchTxs) {
                const currentQty = (nextStock[tx.source as BranchId] as any)?.[tx.palletId] || 0;
                if (currentQty < tx.qty) {
                    const palletName = PALLET_TYPES.find((p: PalletType) => p.id === tx.palletId)?.name || tx.palletId;
                    const branchName = BRANCHES.find((b: Branch) => b.id === tx.source)?.name || tx.source;
                    throw new Error(`สต็อกไม่เพียงพอ: ${branchName} มี ${palletName} เหลือ ${currentQty} แต่ต้องการจ่าย ${tx.qty}`);
                }
            }
        }
        batchTxs.forEach((tx: any) => {
            if (nextStock[tx.source as BranchId]) {
                const s = { ...nextStock[tx.source as BranchId] } as any;
                s[tx.palletId] -= tx.qty;
                nextStock[tx.source as BranchId] = s;
            }
            if (status === 'COMPLETED' && nextStock[tx.dest as BranchId]) {
                const d = { ...nextStock[tx.dest as BranchId] } as any;
                d[tx.palletId] += tx.qty;
                nextStock[tx.dest as BranchId] = d;
            }
        });
        await firebaseService.addMovementBatch(batchTxs, nextStock);

        if (config.telegramChatId) {
            try {
                const sourceName = BRANCHES.find((b: Branch) => b.id === data.source)?.name ||
                    EXTERNAL_PARTNERS.find((p: Partner) => p.id === data.source)?.name || data.source;
                const destName = BRANCHES.find((b: Branch) => b.id === data.dest)?.name ||
                    EXTERNAL_PARTNERS.find((p: Partner) => p.id === data.dest)?.name || data.dest;

                const message = telegramService.formatMovementNotification({
                    type: data.type,
                    docNo,
                    items: data.items,
                    referenceDocNo: data.referenceDocNo,
                    carRegistration: data.carRegistration,
                    vehicleType: data.vehicleType,
                    driverName: data.driverName,
                    transportCompany: data.transportCompany
                }, sourceName, destName);

                await telegramService.sendMessage(config.telegramChatId, message);
            } catch (err) {
                console.error('Failed to send Telegram notification:', err);
            }
        }
    }, [stock, generateDocNo, config.telegramChatId]);

    const confirmTransactionsBatch = useCallback(async (results: Transaction[], originalTxs?: Transaction[]) => {
        const nextStock = { ...stock };
        const finalTxs: Transaction[] = [];

        // Step 1: คืน stock source ตามยอดเดิมที่หักไปตอน PENDING
        if (originalTxs && originalTxs.length > 0) {
            originalTxs.forEach(origTx => {
                if (nextStock[origTx.source as BranchId]) {
                    const s = { ...nextStock[origTx.source as BranchId] } as any;
                    s[origTx.palletId] += origTx.qty;
                    nextStock[origTx.source as BranchId] = s;
                }
            });
        }

        results.forEach(item => {
            const utx = { ...item, status: 'COMPLETED' as const, receivedAt: new Date().toISOString() } as Transaction;

            // บันทึก originalPalletId/originalQty เมื่อมีการเปลี่ยนแปลงจากยอดเดิม
            if (originalTxs) {
                const origTx = originalTxs.find(o => o.id === item.id);
                if (origTx && (origTx.palletId !== item.palletId || origTx.qty !== item.qty)) {
                    utx.originalPalletId = origTx.palletId;
                    utx.originalQty = origTx.qty;
                }
            }

            finalTxs.push(utx);

            // Step 2: หัก source ตามยอดรับจริง (เฉพาะเมื่อมี originalTxs = มีการ adjust)
            if (originalTxs && nextStock[utx.source as BranchId]) {
                const s = { ...nextStock[utx.source as BranchId] } as any;
                s[utx.palletId] -= utx.qty;
                nextStock[utx.source as BranchId] = s;
            }

            // Step 3: เพิ่ม dest ตามยอดรับจริง
            if (nextStock[utx.dest as BranchId]) {
                const d = { ...nextStock[utx.dest as BranchId] } as any;
                d[utx.palletId] += utx.qty;
                nextStock[utx.dest as BranchId] = d;
            }
        });
        await firebaseService.addMovementBatch(finalTxs, nextStock);
    }, [stock]);

    const confirmTransaction = useCallback(async (txId: number) => {
        const tx = transactions.find(t => t.id === txId);
        if (!tx || tx.status === 'COMPLETED') return;
        const utx = { ...tx, status: 'COMPLETED' as const, receivedAt: new Date().toISOString() };
        const nextStock = { ...stock };
        if (nextStock[utx.dest as BranchId]) {
            const d = { ...nextStock[utx.dest as BranchId] } as any;
            d[utx.palletId] += utx.qty;
            nextStock[utx.dest as BranchId] = d;
        }
        await firebaseService.addMovementBatch([utx], nextStock);
    }, [stock, transactions]);

    const deleteTransaction = useCallback(async (txId: number) => {
        const tx = transactions.find(t => t.id === txId);
        if (!tx) return;
        const utx = { ...tx, status: 'CANCELLED' as const };
        const nextStock = { ...stock };
        if (nextStock[tx.source as BranchId]) {
            const s = { ...nextStock[tx.source as BranchId] } as any;
            s[tx.palletId] += tx.qty;
            nextStock[tx.source as BranchId] = s;
        }
        if (tx.status === 'COMPLETED' && nextStock[tx.dest as BranchId]) {
            const d = { ...nextStock[tx.dest as BranchId] } as any;
            d[tx.palletId] -= tx.qty;
            nextStock[tx.dest as BranchId] = d;
        }
        await firebaseService.addMovementBatch([utx], nextStock);
    }, [stock, transactions]);

    const processBatchMaintenance = useCallback(async (data: {
        items: { palletId: PalletId; qty: number }[];
        fixedQty: number;
        scrappedQty: number;
        note: string;
        branchId: BranchId;
        targetBranchId?: BranchId;
        targetPalletId?: PalletId;
        scrapRevenue?: number;
    }) => {
        const now = new Date();
        const docNo = generateDocNo('MAINTENANCE', data.branchId, data.branchId, now.toISOString().split('T')[0]);
        const newTx: Transaction = {
            id: Date.now(), date: now.toISOString(), docNo, type: 'MAINTENANCE', status: 'COMPLETED',
            source: data.branchId, dest: data.branchId, palletId: data.targetPalletId || 'general',
            qty: data.fixedQty, note: data.note, noteExtended: `SCRAP: ${data.scrappedQty}`,
            scrapRevenue: data.scrapRevenue
        } as Transaction;

        const nextStock = { ...stock };
        if (nextStock[data.branchId as BranchId]) {
            const s = { ...nextStock[data.branchId as BranchId] } as Record<PalletId, number>;
            data.items.forEach((i: { palletId: PalletId; qty: number }) => {
                if (s[i.palletId]) s[i.palletId] -= i.qty;
                else s[i.palletId] = -i.qty;
            });
            if (s[newTx.palletId as PalletId]) s[newTx.palletId as PalletId] += data.fixedQty;
            else s[newTx.palletId as PalletId] = data.fixedQty;
            nextStock[data.branchId as BranchId] = s;
        }
        await firebaseService.addMovementBatch([newTx], nextStock);

        if (config.telegramChatId) {
            try {
                const branchName = BRANCHES.find(b => b.id === data.branchId)?.name || data.branchId;
                const message = telegramService.formatMaintenanceNotification(newTx, data.scrappedQty, branchName);
                await telegramService.sendMessage(config.telegramChatId, message);
            } catch (err) {
                console.error('Failed to send Telegram maintenance notification:', err);
            }
        }
    }, [stock, generateDocNo, config.telegramChatId]);

    const createPalletRequest = useCallback(async (req: any) => {
        const dateStr = new Date().toISOString().split('T')[0];
        const nreq = { ...req, id: Date.now().toString(), date: dateStr, requestNo: generateRequestNo(dateStr, req.requestType), status: 'PENDING' };
        await firebaseService.updatePalletRequest(nreq);
    }, [generateRequestNo]);

    const updatePalletRequest = useCallback(async (req: any) => {
        await firebaseService.updatePalletRequest(req);
    }, []);

    const updateSystemConfig = async (newConfig: any) => {
        await firebaseService.updateConfig(newConfig);
    };

    const adjustStock = useCallback(async (data: {
        targetId: string;
        palletId: PalletId;
        newQty: number;
        reason: string;
        userName: string;
        isInitial?: boolean;
        customDate?: string;
    }) => {
        const now = new Date();
        const ts = data.customDate ? new Date(data.customDate).toISOString() : now.toISOString();
        const isBranch = BRANCHES.some((b: Branch) => b.id === data.targetId);
        const currentQty = isBranch ? (stock[data.targetId as BranchId]?.[data.palletId as PalletId] || 0) : calculatePartnerBalance(transactions, data.targetId, data.palletId);
        const delta = data.newQty - currentQty;
        if (delta === 0) return;

        const docNo = `ADJ-${ts.split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 1000)}`;
        const adjTx: Transaction = {
            id: Date.now(), date: ts, docNo, type: 'ADJUST', status: 'COMPLETED',
            source: delta > 0 ? 'SYSTEM_ADJUSTMENT' : data.targetId, dest: delta > 0 ? data.targetId : 'SYSTEM_ADJUSTMENT',
            palletId: data.palletId, qty: Math.abs(delta), note: data.reason, previousQty: currentQty, adjustedBy: data.userName, isInitial: data.isInitial
        } as Transaction;

        const nextStock = { ...stock };
        if (isBranch) {
            const s = { ...nextStock[data.targetId as BranchId] } as any;
            s[data.palletId] = data.newQty;
            nextStock[data.targetId as BranchId] = s;
        }
        await firebaseService.addMovementBatch([adjTx], nextStock);
    }, [stock, transactions]);

    const reconcileStock = useCallback(async (data: {
        targetId: string;
        palletId: PalletId;
        calculatedStock: number;
        userName: string;
    }) => {
        const isBranch = BRANCHES.some((b: Branch) => b.id === data.targetId);
        if (!isBranch) return;

        // Reconcile: เปลี่ยน stock จริง (Firebase) ให้ตรงกับยอดคำนวณจาก transactions
        const nextStock = { ...stock };
        const s = { ...nextStock[data.targetId as BranchId] } as any;
        s[data.palletId] = data.calculatedStock;
        nextStock[data.targetId as BranchId] = s;
        await firebaseService.addMovementBatch([], nextStock);
        console.log(`[Reconcile] ${data.targetId}/${data.palletId}: stock → ${data.calculatedStock} (by ${data.userName})`);
    }, [stock]);

    const updateTransaction = useCallback(async (tx: Transaction) => {
        await firebaseService.addMovementBatch([tx], stock);

        if (config.telegramChatId && tx.scrapRevenue) {
            try {
                const message = telegramService.formatScrapSaleNotification(tx, tx.scrapRevenue);
                await telegramService.sendMessage(config.telegramChatId, message);
            } catch (err) {
                console.error('Failed to send Telegram scrap sale notification:', err);
            }
        }
    }, [stock, config.telegramChatId]);

    return (
        <StockContext.Provider
            value={{
                stock, transactions, addTransaction, addMovementBatch, confirmTransaction,
                confirmTransactionsBatch, deleteTransaction, processBatchMaintenance,
                getStockForBranch: (id: BranchId) => stock[id] || {}, palletRequests, createPalletRequest,
                updatePalletRequest, config, updateSystemConfig, adjustStock,
                thresholds, updateThresholds: firebaseService.updateThresholds,
                updateTransaction, reconcileStock, isDataLoaded
            }}
        >
            {children}
        </StockContext.Provider>
    );
};
