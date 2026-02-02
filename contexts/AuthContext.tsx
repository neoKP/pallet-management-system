import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { User } from '../types';
import { safeStorage } from '../utils/helpers';

interface AuthContextType {
    currentUser: User | null;
    login: (user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isInitialLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Hook to use authentication context
 * Vercel Best Practice: Use a custom hook for context access with safety check
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

/**
 * AuthProvider component
 * Vercel Best Practice: Persist state correctly and use memoization for value
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    useEffect(() => {
        // Restore session on mount
        const restoreSession = () => {
            try {
                const savedUser = safeStorage.getItem('neo-siam-user');
                if (savedUser) {
                    setCurrentUser(JSON.parse(savedUser));
                }
            } catch (error) {
                console.error('Failed to restore auth session', error);
                safeStorage.removeItem('neo-siam-user');
            } finally {
                setIsInitialLoading(false);
            }
        };

        restoreSession();
    }, []);

    const login = (user: User) => {
        setCurrentUser(user);
        safeStorage.setItem('neo-siam-user', JSON.stringify(user));
    };

    const logout = () => {
        setCurrentUser(null);
        safeStorage.removeItem('neo-siam-user');
    };

    // Vercel Best Practice: Memoize context value to prevent unnecessary down-stream re-renders
    const value: AuthContextType = useMemo(() => ({
        currentUser,
        login,
        logout,
        isAuthenticated: currentUser !== null,
        isInitialLoading
    }), [currentUser, isInitialLoading]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
