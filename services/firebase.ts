import { Stock, Transaction, PalletType, Branch, Partner } from '../types';
import { INITIAL_STOCK, INITIAL_TRANSACTIONS, PALLET_TYPES, BRANCHES, EXTERNAL_PARTNERS } from '../constants';
import { StockMutator, RootSnapshot, normalizeTransactions } from '../utils/stockMutation';

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
                runTransaction: (
                    ref: any,
                    updateFn: (current: any) => any,
                    options?: { applyLocally?: boolean }
                ) => Promise<{ committed: boolean; snapshot: any }>;
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
            console.log('Initializing empty stock structure...');
            await set(stockRef, INITIAL_STOCK);
        } else {
            let val = stockSnap.val() || {};
            let modified = false;

            // 1. Ensure all branches defined in constants exist in the stock object
            const palletKeys = PALLET_TYPES.map(p => p.id);
            BRANCHES.forEach(branch => {
                if (!val[branch.id]) {
                    console.log(`Creating branch structure for: ${branch.id}`);
                    const branchStock: any = {};
                    palletKeys.forEach(k => branchStock[k] = 0);
                    val[branch.id] = branchStock;
                    modified = true;
                } else {
                    // Ensure all pallet types exist in existing branches
                    palletKeys.forEach(k => {
                        if (val[branch.id][k] === undefined) {
                            console.log(`Adding missing pallet '${k}' to branch '${branch.id}'`);
                            val[branch.id][k] = 0;
                            modified = true;
                        }
                    });
                }
            });

            // 2. Data Migration: hub_nks -> hub_nw
            if (val.hub_nks) {
                console.log('Migrating stock data from hub_nks to hub_nw...');
                val.hub_nw = val.hub_nks;
                delete val.hub_nks;
                modified = true;
            }

            if (modified) {
                await set(stockRef, val);
            }
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
        } else {
            // Update existing branches with new ones from constants
            const currentBranches = branchesSnap.val();
            const branchList = Array.isArray(currentBranches) ? currentBranches : Object.values(currentBranches);
            const branchIds = new Set(branchList.map((b: any) => b.id));

            let needsUpdate = false;
            const updatedBranches = [...branchList];

            BRANCHES.forEach(b => {
                if (!branchIds.has(b.id)) {
                    console.log(`Adding new branch to master data: ${b.name}`);
                    updatedBranches.push(b);
                    needsUpdate = true;
                }
            });

            if (needsUpdate) {
                await set(branchesRef, updatedBranches);
            }
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
                telegramChatId: '',
                thresholds: INITIAL_STOCK // Use INITIAL_STOCK structure but with threshold objects later
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

/**
 * บันทึกการเปลี่ยนแปลงสต็อกแบบ atomic ด้วย Firebase runTransaction
 *
 * ทำไมต้องใช้ runTransaction แทน update():
 *   update() = อ่านค่ามาก่อน → คำนวณที่เครื่องผู้ใช้ → เขียนทับ
 *   ถ้ามี 2 คนทำพร้อมกัน คนที่เขียนทีหลังจะลบผลของคนแรกทิ้ง (lost update)
 *   runTransaction จะส่ง "ข้อมูลสดขณะนั้น" เข้ามาให้คำนวณ และถ้ามีคนแก้แทรก
 *   Firebase จะเรียก mutator ซ้ำด้วยค่าใหม่จนกว่าจะเขียนสำเร็จ
 *
 * mutator ต้องเป็น pure function เพราะถูกเรียกซ้ำได้หลายรอบ
 * ห้ามให้มี side effect เช่นส่ง Telegram อยู่ข้างใน
 *
 * @throws StockValidationError เมื่อสต็อกไม่พอ (ยกเลิกทั้งชุด ไม่เขียนอะไรเลย)
 */
export const commitStockMutation = async (mutator: StockMutator): Promise<void> => {
    const db = getDb();
    const { ref, runTransaction } = getUtils();

    // เก็บ error เชิงธุรกิจไว้โยนหลัง transaction จบ
    // เพราะ error ที่โยนใน updateFn จะถูก Firebase กลืนเป็น abort เฉย ๆ
    let businessError: Error | null = null;

    // หมายเหตุสำคัญ (อ่านก่อนแก้ rules):
    // transaction ทำที่ root เพราะ stock กับ transactions อยู่คนละ node ที่ root
    // และต้องแก้พร้อมกันเป็นก้อนเดียว
    //
    // ผลข้างเคียง: runTransaction ต้องคืนค่าทั้งก้อนของ node ที่ทำ ทำให้ทุกการบันทึก
    // นับว่า "เขียนทับ" ทั้ง root ดังนั้น rules จึงต้องเปิดสิทธิ์เขียนที่ root
    // ซึ่งใน Realtime Database สิทธิ์ที่ให้ไว้ชั้นบนจะไหลลงลูกทั้งหมดและลูกปฏิเสธไม่ได้
    // → แยกสิทธิ์ "เฉพาะแอดมิน" รายส่วนไม่ได้ตราบใดที่ยังทำ transaction ที่ root
    //
    // ทางแก้ระยะยาว: ย้าย stock + transactions ไปอยู่ใต้ node เดียวกัน (เช่น /inventory)
    // แล้วเปลี่ยนมาทำ transaction ที่ node นั้น เป็นงาน migration ที่ต้องวางแผนแยก
    // ดูรายละเอียดใน docs/FIREBASE_RULES_GUIDE.md
    const result = await runTransaction(ref(db, '/'), (current: RootSnapshot | null) => {
        businessError = null;

        // Firebase เรียกครั้งแรกด้วย null เมื่อเครื่องยังไม่มีข้อมูล root ใน cache
        // ห้ามตรวจสต็อกกับ snapshot ว่างนี้ เพราะจะเห็นยอดคงเหลือเป็น 0 ทั้งหมด
        // แล้ว abort ทันที ทำให้ผู้ใช้เจอ "สต็อกไม่เพียงพอ" ทั้งที่ของมีจริง
        //
        // การคืน null กลับไปคือการบอก Firebase ว่า "ยังไม่พร้อมตัดสินใจ"
        // Firebase จะไปดึงค่าจริงจากเซิร์ฟเวอร์แล้วเรียกฟังก์ชันนี้ใหม่อีกครั้ง
        if (current === null) return null;

        const currentStock = (current?.stock || {}) as Stock;
        const currentTxs = normalizeTransactions(current?.transactions);

        let next;
        try {
            next = mutator(currentStock, currentTxs);
        } catch (err: any) {
            businessError = err;
            return undefined; // undefined = ยกเลิก transaction ไม่เขียนอะไรเลย
        }

        // ต้องคืนทั้งก้อน ถ้าตัด field ไหนออก Firebase จะถือว่าสั่งลบ field นั้น
        return {
            ...(current || {}),
            stock: JSON.parse(JSON.stringify(next.stock)),
            transactions: JSON.parse(JSON.stringify(next.txs.filter(Boolean))),
        };
    }, { applyLocally: false });

    if (businessError) throw businessError;

    if (!result.committed) {
        throw new Error('ไม่สามารถบันทึกข้อมูลได้ อาจมีผู้ใช้อื่นแก้ไขพร้อมกัน กรุณาลองใหม่อีกครั้ง');
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

export const deleteMasterData = async (type: 'pallets' | 'branches' | 'partners', id: string) => {
    try {
        const db = getDb();
        const { ref, get, set } = getUtils();

        const path = type;
        const dbRef = ref(db, path);
        const snapshot = await get(dbRef);
        let currentData = snapshot.val() || [];

        if (!Array.isArray(currentData)) {
            currentData = Object.values(currentData);
        }

        const newData = currentData.filter((item: any) => item.id !== id);
        await set(dbRef, newData);

    } catch (error) {
        console.error(`Error deleting ${type}:`, error);
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

export const resetAllData = async (initialStock: Stock) => {
    try {
        const db = getDb();
        const { ref, set, update } = getUtils();

        const updates: any = {};
        updates['/stock'] = initialStock;
        updates['/transactions'] = [];
        updates['/palletRequests'] = []; // Also clear requests for a true deep reset

        await update(ref(db, '/'), updates);
        console.log('[Firebase] Deep reset completed. All stock and transactions cleared.');
    } catch (error) {
        console.error("Error performing deep reset:", error);
        throw error;
    }
};

export const subscribeToThresholds = (callback: (thresholds: any) => void) => {
    try {
        const db = getDb();
        const { ref, onValue } = getUtils();
        const thresholdRef = ref(db, 'config/thresholds');

        return onValue(thresholdRef, (snapshot) => {
            const val = snapshot.val();
            if (val) callback(val);
        });
    } catch (error) {
        console.error("Error subscribing to thresholds:", error);
        return () => { };
    }
};

export const updateThresholds = async (thresholds: any) => {
    try {
        const db = getDb();
        const { ref, set } = getUtils();
        await set(ref(db, 'config/thresholds'), thresholds);
    } catch (error) {
        console.error("Error updating thresholds:", error);
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
