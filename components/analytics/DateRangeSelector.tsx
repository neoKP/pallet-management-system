import React from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { th } from 'date-fns/locale';
import { DateRangeType } from '../../stores/analyticsStore';

interface DateRangeSelectorProps {
    selectedRange: DateRangeType;
    startDate: Date;
    endDate: Date;
    onRangeChange: (range: DateRangeType) => void;
    onCustomDateChange: (start: Date, end: Date) => void;
    isDarkMode: boolean;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
    selectedRange,
    startDate,
    endDate,
    onRangeChange,
    onCustomDateChange,
    isDarkMode,
}) => {
    const ranges: { value: DateRangeType; label: string }[] = [
        { value: 'day', label: 'วันนี้' },
        { value: 'week', label: 'สัปดาห์นี้' },
        { value: 'month', label: 'เดือนนี้' },
        { value: 'quarter', label: 'ไตรมาสนี้' },
        { value: 'year', label: 'ปีนี้' },
        { value: 'custom', label: 'กำหนดเอง' },
    ];

    const handleRangeClick = (range: DateRangeType) => {
        onRangeChange(range);

        const now = new Date();
        let start: Date;
        let end: Date;

        switch (range) {
            case 'day':
                start = startOfDay(now);
                end = endOfDay(now);
                break;
            case 'week':
                start = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
                end = endOfWeek(now, { weekStartsOn: 0 });
                break;
            case 'month':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'quarter':
                start = startOfQuarter(now);
                end = endOfQuarter(now);
                break;
            case 'year':
                start = startOfYear(now);
                end = endOfYear(now);
                break;
            default:
                return; // Custom - don't auto-set dates
        }

        if (range !== 'custom') {
            onCustomDateChange(start, end);
        }
    };

    const formatDateThai = (date: Date): string => {
        return format(date, 'd MMM yyyy', { locale: th });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-4"
        >
            {/* Quick Range Buttons */}
            <div className="flex flex-wrap gap-2">
                {ranges.map((range, index) => (
                    <motion.button
                        key={range.value}
                        onClick={() => handleRangeClick(range.value)}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
              px-4 py-2 rounded-lg font-medium text-sm
              transition-all duration-300
              ${selectedRange === range.value
                                ? isDarkMode
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/50'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                                : isDarkMode
                                    ? 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                            }
            `}
                    >
                        {range.label}
                    </motion.button>
                ))}
            </div>

            {/* Custom Date Inputs */}
            {selectedRange === 'custom' && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`
            flex flex-wrap gap-4 p-4 rounded-xl
            ${isDarkMode
                            ? 'bg-white/5 border border-white/10'
                            : 'bg-gray-50 border border-gray-200'
                        }
          `}
                >
                    <div className="flex-1 min-w-[200px]">
                        <label
                            htmlFor="start-date"
                            className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                        >
                            วันที่เริ่มต้น
                        </label>
                        <div className="relative">
                            <input
                                id="start-date"
                                type="date"
                                value={format(startDate, 'yyyy-MM-dd')}
                                onChange={(e) => onCustomDateChange(new Date(e.target.value), endDate)}
                                className={`
                  w-full px-4 py-2 rounded-lg
                  ${isDarkMode
                                        ? 'bg-white/10 border-white/20 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                    }
                  border focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  transition-all duration-300
                `}
                            />
                            <Calendar className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        </div>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                        <label
                            htmlFor="end-date"
                            className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                        >
                            วันที่สิ้นสุด
                        </label>
                        <div className="relative">
                            <input
                                id="end-date"
                                type="date"
                                value={format(endDate, 'yyyy-MM-dd')}
                                onChange={(e) => onCustomDateChange(startDate, new Date(e.target.value))}
                                className={`
                  w-full px-4 py-2 rounded-lg
                  ${isDarkMode
                                        ? 'bg-white/10 border-white/20 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                    }
                  border focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  transition-all duration-300
                `}
                            />
                            <Calendar className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Selected Range Display */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={`
          flex items-center gap-2 px-4 py-2 rounded-lg
          ${isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-700'}
        `}
            >
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">
                    {formatDateThai(startDate)} - {formatDateThai(endDate)}
                </span>
            </motion.div>
        </motion.div>
    );
};
