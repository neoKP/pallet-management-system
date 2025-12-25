import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
    currentUser: User | null;
    login: (user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        // Try to restore session from localStorage
        const savedUser = localStorage.getItem('neo-siam-user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const login = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem('neo-siam-user', JSON.stringify(user));
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('neo-siam-user');
    };

    const value: AuthContextType = {
        currentUser,
        login,
        logout,
        isAuthenticated: currentUser !== null,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
