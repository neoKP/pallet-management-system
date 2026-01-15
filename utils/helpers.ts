/**
 * Utility Functions for Neo Siam Logistics
 */

/**
 * Format number to Thai currency format
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

/**
 * Format date to Thai format
 */
export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
};

/**
 * Format date to short format (DD/MM/YYYY)
 */
export const formatDateShort = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

/**
 * Get current date in ISO format (YYYY-MM-DD)
 */
export const getCurrentDate = (): string => {
    return new Date().toISOString().split('T')[0];
};

/**
 * Validate quantity input
 */
export const validateQuantity = (qty: string | number): boolean => {
    const num = typeof qty === 'string' ? parseFloat(qty) : qty;
    return !isNaN(num) && num > 0 && Number.isInteger(num);
};

/**
 * Sanitize user input
 */
export const sanitizeInput = (input: string): string => {
    return input.trim().replace(/[<>]/g, '');
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value: number, total: number): number => {
    if (total === 0) return 0;
    return (value / total) * 100;
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

/**
 * Generate unique ID
 */
export const generateId = (): number => {
    return Date.now() + Math.floor(Math.random() * 1000);
};

/**
 * Check if user is admin
 */
export const isAdmin = (role: string): boolean => {
    return role === 'ADMIN';
};

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
};

/**
 * Format number with commas
 */
export const formatNumber = (num: number): string => {
    return num.toLocaleString('th-TH');
};

/**
 * Safe division (avoid division by zero)
 */
export const safeDivide = (numerator: number, denominator: number): number => {
    return denominator === 0 ? 0 : numerator / denominator;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

/**
 * Check if date is today
 */
export const isToday = (dateString: string): boolean => {
    const date = new Date(dateString);
    const today = new Date();
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
};

/**
 * Get days difference between two dates
 */
export const getDaysDifference = (date1: string, date2: string): number => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Convert to title case
 */
export const toTitleCase = (str: string): string => {
    return str
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Safe localStorage wrapper to handle SecurityError in some environments
 */
export const safeStorage = {
    getItem: (key: string): string | null => {
        try {
            return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        } catch (e) {
            console.warn('localStorage is not accessible:', e);
            return null;
        }
    },
    setItem: (key: string, value: string): void => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem(key, value);
            }
        } catch (e) {
            console.warn('localStorage is not accessible:', e);
        }
    },
    removeItem: (key: string): void => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.removeItem(key);
            }
        } catch (e) {
            console.warn('localStorage is not accessible:', e);
        }
    }
};

