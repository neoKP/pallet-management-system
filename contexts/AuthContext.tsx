import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { User } from '../types';
import { safeStorage } from '../utils/helpers';
import { watchAuth, signOutUser, recheckCurrentUser } from '../services/authService';

interface AuthContextType {
    currentUser: User | null;
    /**
     * เรียกหลัง signIn สำเร็จ — ไม่ตั้งสถานะเอง
     * ผู้ตัดสินคนเดียวว่าใครล็อกอินอยู่คือ watchAuth (onAuthStateChanged + บัตรผ่าน)
     * กันกรณีหน้าจอเข้าระบบแล้วทั้งที่ Firebase ถูกออกจากระบบไปพร้อมกัน
     */
    login: (user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isInitialLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Hook to use authentication context
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

/** คีย์เดิมที่เคยเก็บผู้ใช้ไว้ในเบราว์เซอร์ (แก้เองได้ จึงเลิกใช้) — ลบทิ้งเมื่อเปิดแอป */
const LEGACY_SESSION_KEY = 'neo-siam-user';

/**
 * AuthProvider — สถานะล็อกอินมาจาก Firebase Authentication เท่านั้น
 * ไม่อ่านสิทธิ์จาก localStorage อีกต่อไป
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    useEffect(() => {
        safeStorage.removeItem(LEGACY_SESSION_KEY);
        let unsub = () => {};
        try {
            unsub = watchAuth(user => {
                setCurrentUser(user);
                setIsInitialLoading(false);
            });
        } catch (e) {
            console.error('Failed to start auth listener', e);
            setIsInitialLoading(false);
        }
        return () => unsub();
    }, []);

    // คู่ค้าเปิดหน้าค้างไว้เกิน 12 ชม. → ออกจากระบบเอง (ตรวจทุก 1 นาที)
    useEffect(() => {
        if (currentUser?.role !== 'PARTNER') return;
        const timer = window.setInterval(async () => {
            let still;
            try {
                still = await recheckCurrentUser();
            } catch {
                return; // เน็ตหลุดชั่วคราว — ยังไม่ตัดออก ตรวจใหม่รอบหน้า
            }
            if (!still) {
                setCurrentUser(null);
                signOutUser().catch(() => {});
            }
        }, 60_000);
        return () => window.clearInterval(timer);
    }, [currentUser]);

    const login = useCallback((_user: User) => {
        // ตั้งใจไม่ทำอะไร — รอ watchAuth ยืนยันจาก Firebase (ดูคำอธิบายใน AuthContextType)
    }, []);

    const logout = useCallback(() => {
        setCurrentUser(null);
        signOutUser().catch(e => console.error('signOut failed', e));
    }, []);

    const value: AuthContextType = useMemo(() => ({
        currentUser,
        login,
        logout,
        isAuthenticated: currentUser !== null,
        isInitialLoading
    }), [currentUser, isInitialLoading, login, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
