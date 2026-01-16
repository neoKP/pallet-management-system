import React, { createContext, useContext, useState, ReactNode } from 'react';

export type DateRangeType = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface AnalyticsFilters {
    dateRange: DateRangeType;
    startDate: Date;
    endDate: Date;
    selectedSubcontractor: string | null;
    selectedRoute: string | null;
    selectedVehicle: string | null;
}

interface AnalyticsContextType {
    filters: AnalyticsFilters;
    updateFilters: (updates: Partial<AnalyticsFilters>) => void;
    resetFilters: () => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

const getDefaultDateRange = (): { startDate: Date; endDate: Date } => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // Default: Last month
    return { startDate, endDate };
};

export const AnalyticsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const defaultRange = getDefaultDateRange();

    const [filters, setFilters] = useState<AnalyticsFilters>({
        dateRange: 'month',
        startDate: defaultRange.startDate,
        endDate: defaultRange.endDate,
        selectedSubcontractor: null,
        selectedRoute: null,
        selectedVehicle: null,
    });

    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('analytics-dark-mode');
        return saved ? JSON.parse(saved) : true; // Default: Dark Mode
    });

    const updateFilters = (updates: Partial<AnalyticsFilters>) => {
        setFilters(prev => ({ ...prev, ...updates }));
    };

    const resetFilters = () => {
        const defaultRange = getDefaultDateRange();
        setFilters({
            dateRange: 'month',
            startDate: defaultRange.startDate,
            endDate: defaultRange.endDate,
            selectedSubcontractor: null,
            selectedRoute: null,
            selectedVehicle: null,
        });
    };

    const toggleDarkMode = () => {
        setIsDarkMode(prev => {
            const newValue = !prev;
            localStorage.setItem('analytics-dark-mode', JSON.stringify(newValue));
            return newValue;
        });
    };

    return (
        <AnalyticsContext.Provider value={{ filters, updateFilters, resetFilters, isDarkMode, toggleDarkMode }}>
            {children}
        </AnalyticsContext.Provider>
    );
};

export const useAnalytics = () => {
    const context = useContext(AnalyticsContext);
    if (!context) {
        throw new Error('useAnalytics must be used within AnalyticsProvider');
    }
    return context;
};
