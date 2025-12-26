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
            // Data Migration: hub_nks -> hub_nw (Force move if nks exists)
            let val = stockSnap.val();
            if (val.hub_nks) {
                console.log('Migrating stock data from hub_nks to hub_nw (Force)...');
                // Move data to hub_nw, potentially merging or overwriting if nw is empty
                val.hub_nw = val.hub_nks;
                delete val.hub_nks;
                await set(stockRef, val);
            }

            // Legacy migration logic only, removed dangerous auto-clear
        }

        // Check transactions
        const txRef = ref(db, 'transactions');
        const txSnap = await get(txRef);

        if (!txSnap.exists()) {
            console.log('Seeding initial transaction data...');
            await set(txRef, INITIAL_TRANSACTIONS);
        } else {
            const val = txSnap.val();
            if (val) {
                const txs = Array.isArray(val) ? val : Object.values(val);

                // Data Migration: transactions source/dest
                let modified = false;
                const nextTxs = txs.map((t: any) => {
                    let updated = false;
                    if (t.source === 'hub_nks') { t.source = 'hub_nw'; updated = true; }
                    if (t.dest === 'hub_nks') { t.dest = 'hub_nw'; updated = true; }
                    if (updated) modified = true;
                    return t;
                });

                if (modified) {
                    console.log('Migrating transactions from hub_nks to hub_nw...');
                    await set(txRef, nextTxs);
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

        // Check Pallet Requests
        const requestsRef = ref(db, 'palletRequests');
        const requestsSnap = await get(requestsRef);
        if (requestsSnap.exists()) {
            const val = requestsSnap.val();
            const reqs = Array.isArray(val) ? val : Object.values(val);
            let modified = false;
            const nextReqs = reqs.map((r: any) => {
                let updated = false;
                if (r.branchId === 'hub_nks') { r.branchId = 'hub_nw'; updated = true; }
                if (r.targetBranchId === 'hub_nks') { r.targetBranchId = 'hub_nw'; updated = true; }
                if (updated) modified = true;
                return r;
            });
            if (modified) {
                console.log('Migrating pallet requests from hub_nks to hub_nw...');
                await set(requestsRef, nextReqs);
            }
        } else {
            console.log('Initializing pallet requests...');
            await set(requestsRef, []);
        }

        // Check System Config
        const configRef = ref(db, 'config');
        const configSnap = await get(configRef);
        if (!configSnap.exists()) {
            console.log('Initializing system config...');
            await set(configRef, {
                telegramChatId: ''
            });
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
                // Return as array regardless of storage format, and filter out nulls/undefineds
                const txArray = (Array.isArray(val) ? val : Object.values(val)).filter(Boolean);
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

export const subscribeToPalletRequests = (callback: (requests: any[]) => void) => {
    try {
        const db = getDb();
        const { ref, onValue } = getUtils();
        const refPath = ref(db, 'palletRequests');

        return onValue(refPath, (snapshot) => {
            const val = snapshot.val();
            if (val) {
                const arr = Array.isArray(val) ? val : Object.values(val);
                callback(arr);
            } else {
                callback([]);
            }
        });
    } catch (error) {
        console.error("Error subscribing to pallet requests:", error);
        return () => { };
    }
};

export const subscribeToConfig = (callback: (config: any) => void) => {
    try {
        const db = getDb();
        const { ref, onValue } = getUtils();
        const configRef = ref(db, 'config');

        return onValue(configRef, (snapshot) => {
            const val = snapshot.val();
            if (val) callback(val);
        });
    } catch (error) {
        console.error("Error subscribing to config:", error);
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

export const addMovementBatch = async (newTransactions: Transaction[], newStock: Stock) => {
    try {
        const db = getDb();
        const { ref, update, get, set } = getUtils();

        const updates: any = {};
        updates['/stock'] = newStock;

        // Sync transactions: replace existing ones by ID or append new ones
        const txRef = ref(db, 'transactions');
        const snapshot = await get(txRef);
        const val = snapshot.val();

        // Ensure we always work with a clean array of objects
        let currentTxs: any[] = [];
        if (val) {
            currentTxs = (Array.isArray(val) ? val : Object.values(val)).filter(t => t && typeof t === 'object');
        }

        const updatedTxs = [...currentTxs];
        newTransactions.forEach(newTx => {
            const index = updatedTxs.findIndex(t => t && t.id === newTx.id);
            if (index > -1) {
                updatedTxs[index] = newTx;
            } else {
                updatedTxs.push(newTx);
            }
        });

        // Deep clean data to remove 'undefined' which Firebase RTDB does not accept
        const cleanStock = JSON.parse(JSON.stringify(newStock));
        const cleanTxs = JSON.parse(JSON.stringify(updatedTxs.filter(Boolean)));

        const finalUpdates: any = {};
        finalUpdates['/stock'] = cleanStock;
        finalUpdates['/transactions'] = cleanTxs;

        // Perform atomic update on root
        await update(ref(db, '/'), finalUpdates);

        console.log(`[Firebase] Movement batch saved. Docs: ${newTransactions.map(t => t.docNo).join(', ')}`);
    } catch (error: any) {
        console.error("Error adding movement batch:", error);
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

export const updatePalletRequest = async (request: any) => {
    try {
        const db = getDb();
        const { ref, get, set } = getUtils();

        const refPath = ref(db, 'palletRequests');
        const snapshot = await get(refPath);
        let current = snapshot.val() || [];
        if (!Array.isArray(current)) {
            current = Object.values(current);
        }

        const index = current.findIndex((r: any) => r.id === request.id);
        if (index > -1) {
            current[index] = request;
        } else {
            current.push(request);
        }

        const cleanedArray = JSON.parse(JSON.stringify(current.filter(Boolean)));
        await set(refPath, cleanedArray);
    } catch (error) {
        console.error("Error updating pallet request:", error);
        throw error;
    }
};

export const updatePalletRequestsBatch = async (requests: any[]) => {
    try {
        const db = getDb();
        const { ref, set } = getUtils();
        const refPath = ref(db, 'palletRequests');
        await set(refPath, requests);
    } catch (error) {
        console.error("Error updating pallet requests batch:", error);
        throw error;
    }
};

export const updateConfig = async (config: any) => {
    try {
        const db = getDb();
        const { ref, update } = getUtils();
        await update(ref(db, 'config'), config);
    } catch (error) {
        console.error("Error updating config:", error);
        throw error;
    }
};
