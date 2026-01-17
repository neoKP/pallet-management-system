import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DateRangeType = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
export type ThemeColor = 'indigo' | 'purple' | 'blue' | 'green' | 'rose' | 'amber';

export interface AnalyticsFilters {
    dateRange: DateRangeType;
    startDate: Date;
    endDate: Date;
    selectedSubcontractor: string | null;
    selectedRoute: string | null;
    selectedVehicle: string | null;
    selectedBranch: string | null;
    selectedPalletType: string | null;
    selectedBranches: string[]; // Multi-select
    selectedPalletTypes: string[]; // Multi-select
    selectedYears: number[]; // Multi-select
}

interface AnalyticsState {
    filters: AnalyticsFilters;
    isDarkMode: boolean;
    themeColor: ThemeColor;
    updateFilters: (updates: Partial<AnalyticsFilters>) => void;
    resetFilters: () => void;
    toggleDarkMode: () => void;
    setDarkMode: (isDark: boolean) => void;
    setThemeColor: (color: ThemeColor) => void;
}

const getDefaultDateRange = (): { startDate: Date; endDate: Date } => {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999); // End of today

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // Default: Last month
    startDate.setHours(0, 0, 0, 0); // Start of day

    return { startDate, endDate };
};

const defaultRange = getDefaultDateRange();

export const useAnalyticsStore = create<AnalyticsState>()(
    persist(
        (set) => ({
            filters: {
                dateRange: 'month',
                startDate: defaultRange.startDate,
                endDate: defaultRange.endDate,
                selectedSubcontractor: null,
                selectedRoute: null,
                selectedVehicle: null,
                selectedBranch: null,
                selectedPalletType: null,
                selectedBranches: [],
                selectedPalletTypes: [],
                selectedYears: [],
            },
            isDarkMode: true, // Default: Dark Mode
            themeColor: 'indigo' as ThemeColor, // Default theme

            updateFilters: (updates) =>
                set((state) => ({
                    filters: {
                        ...state.filters,
                        ...updates,
                        // Ensure dates are valid Date objects
                        startDate: updates.startDate instanceof Date ? updates.startDate : state.filters.startDate,
                        endDate: updates.endDate instanceof Date ? updates.endDate : state.filters.endDate,
                    },
                })),

            resetFilters: () => {
                const defaultRange = getDefaultDateRange();
                set({
                    filters: {
                        dateRange: 'month',
                        startDate: defaultRange.startDate,
                        endDate: defaultRange.endDate,
                        selectedSubcontractor: null,
                        selectedRoute: null,
                        selectedVehicle: null,
                        selectedBranch: null,
                        selectedPalletType: null,
                        selectedBranches: [],
                        selectedPalletTypes: [],
                        selectedYears: [],
                    },
                });
            },

            toggleDarkMode: () =>
                set((state) => ({ isDarkMode: !state.isDarkMode })),

            setDarkMode: (isDark) =>
                set({ isDarkMode: isDark }),

            setThemeColor: (color) =>
                set({ themeColor: color }),
        }),
        {
            name: 'analytics-storage',
            partialize: (state) => ({ isDarkMode: state.isDarkMode, themeColor: state.themeColor }), // Persist dark mode and theme
        }
    )
);
