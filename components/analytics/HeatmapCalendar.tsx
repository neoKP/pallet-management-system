import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { THEMES } from './ThemeEngine';
import { SpotlightCard } from './MotionWrappers';

interface HeatmapData {
    date: Date;
    value: number;
}

interface HeatmapCalendarProps {
    data: HeatmapData[];
    title: string;
    isDarkMode: boolean;
}

const HeatmapCell: React.FC<{
    intensity: number;
    data: HeatmapData;
    isDarkMode: boolean;
    color: string;
    hoveredIndex: { week: number, day: number } | null;
    index: { week: number, day: number };
    onHover: (data: HeatmapData | null, index: { week: number, day: number } | null) => void;
}> = ({ intensity, data, isDarkMode, color, hoveredIndex, index, onHover }) => {
    let scale = 1;
    let opacity = 1;
    let isHovered = false;
    let isNeighbor = false;

    if (hoveredIndex) {
        const dx = Math.abs(hoveredIndex.week - index.week);
        const dy = Math.abs(hoveredIndex.day - index.day);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
            scale = 0.85;
            isHovered = true;
        } else if (distance < 2.5) {
            scale = 1.2;
            isNeighbor = true;
            opacity = 1;
        } else if (distance < 4) {
            scale = 1.05;
        }
    }

    const level = intensity === 0 ? 0 :
        intensity < 0.25 ? 1 :
            intensity < 0.5 ? 2 :
                intensity < 0.75 ? 3 : 4;

    const getCellStyle = () => {
        if (level === 0) return {
            bg: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : '#f1f5f9',
            borderColor: isDarkMode ? 'rgba(51, 65, 85, 0.5)' : '#cbd5e1',
            shadow: 'none'
        };

        const baseColor = color;
        const opacityVal = level === 1 ? '40' : level === 2 ? '80' : level === 3 ? 'BF' : 'FF';

        return {
            bg: `${baseColor}${opacityVal}`,
            borderColor: baseColor,
            shadow: `0 0 ${level * 5}px ${baseColor}${opacityVal}`
        };
    };

    const style = getCellStyle();
    const isHot = level === 4;

    return (
        <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{
                scale: scale,
                opacity: opacity,
                boxShadow: isNeighbor ? `0 0 15px ${color}` : (isHovered || isHot ? style.shadow : 'none'),
                backgroundColor: isNeighbor ? color : style.bg,
                borderColor: isNeighbor ? '#fff' : style.borderColor,
                zIndex: isHovered || isNeighbor ? 10 : 1
            }}
            transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
                delay: (index.week * 0.02) + (index.day * 0.05)
            }}
            onMouseEnter={() => onHover(data, index)}
            onMouseLeave={() => onHover(null, null)}
            className={`
                w-4 h-4 rounded-sm cursor-pointer backdrop-blur-sm relative border
                ${isHot ? 'animate-pulse' : ''}
            `}
        />
    );
};

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
    data,
    title,
    isDarkMode,
}) => {
    const { themeColor } = useAnalyticsStore();
    const currentTheme = THEMES.find(t => t.id === themeColor) || THEMES[0];
    const weeks = 52;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const [hoveredData, setHoveredData] = useState<HeatmapData | null>(null);
    const [hoveredIndex, setHoveredIndex] = useState<{ week: number, day: number } | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
    }, [data]);

    const maxValue = Math.max(...data.map(d => d.value), 1);
    const today = new Date();
    const startDate = addDays(startOfWeek(today), -weeks * 7 + 7);

    const calendarData: (HeatmapData)[][] = [];
    for (let week = 0; week < weeks; week++) {
        const weekData: (HeatmapData)[] = [];
        for (let day = 0; day < 7; day++) {
            const currentDate = addDays(startDate, week * 7 + day);
            const dataPoint = data.find(d => isSameDay(d.date, currentDate));
            weekData.push(dataPoint || { date: currentDate, value: 0 });
        }
        calendarData.push(weekData);
    }

    const scrollbarStyles = `
        .custom-scrollbar::-webkit-scrollbar {
            height: 4px;
            background-color: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
            margin: 0 20px;
            border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
            border-radius: 9999px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .custom-scrollbar:hover::-webkit-scrollbar {
            height: 6px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
            background: linear-gradient(90deg, #a855f7, #ec4899);
            box-shadow: 0 0 10px #a855f7, 0 0 20px #ec4899;
        }
    `;

    return (
        <div
            className="js-dynamic-vars"
            style={{
                '--primary-theme': currentTheme.primary,
                '--grid-color': isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                '--sticky-bg': isDarkMode ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)',
                '--panel-bg': isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)'
            } as React.CSSProperties}
        >
            <SpotlightCard
                spotlightColor={isDarkMode ? `${currentTheme.primary}20` : 'rgba(168,85,247,0.1)'}
                className={`
                    p-6 rounded-3xl relative overflow-hidden cyber-glass-card group
                    ${isDarkMode
                        ? 'bg-slate-900/60 border border-indigo-500/20'
                        : 'bg-white/80 border border-indigo-200'
                    }
                    shadow-2xl
                `}
            >
                <style>{scrollbarStyles}</style>
                <style>{`
                    .heatmap-blueprint {
                        background-image: linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
                        background-size: 20px 20px;
                    }
                    .heatmap-energy-glow {
                        background: radial-gradient(circle, var(--primary-theme) 0%, transparent 70%);
                    }
                    .heatmap-underline {
                        background: var(--primary-theme);
                    }
                    .heatmap-legend-bar {
                        background-color: var(--primary-theme);
                    }
                    .heatmap-sticky-day {
                        background: linear-gradient(to right, var(--sticky-bg), transparent);
                    }
                    .heatmap-scroll-container {
                        scroll-behavior: smooth;
                    }
                    .heatmap-info-panel {
                        background: var(--panel-bg);
                        border-left: 4px solid var(--primary-theme);
                    }
                    .heatmap-value-text {
                        color: var(--primary-theme);
                    }
                `}</style>

                <div className="absolute inset-0 pointer-events-none heatmap-blueprint" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 pointer-events-none opacity-20 blur-3xl rounded-full heatmap-energy-glow" />

                <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="relative">
                        <h3 className={`text-lg font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {title}
                        </h3>
                        <div className="h-0.5 w-1/2 mt-1 rounded-full opacity-50 heatmap-underline" />
                    </div>

                    <div className="flex items-center gap-3 bg-black/20 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">
                        <span className="text-[9px] text-gray-400 font-mono uppercase tracking-widest">ระดับความหนาแน่น</span>
                        <div className="flex gap-1">
                            {[0.2, 0.4, 0.6, 0.8, 1].map((opacity, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ height: 6 }}
                                    animate={{ height: [6, 12, 6] }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                                    className="w-1 rounded-full heatmap-legend-bar js-dynamic-opacity"
                                    style={{ '--dynamic-opacity': opacity } as React.CSSProperties}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div ref={scrollContainerRef} className="overflow-x-auto pb-6 custom-scrollbar relative z-10 heatmap-scroll-container">
                    <div className="inline-flex gap-2 min-w-full">
                        <div className="flex flex-col gap-1.5 mr-2 pt-6 sticky left-0 z-20 backdrop-blur-sm pr-2 heatmap-sticky-day">
                            {days.map(day => (
                                <div key={day} className={`h-4 text-[9px] font-mono flex items-center ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                    {day.toUpperCase()}
                                </div>
                            ))}
                        </div>

                        {calendarData.map((week, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-1.5 shrink-0">
                                <div className="h-4 text-[9px] font-bold text-center">
                                    {week.map(d => d.date.getDate()).includes(1) && (
                                        <span className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}>
                                            {format(week.find(d => d.date.getDate() === 1)!.date, 'MMM').toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                {week.map((dayData, dayIndex) => (
                                    <HeatmapCell
                                        key={dayIndex}
                                        index={{ week: weekIndex, day: dayIndex }}
                                        hoveredIndex={hoveredIndex}
                                        onHover={(d, i) => { setHoveredData(d); setHoveredIndex(i); }}
                                        intensity={dayData.value / maxValue}
                                        data={dayData}
                                        isDarkMode={isDarkMode}
                                        color={currentTheme.primary}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <AnimatePresence>
                    {hoveredData && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className={`absolute bottom-6 left-6 z-40 p-4 rounded-xl border border-white/10 backdrop-blur-xl shadow-2xl flex items-center gap-4 overflow-hidden heatmap-info-panel`}
                        >
                            <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />
                            <div className="flex flex-col relative z-10">
                                <span className="text-[10px] text-gray-400 font-mono uppercase">วันที่</span>
                                <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{format(hoveredData.date, 'dd MMM yyyy')}</span>
                            </div>
                            <div className="w-px h-8 bg-gray-500/20 relative z-10" />
                            <div className="flex flex-col relative z-10">
                                <span className="text-[10px] text-gray-400 font-mono uppercase">การเคลื่อนไหว</span>
                                <span className="text-xl font-black text-glow heatmap-value-text">{hoveredData.value.toLocaleString()} รายการ</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </SpotlightCard>
        </div>
    );
};
