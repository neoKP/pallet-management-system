import React from 'react';
import { motion } from 'framer-motion';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { THEMES } from './ThemeEngine';

interface HeatmapData {
    date: Date;
    value: number;
}

interface HeatmapCalendarProps {
    data: HeatmapData[];
    title: string;
    isDarkMode: boolean;
}

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
    data,
    title,
    isDarkMode,
}) => {
    const { themeColor } = useAnalyticsStore();
    const currentTheme = THEMES.find(t => t.id === themeColor) || THEMES[0];
    const weeks = 12; // Show 12 weeks
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Get max value for color scaling
    const maxValue = Math.max(...data.map(d => d.value), 1);

    // Get color intensity based on value
    const getColor = (value: number) => {
        const intensity = value / maxValue;
        if (intensity === 0) return isDarkMode ? '#1e293b' : '#f1f5f9';

        // Use theme color for intensity
        // currentTheme.primary is something like '#6366f1'
        // We can use opacity to simulate intensity
        const baseColor = currentTheme.primary;
        if (intensity < 0.25) return `${baseColor}40`;
        if (intensity < 0.5) return `${baseColor}80`;
        if (intensity < 0.75) return `${baseColor}bf`;
        return baseColor;
    };

    // Generate calendar grid
    const today = new Date();
    const startDate = addDays(startOfWeek(today), -weeks * 7);

    const calendarData: (HeatmapData | null)[][] = [];
    for (let week = 0; week < weeks; week++) {
        const weekData: (HeatmapData | null)[] = [];
        for (let day = 0; day < 7; day++) {
            const currentDate = addDays(startDate, week * 7 + day);
            const dataPoint = data.find(d => isSameDay(d.date, currentDate));
            weekData.push(dataPoint || { date: currentDate, value: 0 });
        }
        calendarData.push(weekData);
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`
                p-6 rounded-xl
                ${isDarkMode
                    ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50'
                    : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
                }
                backdrop-blur-sm shadow-lg
            `}
        >
            {/* Title */}
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {title}
            </h3>

            {/* Calendar Grid */}
            <div className="overflow-x-auto">
                <div className="inline-flex gap-1">
                    {/* Day Labels */}
                    <div className="flex flex-col gap-1 mr-2">
                        <div className="h-4" /> {/* Spacer for month labels */}
                        {days.map(day => (
                            <div
                                key={day}
                                className={`h-3 text-[10px] flex items-center ${isDarkMode ? 'text-gray-500' : 'text-gray-600'
                                    }`}
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Weeks */}
                    {calendarData.map((week, weekIndex) => (
                        <div key={weekIndex} className="flex flex-col gap-1">
                            {/* Month Label */}
                            <div className="h-4 text-[10px] text-center">
                                {weekIndex % 4 === 0 && (
                                    <span className={isDarkMode ? 'text-gray-500' : 'text-gray-600'}>
                                        {format(week[0]!.date, 'MMM')}
                                    </span>
                                )}
                            </div>

                            {/* Days */}
                            {week.map((day, dayIndex) => {
                                if (!day) return <div key={dayIndex} className="w-3 h-3" />;

                                const isToday = isSameDay(day.date, today);

                                return (
                                    <motion.div
                                        key={dayIndex}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{
                                            type: 'spring',
                                            stiffness: 300,
                                            damping: 20,
                                            delay: (weekIndex * 7 + dayIndex) * 0.005
                                        }}
                                        whileHover={{
                                            scale: 1.5,
                                            zIndex: 10,
                                            boxShadow: isDarkMode
                                                ? `0 0 15px ${getColor(day.value)}`
                                                : `0 0 10px ${getColor(day.value)}`,
                                        }}
                                        className={`
                                            w-3 h-3 rounded-sm cursor-pointer transition-colors duration-300
                                            ${isToday ? 'ring-2 ring-blue-500 ring-offset-1 ' + (isDarkMode ? 'ring-offset-slate-900' : 'ring-offset-white') : ''}
                                        `}
                                        style={{
                                            backgroundColor: getColor(day.value),
                                        } as React.CSSProperties}
                                        title={`${format(day.date, 'MMM dd, yyyy')}: ${day.value} transactions`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-4">
                <span className={`text-[10px] font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                    Less
                </span>
                <div className="flex gap-1">
                    {[0, 0.25, 0.5, 0.75, 1].map((intensity, index) => (
                        <motion.div
                            key={index}
                            whileHover={{ scale: 1.2 }}
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: getColor(intensity * maxValue) } as React.CSSProperties}
                        />
                    ))}
                </div>
                <span className={`text-[10px] font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                    More
                </span>
            </div>
        </motion.div>
    );
};
