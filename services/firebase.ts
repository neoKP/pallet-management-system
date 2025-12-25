import { Stock, Transaction, PalletType, Branch, Partner } from '../types';
import { INITIAL_STOCK, INITIAL_TRANSACTIONS, PALLET_TYPES, BRANCHES, EXTERNAL_PARTNERS } from '../constants';

// Declare global firebase instance interface
declare global {
    interface Window {
        firebase: {
            database: () => any;
            utils: {
                ref: (db: any, path: string) => any;
                onValue: (ref: any, callback: (snapshot: any) => void) => any;
                set: (ref: any, value: any) => Promise<void>;
                push: (ref: any, value: any) => Promise<any>;
                update: (ref: any, updates: any) => Promise<void>;
                get: (ref: any) => Promise<any>;
                child: (ref: any, path: string) => any;
            };
        };
    }
}

// Helper to get database instance
const getDb = () => {
    if (!window.firebase) {
        throw new Error("Firebase not initialized");
    }
    return window.firebase.database();
};

const getUtils = () => {
    if (!window.firebase?.utils) {
        throw new Error("Firebase utils not initialized");
    }
    return window.firebase.utils;
};

// Initialize/Seed Data if empty
export const initializeData = async () => {
    try {
        const db = getDb();
        const { ref, get, set, child } = getUtils();

        // Check stock
        const stockRef = ref(db, 'stock');
        const stockSnap = await get(stockRef);

        if (!stockSnap.exists()) {
            console.log('Seeding initial stock data...');
            await set(stockRef, INITIAL_STOCK);
        } else {
            // Check for legacy mock data signature and clear it
            const val = stockSnap.val();
            if (val.hub_nks?.loscam_red === 150 && val.sai3?.loscam_red === 20) {
                console.log('Detected mock stock data. Clearing...');
                await set(stockRef, INITIAL_STOCK);
            }
        }

        // Check transactions
        const txRef = ref(db, 'transactions');
        const txSnap = await get(txRef);

        if (!txSnap.exists()) {
            console.log('Seeding initial transaction data...');
            await set(txRef, INITIAL_TRANSACTIONS);
        } else {
            // Check for legacy mock transaction signature and clear it
            const val = txSnap.val();
            if (val) {
                const txs = Array.isArray(val) ? val : Object.values(val);
                // Check for specific mock docNo
                const hasMockTx = txs.some((t: any) => t.docNo === 'EXT-IN-20231025-001');
                if (hasMockTx) {
                    console.log('Detected mock transaction data. Clearing...');
                    await set(txRef, INITIAL_TRANSACTIONS);
                }
            }
        }

        // Check Master Data: Pallets
        const palletsRef = ref(db, 'pallets');
        const palletsSnap = await get(palletsRef);
        if (!palletsSnap.exists()) {
            console.log('Seeding initial pallets data...');
            await set(palletsRef, PALLET_TYPES);
        }

        // Check Master Data: Branches
        const branchesRef = ref(db, 'branches');
        const branchesSnap = await get(branchesRef);
        if (!branchesSnap.exists()) {
            console.log('Seeding initial branches data...');
            await set(branchesRef, BRANCHES);
        }

        // Check Master Data: Partners
        const partnersRef = ref(db, 'partners');
        const partnersSnap = await get(partnersRef);
        if (!partnersSnap.exists()) {
            console.log('Seeding initial partners data...');
            await set(partnersRef, EXTERNAL_PARTNERS);
        }

    } catch (error) {
        console.error("Error initializing data:", error);
    }
};

export const subscribeToStock = (callback: (stock: Stock) => void) => {
    try {
        const db = getDb();
        const { ref, onValue } = getUtils();
        const stockRef = ref(db, 'stock');

        return onValue(stockRef, (snapshot) => {
            const val = snapshot.val();
            if (val) callback(val);
        });
    } catch (error) {
        console.error("Error subscribing to stock:", error);
        return () => { };
    }
};

export const subscribeToTransactions = (callback: (transactions: Transaction[]) => void) => {
    try {
        const db = getDb();
        const { ref, onValue } = getUtils();
        const txRef = ref(db, 'transactions');

        return onValue(txRef, (snapshot) => {
            const val = snapshot.val();
            if (val) {
                // Return as array regardless of storage format
                const txArray = Array.isArray(val) ? val : Object.values(val);
                callback(txArray as Transaction[]);
            } else {
                callback([]);
            }
        });
    } catch (error) {
        console.error("Error subscribing to transactions:", error);
        return () => { };
    }
};

// --- Master Data Subscriptions ---

export const subscribeToPallets = (callback: (pallets: PalletType[]) => void) => {
    try {
        const db = getDb();
        const { ref, onValue } = getUtils();
        const refPath = ref(db, 'pallets');

        return onValue(refPath, (snapshot) => {
            const val = snapshot.val();
            if (val) {
                const arr = Array.isArray(val) ? val : Object.values(val);
                callback(arr as PalletType[]);
            } else {
                callback([]);
            }
        });
    } catch (error) {
        console.error("Error subscribing to pallets:", error);
        return () => { };
    }
};

export const subscribeToBranches = (callback: (branches: Branch[]) => void) => {
    try {
        const db = getDb();
        const { ref, onValue } = getUtils();
        const refPath = ref(db, 'branches');

        return onValue(refPath, (snapshot) => {
            const val = snapshot.val();
            if (val) {
                const arr = Array.isArray(val) ? val : Object.values(val);
                callback(arr as Branch[]);
            } else {
                callback([]);
            }
        });
    } catch (error) {
        console.error("Error subscribing to branches:", error);
        return () => { };
    }
};

export const subscribeToPartners = (callback: (partners: Partner[]) => void) => {
    try {
        const db = getDb();
        const { ref, onValue } = getUtils();
        const refPath = ref(db, 'partners');

        return onValue(refPath, (snapshot) => {
            const val = snapshot.val();
            if (val) {
                const arr = Array.isArray(val) ? val : Object.values(val);
                callback(arr as Partner[]);
            } else {
                callback([]);
            }
        });
    } catch (error) {
        console.error("Error subscribing to partners:", error);
        return () => { };
    }
};

// --- Add Data ---

export const addTransaction = async (transaction: Transaction) => {
    try {
        const db = getDb();
        const { ref, get, set, child } = getUtils();

        const txRef = ref(db, 'transactions');
        const snapshot = await get(txRef);
        let currentTxs = snapshot.val() || [];
        if (!Array.isArray(currentTxs)) {
            currentTxs = Object.values(currentTxs);
        }

        const newTxs = [...currentTxs, transaction];
        await set(txRef, newTxs);

    } catch (error) {
        console.error("Error adding transaction:", error);
        throw error;
    }
};

export const updateTransactionAndStock = async (transaction: Transaction, newStock: Stock) => {
    try {
        const db = getDb();
        const { ref, update, get, set } = getUtils();

        const updates: any = {};
        updates['/stock'] = newStock;

        // Append transaction
        const txRef = ref(db, 'transactions');
        const snapshot = await get(txRef);
        let currentTxs = snapshot.val() || [];
        if (!Array.isArray(currentTxs)) {
            currentTxs = Object.values(currentTxs);
        }

        const newTxs = [...currentTxs, transaction];
        updates['/transactions'] = newTxs;

        // Fix: Call ref(db, '/') for root path update
        await update(ref(db, '/'), updates);

    } catch (error) {
        console.error("Error updating stock and transactions:", error);
        throw error;
    }
};

export const addMasterData = async (type: 'pallets' | 'branches' | 'partners', data: any) => {
    try {
        const db = getDb();
        const { ref, get, set } = getUtils();

        const path = type; // 'pallets', 'branches', or 'partners'
        const dbRef = ref(db, path);
        const snapshot = await get(dbRef);
        let currentData = snapshot.val() || [];

        if (!Array.isArray(currentData)) {
            currentData = Object.values(currentData);
        }

        const newData = [...currentData, data];
        await set(dbRef, newData);

    } catch (error) {
        console.error(`Error adding ${type}:`, error);
        throw error;
    }
};
