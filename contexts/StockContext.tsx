import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Stock, Transaction, BranchId, PalletId, TransactionType, PalletRequest, PalletRequestType, Branch, Partner, PalletType } from '../types';
import { INITIAL_STOCK, INITIAL_TRANSACTIONS, BRANCHES, EXTERNAL_PARTNERS, PALLET_TYPES } from '../constants';
import * as firebaseService from '../services/firebase';
import * as telegramService from '../services/telegramService';
import { calculatePartnerBalance } from '../utils/businessLogic';
import {
    createMovementMutator,
    createConfirmReceiveMutator,
    createCancelMutator,
    createSetStockMutator,
    createTxOnlyMutator,
    createMaintenanceMutator,
} from '../utils/stockMutation';

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
    processScrapSale: (data: { palletId: PalletId; qty: number; revenue: number; note?: string }) => Promise<void>;
    processScrapDiscard: (data: { palletId: PalletId; qty: number; note?: string }) => Promise<void>;
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

        await firebaseService.commitStockMutation(createMovementMutator([newTx]));
    }, [generateDocNo]);

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

        // ใช้ runTransaction: การตรวจสต็อกและการหักยอดเกิดขึ้นบน "ข้อมูลสด" ภายใน
        // transaction เดียวกัน จึงกันกรณีสองสาขาตัดสต็อกก้อนเดียวกันพร้อมกันได้
        await firebaseService.commitStockMutation(createMovementMutator(batchTxs));

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
        await firebaseService.commitStockMutation(
            createConfirmReceiveMutator(results, originalTxs)
        );
    }, []);

    const confirmTransaction = useCallback(async (txId: number) => {
        const tx = transactions.find(t => t.id === txId);
        if (!tx || tx.status === 'COMPLETED') return;
        await firebaseService.commitStockMutation(createConfirmReceiveMutator([tx]));
    }, [transactions]);

    const deleteTransaction = useCallback(async (txId: number) => {
        // ค้นหาแถวที่จะยกเลิกภายใน transaction (จากข้อมูลสด) เพื่อกันการยกเลิกซ้ำ
        await firebaseService.commitStockMutation(createCancelMutator(txId));
    }, []);

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

        await firebaseService.commitStockMutation(createMaintenanceMutator({
            branchId: data.branchId,
            items: data.items,
            fixedQty: data.fixedQty,
            targetPalletId: (data.targetPalletId || 'general') as PalletId,
            scrappedQty: data.scrappedQty,
            auditTx: newTx,
        }));

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

        if (isBranch) {
            await firebaseService.commitStockMutation(
                createSetStockMutator(data.targetId, data.palletId, data.newQty, [adjTx])
            );
        } else {
            // ยอดคู่ค้าคำนวณจากรายการเคลื่อนไหว ไม่มีช่องสต็อกให้ตั้งค่าโดยตรง
            await firebaseService.commitStockMutation(createTxOnlyMutator([adjTx]));
        }
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
        await firebaseService.commitStockMutation(
            createSetStockMutator(data.targetId, data.palletId, data.calculatedStock)
        );
        console.log(`[Reconcile] ${data.targetId}/${data.palletId}: stock → ${data.calculatedStock} (by ${data.userName})`);
    }, []);

    const processScrapSale = useCallback(async (data: { palletId: PalletId; qty: number; revenue: number; note?: string }) => {
        const now = new Date();
        const docNo = generateDocNo('SCRAP_SALE' as any, 'scrap_stock', 'scrap_stock', now.toISOString().split('T')[0]);
        const tx: Transaction = {
            id: Date.now(), date: now.toISOString(), docNo, type: 'SCRAP_SALE', status: 'COMPLETED',
            source: 'scrap_stock', dest: 'SOLD', palletId: data.palletId, qty: data.qty,
            note: data.note || 'ขายซาก', scrapRevenue: data.revenue,
        } as Transaction;
        await firebaseService.commitStockMutation(createMovementMutator([tx]));
        if (config.telegramChatId) {
            try {
                const palletName = PALLET_TYPES.find((p: PalletType) => p.id === data.palletId)?.name || data.palletId;
                const message = `🏷️ *ขายซาก*\n${palletName}: ${data.qty} ตัว\nรายได้: ${data.revenue.toLocaleString()} บาท`;
                await telegramService.sendMessage(config.telegramChatId, message);
            } catch (err) { console.error('Failed to send scrap sale notification:', err); }
        }
    }, [stock, generateDocNo, config.telegramChatId]);

    const processScrapDiscard = useCallback(async (data: { palletId: PalletId; qty: number; note?: string }) => {
        const now = new Date();
        const docNo = generateDocNo('SCRAP_DISCARD' as any, 'scrap_stock', 'scrap_stock', now.toISOString().split('T')[0]);
        const tx: Transaction = {
            id: Date.now(), date: now.toISOString(), docNo, type: 'SCRAP_DISCARD', status: 'COMPLETED',
            source: 'scrap_stock', dest: 'DISCARDED', palletId: data.palletId, qty: data.qty,
            note: data.note || 'ทิ้ง/เสีย',
        } as Transaction;
        await firebaseService.commitStockMutation(createMovementMutator([tx]));
    }, [generateDocNo]);

    const updateTransaction = useCallback(async (tx: Transaction) => {
        // แก้ไขข้อมูลเอกสารอย่างเดียว ไม่กระทบยอดสต็อก
        await firebaseService.commitStockMutation(createTxOnlyMutator([tx]));

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
                updateTransaction, reconcileStock, processScrapSale, processScrapDiscard, isDataLoaded
            }}
        >
            {children}
        </StockContext.Provider>
    );
};
