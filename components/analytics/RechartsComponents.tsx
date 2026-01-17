import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LabelList,
    Brush,
    Sector,
} from 'recharts';
import { ChartDataPoint, TimeSeriesData } from '../../services/analyticsService';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { THEMES } from './ThemeEngine';

interface RechartsBarChartProps {
    data: ChartDataPoint[];
    title: string;
    isDarkMode: boolean;
    onBarClick?: (item: ChartDataPoint) => void;
    highlightedItem?: string | null;
}

export const RechartsBarChart: React.FC<RechartsBarChartProps> = ({
    data,
    title,
    isDarkMode,
    onBarClick,
    highlightedItem,
}) => {
    const { themeColor } = useAnalyticsStore();
    const currentTheme = THEMES.find(t => t.id === themeColor) || THEMES[0];
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [isHovering, setIsHovering] = useState(false);

    // Calculate total for percentage
    const total = data.reduce((sum, d) => sum + d.value, 0);

    // Enhanced tooltip with percentage and glow
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
            const itemColor = item.color || currentTheme.primary;

            return (
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`
                        relative px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl min-w-[180px]
                        ${isDarkMode
                            ? 'bg-slate-900/95'
                            : 'bg-white/95'
                        }
                    `}
                    style={{ borderColor: `${itemColor}40` }}
                >
                    {/* Glow background */}
                    <div
                        className="absolute inset-0 rounded-2xl blur-xl -z-10"
                        style={{
                            background: `radial-gradient(circle, ${itemColor}20 0%, transparent 70%)`
                        }}
                    />

                    {/* Header with name */}
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                        <div
                            className="w-3 h-3 rounded-lg shadow-lg"
                            style={{
                                backgroundColor: itemColor,
                                boxShadow: `0 0 12px ${itemColor}`
                            }}
                        />
                        <span className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {item.name}
                        </span>
                    </div>

                    {/* Value with percentage */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                📊 จำนวน
                            </span>
                            <span className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {item.value.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                📈 สัดส่วน
                            </span>
                            <span
                                className="text-sm font-black px-2 py-0.5 rounded-full"
                                style={{
                                    backgroundColor: `${itemColor}20`,
                                    color: itemColor
                                }}
                            >
                                {percentage}%
                            </span>
                        </div>
                    </div>

                    {/* Mini progress bar */}
                    <div className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: itemColor }}
                        />
                    </div>
                </motion.div>
            );
        }
        return null;
    };

    // Custom bar shape with glow effect
    const renderBar = (props: any) => {
        const { x, y, width, height, fill, index } = props;
        const isActive = activeIndex === index;

        return (
            <g>
                {/* Glow effect on hover */}
                {isActive && (
                    <rect
                        x={x - 2}
                        y={y - 2}
                        width={width + 4}
                        height={height + 4}
                        rx={8}
                        fill={fill}
                        opacity={0.3}
                        filter="url(#barGlow)"
                    />
                )}
                {/* Main bar */}
                <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx={6}
                    fill={fill}
                    style={{
                        transition: 'all 0.3s ease',
                        transform: isActive ? `scaleY(1.02)` : 'scaleY(1)',
                        transformOrigin: 'bottom'
                    }}
                />
            </g>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => { setIsHovering(false); setActiveIndex(null); }}
            className={`
                group rounded-2xl p-6 relative overflow-hidden transition-all duration-500
                ${isDarkMode
                    ? 'bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-white/10'
                    : 'bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
                }
            `}
            style={{
                boxShadow: isHovering ? `0 20px 40px ${currentTheme.primary}15` : 'none'
            }}
        >
            {/* Animated background glow */}
            <AnimatePresence>
                {isHovering && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: isDarkMode
                                ? `radial-gradient(circle at 50% 80%, ${currentTheme.primary}15 0%, transparent 60%)`
                                : `radial-gradient(circle at 50% 80%, ${currentTheme.primary}08 0%, transparent 60%)`
                        }}
                    />
                )}
            </AnimatePresence>

            <div className="flex justify-between items-center mb-6 relative z-10">
                <h3
                    className={`text-lg font-bold tracking-tight flex items-center gap-2 transition-colors duration-500`}
                    style={{ color: isDarkMode ? currentTheme.secondary : currentTheme.primary }}
                >
                    {title}
                    {isHovering && (
                        <motion.span
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-xs px-2 py-1 rounded-full text-white"
                            style={{ background: `linear-gradient(to right, ${currentTheme.primary}, ${currentTheme.secondary})` }}
                        >
                            Click to drill
                        </motion.span>
                    )}
                </h3>

                {/* Quick stats */}
                <AnimatePresence>
                    {isHovering && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-600'}`}
                        >
                            {data.length} items · {total.toLocaleString()} total
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <BarChart
                    data={data as any}
                    margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                    onClick={(e: any) => e?.activePayload && onBarClick?.(e.activePayload[0].payload)}
                    onMouseMove={(state: any) => {
                        if (state.activeTooltipIndex !== undefined) setActiveIndex(state.activeTooltipIndex);
                    }}
                    onMouseLeave={() => setActiveIndex(null)}
                >
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={currentTheme.secondary} stopOpacity={1} />
                            <stop offset="100%" stopColor={currentTheme.primary} stopOpacity={0.8} />
                        </linearGradient>
                        <filter id="barGlow">
                            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={isDarkMode ? '#ffffff08' : '#00000008'} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        stroke={isDarkMode ? '#64748b' : '#94a3b8'}
                        tick={{ fill: isDarkMode ? '#64748b' : '#64748b', fontSize: 11, fontWeight: isHovering ? 600 : 500 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        stroke={isDarkMode ? '#64748b' : '#94a3b8'}
                        tick={{ fill: isDarkMode ? '#64748b' : '#64748b', fontSize: 11, fontWeight: 500 }}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{
                            fill: isDarkMode ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)',
                            radius: 8
                        }}
                    />
                    <Bar
                        dataKey="value"
                        radius={[8, 8, 0, 0]}
                        animationDuration={1500}
                        animationBegin={200}
                    >
                        {data.map((entry, index) => {
                            const isHighlighted = highlightedItem === entry.name || highlightedItem === null;
                            const isHovered = activeIndex === index;
                            return (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color || 'url(#barGradient)'}
                                    fillOpacity={isHighlighted ? (isHovered ? 1 : 0.85) : 0.2}
                                    style={{
                                        transition: 'all 0.3s ease',
                                        filter: isHovered ? 'url(#barGlow)' : 'none'
                                    }}
                                />
                            );
                        })}
                        <LabelList
                            dataKey="value"
                            position="top"
                            fontSize={10}
                            fontWeight={700}
                            formatter={(val: any) => val ? val.toLocaleString() : ''}
                            fill={isDarkMode ? '#cbd5e1' : '#475569'}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </motion.div>
    );
};

interface RechartsPieChartProps {
    data: ChartDataPoint[];
    title: string;
    isDarkMode: boolean;
    onSegmentClick?: (item: ChartDataPoint) => void;
}

// Enhanced active shape with glow effect
const renderActiveShapeEnhanced = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 12) * cos;
    const sy = cy + (outerRadius + 12) * sin;
    const mx = cx + (outerRadius + 35) * cos;
    const my = cy + (outerRadius + 35) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 25;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
        <g>
            {/* Outer glow ring */}
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={outerRadius + 14}
                outerRadius={outerRadius + 18}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                opacity={0.2}
            />

            {/* Pulsing center with gradient */}
            <defs>
                <filter id="pieGlow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={fill} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={fill} stopOpacity={0} />
                </radialGradient>
            </defs>

            {/* Center glow */}
            <circle cx={cx} cy={cy} r={innerRadius - 5} fill="url(#centerGradient)">
                <animate attributeName="r" values={`${innerRadius - 8};${innerRadius - 3};${innerRadius - 8}`} dur="2s" repeatCount="indefinite" />
            </circle>

            {/* Percentage text with glow */}
            <text x={cx} y={cy - 5} textAnchor="middle" fill={fill} className="font-black text-2xl" filter="url(#pieGlow)">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
            <text x={cx} y={cy + 15} textAnchor="middle" fill={fill} className="text-xs font-medium" opacity={0.7}>
                {payload.name}
            </text>

            {/* Main active sector with expansion */}
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 8}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                filter="url(#pieGlow)"
            />

            {/* Outer highlight ring */}
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + 10}
                outerRadius={outerRadius + 13}
                fill={fill}
            />

            {/* Connector line with glow */}
            <path
                d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
                stroke={fill}
                strokeWidth={2}
                fill="none"
                filter="url(#pieGlow)"
            />

            {/* End circle with glow */}
            <circle cx={ex} cy={ey} r={4} fill={fill} filter="url(#pieGlow)">
                <animate attributeName="r" values="3;5;3" dur="1s" repeatCount="indefinite" />
            </circle>

            {/* Label text */}
            <text x={ex + (cos >= 0 ? 1 : -1) * 14} y={ey} textAnchor={textAnchor} fill={fill} fontSize={13} fontWeight={700}>
                {payload.name}
            </text>
            <text x={ex + (cos >= 0 ? 1 : -1) * 14} y={ey} dy={18} textAnchor={textAnchor} fill={fill} fontSize={11} opacity={0.8}>
                {`${value.toLocaleString()} ชิ้น`}
            </text>
        </g>
    );
};

export const RechartsPieChart: React.FC<RechartsPieChartProps> = ({
    data,
    title,
    isDarkMode,
    onSegmentClick,
}) => {
    const { themeColor } = useAnalyticsStore();
    const currentTheme = THEMES.find(t => t.id === themeColor) || THEMES[0];
    const [activeIndex, setActiveIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);

    // Calculate total
    const total = data.reduce((sum, d) => sum + d.value, 0);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className={`
                rounded-2xl p-6 relative overflow-hidden transition-all duration-500
                ${isDarkMode
                    ? 'bg-slate-900/50 backdrop-blur-xl border border-white/10'
                    : 'bg-white border border-slate-200 shadow-sm'
                }
            `}
            style={{
                boxShadow: isHovering ? `0 20px 40px ${currentTheme.primary}15` : 'none'
            }}
        >
            {/* Animated background glow */}
            <AnimatePresence>
                {isHovering && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: isDarkMode
                                ? `radial-gradient(circle at 50% 50%, ${currentTheme.primary}15 0%, transparent 60%)`
                                : `radial-gradient(circle at 50% 50%, ${currentTheme.primary}08 0%, transparent 60%)`
                        }}
                    />
                )}
            </AnimatePresence>

            <div className="flex items-center justify-between mb-6 relative z-10">
                <h3
                    className={`text-lg font-bold flex items-center gap-2 transition-colors duration-500`}
                    style={{ color: isDarkMode ? currentTheme.secondary : currentTheme.primary }}
                >
                    {title}
                    {isHovering && (
                        <motion.span
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-xs px-2 py-1 rounded-full text-white"
                            style={{ background: `linear-gradient(to right, ${currentTheme.primary}, ${currentTheme.secondary})` }}
                        >
                            Hover segments
                        </motion.span>
                    )}
                </h3>

                {/* Total badge */}
                <AnimatePresence>
                    {isHovering && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className={`text-xs px-3 py-1.5 rounded-full font-bold text-white shadow-lg`}
                            style={{
                                background: `linear-gradient(to right, ${currentTheme.primary}, ${currentTheme.accent})`,
                                boxShadow: `0 4px 12px ${currentTheme.primary}40`
                            }}
                        >
                            รวม {total.toLocaleString()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <defs>
                        <filter id="segmentGlow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <Pie
                        {...({
                            activeIndex,
                            activeShape: renderActiveShapeEnhanced,
                            data: data as any,
                            cx: "50%",
                            cy: "50%",
                            innerRadius: 60,
                            outerRadius: 85,
                            dataKey: "value",
                            onMouseEnter: (_: any, index: number) => setActiveIndex(index),
                            onClick: (entry: any) => onSegmentClick?.(entry),
                            animationDuration: 1500,
                            animationBegin: 200,
                        } as any)}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color || currentTheme.primary}
                                style={{
                                    outline: 'none',
                                    filter: activeIndex === index ? 'url(#segmentGlow)' : 'none',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<div className="hidden" />} />
                </PieChart>
            </ResponsiveContainer>

            {/* Enhanced legend */}
            <AnimatePresence>
                {isHovering && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex flex-wrap justify-center gap-3 mt-4"
                    >
                        {data.map((entry, index) => {
                            const percentage = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                            const isActive = activeIndex === index;

                            return (
                                <motion.div
                                    key={index}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    whileHover={{ scale: 1.05 }}
                                    className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all
                                        ${isActive
                                            ? 'bg-white/10 shadow-lg'
                                            : 'bg-transparent hover:bg-white/5'
                                        }
                                    `}
                                    style={{
                                        boxShadow: isActive ? `0 0 20px ${entry.color}30` : 'none'
                                    }}
                                >
                                    <div
                                        className="w-2.5 h-2.5 rounded-full"
                                        style={{
                                            backgroundColor: entry.color,
                                            boxShadow: isActive ? `0 0 8px ${entry.color}` : 'none'
                                        }}
                                    />
                                    <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                        {entry.name}
                                    </span>
                                    <span
                                        className="text-xs font-black"
                                        style={{ color: entry.color }}
                                    >
                                        {percentage}%
                                    </span>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

interface RechartsLineChartProps {
    data: TimeSeriesData[];
    title: string;
    isDarkMode: boolean;
}

export const RechartsLineChart: React.FC<RechartsLineChartProps> = ({
    data,
    title,
    isDarkMode,
}) => {
    const { themeColor } = useAnalyticsStore();
    const currentTheme = THEMES.find(t => t.id === themeColor) || THEMES[0];
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [isHovering, setIsHovering] = useState(false);

    // Custom animated dot for data points
    const renderActiveDot = (props: any) => {
        const { cx, cy, fill } = props;
        return (
            <g>
                {/* Outer glow ring */}
                <circle cx={cx} cy={cy} r={12} fill={fill} opacity={0.2}>
                    <animate attributeName="r" values="8;14;8" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite" />
                </circle>
                {/* Middle glow */}
                <circle cx={cx} cy={cy} r={8} fill={fill} opacity={0.4}>
                    <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
                </circle>
                {/* Core dot */}
                <circle cx={cx} cy={cy} r={5} fill={fill} stroke="#fff" strokeWidth={2}>
                    <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
                </circle>
            </g>
        );
    };

    // Premium tooltip with animations
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

            return (
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.9 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`
                        relative px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl min-w-[200px]
                        ${isDarkMode
                            ? 'bg-slate-900/95'
                            : 'bg-white/95'
                        }
                    `}
                    style={{ borderColor: `${currentTheme.primary}40` }}
                >
                    {/* Animated glow background */}
                    <div
                        className="absolute inset-0 rounded-2xl blur-xl -z-10"
                        style={{ background: `linear-gradient(to right, ${currentTheme.primary}15, ${currentTheme.secondary}15)` }}
                    />

                    {/* Date header with icon */}
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                        <div
                            className="p-1.5 rounded-lg shadow-lg"
                            style={{ background: `linear-gradient(to right, ${currentTheme.primary}, ${currentTheme.secondary})` }}
                        >
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <span
                            className={`font-black text-sm`}
                            style={{ color: isDarkMode ? currentTheme.secondary : currentTheme.primary }}
                        >
                            {label}
                        </span>
                    </div>

                    {/* Data entries with animations */}
                    <div className="space-y-2">
                        {payload.map((entry: any, index: number) => {
                            const labels: Record<string, string> = {
                                in: '📥 รับเข้า',
                                out: '📤 จ่ายออก',
                                maintenance: '🔧 ซ่อมบำรุง',
                            };
                            const percentage = total > 0 ? Math.round((entry.value / total) * 100) : 0;

                            return (
                                <motion.div
                                    key={index}
                                    initial={{ x: -10, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-2 h-2 rounded-full shadow-lg"
                                            style={{
                                                backgroundColor: entry.color,
                                                boxShadow: `0 0 8px ${entry.color}`
                                            }}
                                        />
                                        <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {labels[entry.dataKey] || entry.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {entry.value.toLocaleString()}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {percentage}%
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Total summary */}
                    <div className={`mt-3 pt-2 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                รวมทั้งหมด
                            </span>
                            <span
                                className={`text-lg font-black bg-clip-text text-transparent`}
                                style={{ backgroundImage: `linear-gradient(to right, ${currentTheme.primary}, ${currentTheme.secondary})` }}
                            >
                                {total.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </motion.div>
            );
        }
        return null;
    };

    // Custom cursor with glow effect
    const CustomCursor = (props: any) => {
        const { points, width, height } = props;
        if (!points || points.length === 0) return null;

        const x = points[0].x;

        return (
            <g>
                {/* Glowing vertical line */}
                <defs>
                    <linearGradient id="cursorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={currentTheme.primary} stopOpacity={0} />
                        <stop offset="30%" stopColor={currentTheme.primary} stopOpacity={0.5} />
                        <stop offset="70%" stopColor={currentTheme.secondary} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={currentTheme.secondary} stopOpacity={0} />
                    </linearGradient>
                    <filter id="cursorGlow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Main glow line */}
                <line
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={height - 50}
                    stroke="url(#cursorGradient)"
                    strokeWidth={3}
                    filter="url(#cursorGlow)"
                />

                {/* Subtle background highlight */}
                <rect
                    x={x - 25}
                    y={0}
                    width={50}
                    height={height - 50}
                    fill={isDarkMode ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.03)'}
                    rx={4}
                />
            </g>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => { setIsHovering(false); setActiveIndex(null); }}
            className={`
                col-span-1 lg:col-span-2 rounded-2xl p-6 relative overflow-hidden transition-all duration-500
                ${isDarkMode
                    ? 'bg-slate-900/40 border border-white/10'
                    : 'bg-white border border-slate-200 shadow-sm'
                }
                ${isHovering ? 'shadow-2xl shadow-indigo-500/10' : ''}
            `}
        >
            {/* Animated background gradient on hover */}
            <AnimatePresence>
                {isHovering && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: isDarkMode
                                ? 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.05) 0%, transparent 70%)'
                                : 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.02) 0%, transparent 70%)'
                        }}
                    />
                )}
            </AnimatePresence>

            <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-indigo-400' : 'text-slate-900'}`}>
                    {title}
                    {isHovering && (
                        <motion.span
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400"
                        >
                            Interactive
                        </motion.span>
                    )}
                </h3>

                {/* Quick stats on hover */}
                <AnimatePresence>
                    {isHovering && data.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex items-center gap-4"
                        >
                            <div className="text-right">
                                <div className={`text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Peak Value
                                </div>
                                <div className={`text-sm font-black ${isDarkMode ? 'text-cyan-400' : 'text-indigo-600'}`}>
                                    {Math.max(...data.map(d => Math.max(d.in, d.out, d.maintenance))).toLocaleString()}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <ResponsiveContainer width="100%" height={350}>
                <AreaChart
                    data={data}
                    onMouseMove={(state: any) => {
                        if (state.activeTooltipIndex !== undefined) {
                            setActiveIndex(state.activeTooltipIndex);
                        }
                    }}
                    onMouseLeave={() => setActiveIndex(null)}
                >
                    <defs>
                        {/* Enhanced gradients with glow effect */}
                        <linearGradient id="colorInEnhanced" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={isHovering ? 0.5 : 0.3} />
                            <stop offset="50%" stopColor="#3b82f6" stopOpacity={isHovering ? 0.2 : 0.1} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorOutEnhanced" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={isHovering ? 0.5 : 0.3} />
                            <stop offset="50%" stopColor="#f59e0b" stopOpacity={isHovering ? 0.2 : 0.1} />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorMaintenanceEnhanced" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={isHovering ? 0.5 : 0.3} />
                            <stop offset="50%" stopColor="#8b5cf6" stopOpacity={isHovering ? 0.2 : 0.1} />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                        {/* Line glow filters */}
                        <filter id="lineGlow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={isDarkMode ? '#ffffff08' : '#00000008'} />

                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        stroke={isDarkMode ? '#64748b' : '#94a3b8'}
                        tick={{ fill: isDarkMode ? '#64748b' : '#64748b', fontSize: 11, fontWeight: isHovering ? 600 : 400 }}
                        tickFormatter={(value) => {
                            if (typeof value === 'string' && value.includes('.')) return value;
                            const date = new Date(value);
                            return isNaN(date.getTime()) ? value : date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
                        }}
                    />

                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        stroke={isDarkMode ? '#64748b' : '#94a3b8'}
                        tick={{ fill: isDarkMode ? '#64748b' : '#64748b', fontSize: 11 }}
                    />

                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={<CustomCursor />}
                    />

                    <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        height={36}
                        formatter={(value) => {
                            const labels: Record<string, string> = {
                                in: 'รับเข้า',
                                out: 'จ่ายออก',
                                maintenance: 'ซ่อมบำรุง',
                            };
                            return <span className={`text-xs font-bold transition-all ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{labels[value] || value}</span>;
                        }}
                    />

                    {/* Areas with enhanced effects */}
                    <Area
                        type="monotone"
                        dataKey="in"
                        stroke={currentTheme.primary}
                        strokeWidth={isHovering ? 4 : 3}
                        fill="url(#colorInEnhanced)"
                        animationDuration={2000}
                        activeDot={renderActiveDot}
                        filter={isHovering ? "url(#lineGlow)" : undefined}
                    />
                    <Area
                        type="monotone"
                        dataKey="out"
                        stroke="#f59e0b"
                        strokeWidth={isHovering ? 4 : 3}
                        fill="url(#colorOutEnhanced)"
                        animationDuration={2000}
                        activeDot={renderActiveDot}
                        filter={isHovering ? "url(#lineGlow)" : undefined}
                    />
                    <Area
                        type="monotone"
                        dataKey="maintenance"
                        stroke={currentTheme.secondary}
                        strokeWidth={isHovering ? 4 : 3}
                        fill="url(#colorMaintenanceEnhanced)"
                        animationDuration={2000}
                        activeDot={renderActiveDot}
                        filter={isHovering ? "url(#lineGlow)" : undefined}
                    />

                    <Brush
                        dataKey="date"
                        height={30}
                        stroke={currentTheme.primary}
                        fill={isDarkMode ? '#1e293b' : '#f8fafc'}
                        tickFormatter={(value) => {
                            if (typeof value === 'string' && value.includes('.')) return value.split(' ')[0];
                            const date = new Date(value);
                            return isNaN(date.getTime()) ? value : date.toLocaleDateString('th-TH', { day: 'numeric' });
                        }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </motion.div>
    );
};
