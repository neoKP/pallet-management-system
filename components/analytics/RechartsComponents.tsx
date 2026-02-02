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
    Line,
    ReferenceLine,
    Brush,
    Sector,
    ComposedChart,
    ReferenceDot,
} from 'recharts';
import { ChartDataPoint, TimeSeriesData, PartnerBalanceData, LoscamRentalData } from '../../services/analyticsService';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { THEMES } from './ThemeEngine';
import { TrendingUp, Truck, Package, Trash2, Skull, AlertTriangle, Sparkles, Activity } from 'lucide-react';

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
                        ${isDarkMode ? 'bg-slate-900/95 border-white/20' : 'bg-white/95 border-gray-200 shadow-xl'}
                        item-border
                    `}
                    style={{ '--item-color': itemColor } as React.CSSProperties}
                >
                    <div className="absolute inset-0 rounded-2xl blur-xl -z-10 item-glow-bg" />
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                        <div className="w-3 h-3 rounded-lg shadow-lg item-bg item-shadow" />
                        <span className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {item.name}
                        </span>
                    </div>
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
                            <span className="text-sm font-black px-2 py-0.5 rounded-full theme-bg-soft item-text">
                                {percentage}%
                            </span>
                        </div>
                    </div>
                    <div className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="h-full rounded-full item-bg"
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
                    className={`bar-rect ${isActive ? 'active' : ''}`}
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
                group rounded-[3rem] p-8 xl:p-10 relative overflow-hidden transition-all duration-700
                ${isDarkMode
                    ? 'bg-slate-950 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
                    : 'bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)]'
                }
                ${isHovering ? 'dynamic-shadow' : ''}
            `}
            data-pdf-export="chart"
            style={{
                '--dynamic-shadow-value': isHovering ? `0 20px 40px rgba(var(--theme-primary-rgb), 0.15)` : 'none'
            } as React.CSSProperties}
        >
            {/* Animated background glow */}
            <AnimatePresence>
                {isHovering && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 pointer-events-none opacity-[0.08] theme-glow-bg"
                    />
                )}
            </AnimatePresence>

            <div className="flex justify-between items-center mb-6 relative z-10">
                <h3
                    className={`text-2xl font-black tracking-tighter flex items-center gap-3 transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
                >
                    <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                    </div>
                    {title}
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

            <ResponsiveContainer width="100%" height={400}>
                <BarChart
                    data={data as any}
                    margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                    onClick={(e: any) => e?.activePayload && onBarClick?.(e.activePayload[0].payload)}
                    onMouseMove={(state: any) => {
                        if (state.activeTooltipIndex !== undefined) setActiveIndex(state.activeTooltipIndex);
                    }}
                    onMouseLeave={() => setActiveIndex(null)}
                    accessibilityLayer
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
                        tick={{ fill: isDarkMode ? '#64748b' : '#64748b', fontSize: 11, fontWeight: isHovering ? '600' : '500' }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        stroke={isDarkMode ? '#64748b' : '#94a3b8'}
                        tick={{ fill: isDarkMode ? '#64748b' : '#64748b', fontSize: 11, fontWeight: '500' }}
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
                group rounded-[3rem] p-8 xl:p-10 relative overflow-hidden transition-all duration-700
                ${isDarkMode
                    ? 'bg-slate-950 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
                    : 'bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)]'
                }
            `}
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
                    className={`text-2xl font-black tracking-tighter flex items-center gap-3 transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
                >
                    <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-amber-500/20' : 'bg-amber-50'}`}>
                        <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>
                    {title}
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

            <ResponsiveContainer width="100%" height={400} minWidth={0}>
                <PieChart accessibilityLayer>
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
                    <Tooltip content={() => null} />
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
                                        ${isActive ? 'bg-white/10 shadow-lg item-shadow' : 'bg-transparent hover:bg-white/5'}
                                    `}
                                    style={{ '--item-color': entry.color } as React.CSSProperties}
                                >
                                    <div className="w-2.5 h-2.5 rounded-full item-bg item-shadow" />
                                    <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                        {entry.name}
                                    </span>
                                    <span className="text-xs font-black item-text">
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
                <circle cx={cx} cy={cy} r={12} fill={fill} opacity={0.2}>
                    <animate attributeName="r" values="8;14;8" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle cx={cx} cy={cy} r={8} fill={fill} opacity={0.4}>
                    <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle cx={cx} cy={cy} r={5} fill={fill} stroke="#fff" strokeWidth={2}>
                    <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
                </circle>
            </g>
        );
    };

    // Premium tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

            return (
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.9 }}
                    className={`
                        relative px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl min-w-[220px]
                        ${isDarkMode ? 'bg-slate-900/95 border-white/10' : 'bg-white/95 border-slate-200'}
                    `}
                    style={{ borderColor: `${currentTheme.primary}40` }}
                >
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                        <div className="p-1.5 rounded-lg theme-gradient-bg">
                            <Activity className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {label}
                        </span>
                    </div>

                    <div className="space-y-2">
                        {payload.map((entry: any, index: number) => {
                            const labels: Record<string, string> = {
                                in: '📥 รับเข้า',
                                out: '📤 จ่ายออก',
                                maintenance: '🔧 ซ่อมบำรุง',
                                scrapped: '🗑️ เสีย/ทิ้ง',
                            };
                            return (
                                <div key={index} className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" {...({ style: { backgroundColor: entry.color } as React.CSSProperties })} />
                                        <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {labels[entry.dataKey] || entry.name}
                                        </span>
                                    </div>
                                    <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {entry.value.toLocaleString()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/10 flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold text-slate-500">รวมทั้งหมด</span>
                        <span className="text-lg font-black theme-gradient-text">{total.toLocaleString()}</span>
                    </div>
                </motion.div>
            );
        }
        return null;
    };

    const CustomCursor = (props: any) => {
        const { points, width, height } = props;
        if (!points || points.length === 0) return null;
        const x = points[0].x;
        return (
            <g>
                <defs>
                    <linearGradient id="cursorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={currentTheme.primary} stopOpacity={0} />
                        <stop offset="50%" stopColor={currentTheme.primary} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={currentTheme.primary} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <line x1={x} y1={0} x2={x} y2={height - 30} stroke="url(#cursorGradient)" strokeWidth={2} />
            </g>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className={`
                group rounded-[3rem] p-8 xl:p-10 relative overflow-hidden transition-all duration-700
                ${isDarkMode
                    ? 'bg-slate-950 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
                    : 'bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)]'
                }
            `}
        >
            <div className="flex items-center justify-between mb-8 relative z-10">
                <h3 className={`text-2xl font-black tracking-tighter flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                    </div>
                    {title}
                </h3>
            </div>

            <ResponsiveContainer width="100%" height={400} minWidth={0}>
                <AreaChart data={data} accessibilityLayer>
                    <defs>
                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={isDarkMode ? '#ffffff08' : '#00000008'} />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 11 }}
                        tickFormatter={(value) => {
                            const date = new Date(value);
                            return isNaN(date.getTime()) ? value : date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
                        }}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 11 }} />
                    <Tooltip cursor={<CustomCursor />} content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="in"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorIn)"
                        activeDot={renderActiveDot}
                    />
                    <Area
                        type="monotone"
                        dataKey="out"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorOut)"
                        activeDot={renderActiveDot}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </motion.div>
    );
};

interface PartnerBalanceChartProps {
    data: PartnerBalanceData[];
    title: string;
    isDarkMode: boolean;
    showOnlyBalance?: boolean;
}

export const PartnerBalanceChart: React.FC<PartnerBalanceChartProps> = ({
    data,
    title,
    isDarkMode,
    showOnlyBalance = false,
}) => {
    const { themeColor } = useAnalyticsStore();
    const currentTheme = THEMES.find(t => t.id === themeColor) || THEMES[0];
    const [isHovering, setIsHovering] = useState(false);

    // Find Max/Min for Balance
    const maxBalance = data.length > 0 ? Math.max(...data.map(d => d.balance)) : 0;
    const minBalance = data.length > 0 ? Math.min(...data.map(d => d.balance)) : 0;

    const maxPoint = data.find(d => d.balance === maxBalance);
    const minPoint = data.find(d => d.balance === minBalance);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const receive = payload.find((p: any) => p.dataKey === 'receive')?.value || 0;
            const dispatch = payload.find((p: any) => p.dataKey === 'dispatch')?.value || 0;
            const balance = payload.find((p: any) => p.dataKey === 'balance')?.value || 0;

            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={`p-5 rounded-[1.5rem] border backdrop-blur-xl shadow-2xl ${isDarkMode ? 'bg-slate-950/90 border-white/20' : 'bg-white/95 border-slate-200'} relative overflow-hidden min-w-[220px]`}
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 blur-3xl rounded-full -mr-12 -mt-12" />

                    <p className={`text-[10px] font-black uppercase tracking-widest mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        📅 {new Date(label).toLocaleDateString('th-TH', { dateStyle: 'long' })}
                    </p>

                    <div className="space-y-3 relative z-10">
                        <div className="flex justify-between items-center bg-emerald-500/5 p-2 rounded-xl">
                            <span className="text-[10px] font-black text-emerald-500 uppercase">Receive</span>
                            <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{receive.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center bg-red-500/5 p-2 rounded-xl">
                            <span className="text-[10px] font-black text-red-500 uppercase">Dispatch</span>
                            <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{dispatch.toLocaleString()}</span>
                        </div>

                        <div className={`mt-2 pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-100'}`}>
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-black text-amber-500 uppercase">Net Balance</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black text-amber-500 tracking-tighter">{balance.toLocaleString()}</span>
                                    <span className="text-[10px] font-bold text-amber-500/50">Pallets</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            );
        }
        return null;
    };

    const totalActivity = data.reduce((sum, d) => sum + d.receive + d.dispatch, 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className={`
                group rounded-[3rem] p-8 xl:p-10 relative overflow-hidden transition-all duration-700
                ${isDarkMode
                    ? 'bg-slate-950 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
                    : 'bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)]'
                }
            `}
        >
            {/* Animated Pallet Flow Background */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.05] overflow-hidden">
                {[...Array(12)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            x: i % 2 === 0 ? [-100, 800] : [800, -100],
                            y: [Math.random() * 500, Math.random() * 500],
                            rotate: [0, 360],
                            opacity: [0, 1, 0]
                        }}
                        transition={{
                            duration: 20 + Math.random() * 10,
                            repeat: Infinity,
                            delay: i * 2,
                            ease: "linear"
                        }}
                        className="absolute"
                        style={{ top: `${(i / 12) * 100}%` }}
                    >
                        <Package className="w-10 h-10 text-amber-500" />
                    </motion.div>
                ))}
            </div>

            <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-10">
                <div className="space-y-2">
                    <div className="flex items-center gap-5">
                        <motion.div
                            whileHover={{ scale: 1.15, rotate: -8, y: -5 }}
                            className="p-4 rounded-[2rem] bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_15px_30px_rgba(245,158,11,0.4)] ring-8 ring-amber-500/10"
                        >
                            <Truck className="w-8 h-8 text-white" />
                        </motion.div>
                        <div>
                            <h3 className={`text-3xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                                <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Partner Equity & Possession Tracking
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-5 w-full xl:w-auto">
                    <motion.div
                        whileHover={{ y: -5 }}
                        className={`flex-1 xl:flex-none px-8 py-5 rounded-[2rem] border backdrop-blur-2xl ${isDarkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50/50 border-amber-200 shadow-sm'}`}
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600/70 block mb-1">Max Possession</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-black text-amber-600 tracking-tighter">{maxBalance.toLocaleString()}</span>
                            <span className="text-xs font-bold text-amber-600/30">MAX</span>
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -5 }}
                        className={`flex-1 xl:flex-none px-8 py-5 rounded-[2rem] border backdrop-blur-2xl ${isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200 shadow-sm'}`}
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70 block mb-1">Total Activity</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-black text-emerald-600 tracking-tighter">{totalActivity.toLocaleString()}</span>
                            <span className="text-xs font-bold text-emerald-600/30">VOL</span>
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="relative h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <ComposedChart data={data} accessibilityLayer>
                        <defs>
                            <linearGradient id="balanceGradientWow" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                            <filter id="balanceLineGlow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="5" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="6 6" stroke={isDarkMode ? '#ffffff0a' : '#0000000a'} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
                            tickFormatter={(val) => {
                                const d = new Date(val);
                                return `${d.getDate()}/${d.getMonth() + 1}`;
                            }}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5 5' }} />
                        <Legend
                            verticalAlign="top"
                            align="right"
                            iconType="circle"
                            wrapperStyle={{ fontSize: '12px', fontWeight: '900', paddingBottom: '40px', textTransform: 'uppercase', color: '#64748b' }}
                        />

                        {!showOnlyBalance && (
                            <>
                                <Bar dataKey="receive" name="RECEIVE" fill="#10b981" radius={[8, 8, 0, 0]} barSize={22} animationDuration={1500} />
                                <Bar dataKey="dispatch" name="DISPATCH" fill="#ef4444" radius={[8, 8, 0, 0]} barSize={22} animationDuration={1800} />
                            </>
                        )}

                        <Area
                            type="monotone"
                            dataKey="balance"
                            name="NET BALANCE"
                            fill="url(#balanceGradientWow)"
                            stroke="#f59e0b"
                            strokeWidth={6}
                            dot={false}
                            filter="url(#balanceLineGlow)"
                            animationDuration={2500}
                        />

                        {maxPoint && (
                            <ReferenceDot
                                x={maxPoint.date}
                                y={maxPoint.balance}
                                r={10}
                                fill="#f59e0b"
                                stroke="#fff"
                                strokeWidth={4}
                                className="animate-pulse shadow-2xl"
                            />
                        )}

                        {minPoint && (
                            <ReferenceDot
                                x={minPoint.date}
                                y={minPoint.balance}
                                r={10}
                                fill="#ef4444"
                                stroke="#fff"
                                strokeWidth={4}
                                className="animate-pulse shadow-2xl"
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};

interface LoscamRentalChartProps {
    data: LoscamRentalData[];
    title: string;
    isDarkMode: boolean;
}

export const LoscamRentalChart: React.FC<LoscamRentalChartProps> = ({
    data,
    title,
    isDarkMode,
}) => {
    const total7DayCost = data.reduce((sum, d) => sum + d.cost, 0);
    const maxQty = data.length > 0 ? Math.max(...data.map(d => d.quantity)) : 0;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const qty = payload[0].value;
            const cost = payload[1].value;
            const pricePerUnit = qty > 2000 ? 1.10 : 1.40;

            return (
                <div className={`p-5 rounded-[1.5rem] border backdrop-blur-xl shadow-2xl ${isDarkMode ? 'bg-slate-950/90 border-white/20' : 'bg-white/95 border-slate-200'} relative overflow-hidden min-w-[200px]`}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 blur-3xl rounded-full -mr-12 -mt-12" />

                    <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {new Date(label).toLocaleDateString('th-TH', { dateStyle: 'long' })}
                    </p>

                    <div className="space-y-3 relative z-10">
                        <div className="flex justify-between items-end">
                            <div className="flex flex-col">
                                <span className={`text-[9px] font-bold uppercase tracking-tight ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Total Quantity</span>
                                <span className="text-xl font-black text-red-500 tracking-tighter leading-none">{qty.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={`text-[9px] font-bold uppercase tracking-tight ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Rate/Day</span>
                                <span className={`text-xs font-black px-1.5 py-0.5 rounded ${qty > 2000 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                    {pricePerUnit.toFixed(2)} ฿
                                </span>
                            </div>
                        </div>

                        <div className={`mt-2 pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-100'}`}>
                            <div className="flex justify-between items-center">
                                <span className={`text-[10px] font-black uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Daily Rental</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-emerald-500 tracking-tighter leading-none">{cost.toLocaleString()}</span>
                                    <span className="text-xs font-bold text-emerald-500/50">฿</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`
                rounded-[3rem] p-8 xl:p-10 relative overflow-hidden transition-all duration-700
                ${isDarkMode
                    ? 'bg-slate-950 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
                    : 'bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)]'
                }
                group
            `}
        >
            <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-10">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="p-4 rounded-[1.25rem] bg-gradient-to-br from-red-500 to-rose-600 shadow-[0_10px_25px_rgba(239,68,68,0.4)]">
                            <Truck className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h3 className={`text-3xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Loscam Red Financial Intelligence
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full xl:w-auto">
                    <div className={`px-6 py-4 rounded-3xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Weekly Total</span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-2xl font-black text-emerald-500 tracking-tighter">{total7DayCost.toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-emerald-500/60 font-mono">฿</span>
                        </div>
                    </div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={400} minWidth={0}>
                <ComposedChart data={data} accessibilityLayer>
                    <defs>
                        <linearGradient id="qtyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={isDarkMode ? '#ffffff05' : '#00000005'} />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickFormatter={(val) => {
                            const d = new Date(val);
                            return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                    />
                    <YAxis
                        yAxisId="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#10b981' }}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    <Bar
                        yAxisId="left"
                        dataKey="quantity"
                        name="Quantity"
                        fill="url(#qtyGradient)"
                        radius={[10, 10, 0, 0]}
                        barSize={40}
                        animationDuration={1500}
                    />

                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="cost"
                        name="Rental Cost"
                        stroke="#10b981"
                        strokeWidth={6}
                        dot={{ r: 5, fill: '#10b981', strokeWidth: 3, stroke: isDarkMode ? '#1e293b' : '#fff' }}
                        activeDot={{ r: 8, fill: '#10b981', filter: 'url(#glow)' }}
                        animationDuration={2000}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </motion.div>
    );
};

interface WasteDamageAnalysisProps {
    data: ChartDataPoint[];
    summary: {
        sevenDays: number;
        mtd: number;
        ytd: number;
    };
    title: string;
    isDarkMode: boolean;
}

export const WasteDamageAnalysis: React.FC<WasteDamageAnalysisProps> = ({
    data,
    summary,
    title,
    isDarkMode,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className={`
                group rounded-[3rem] p-8 xl:p-10 relative overflow-hidden transition-all duration-700
                ${isDarkMode
                    ? 'bg-slate-950 border border-red-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
                    : 'bg-white border border-red-100 shadow-[0_20px_50px_rgba(239,68,68,0.05)]'
                }
            `}
        >
            <div className="relative z-10 flex flex-col gap-10">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-4 rounded-[1.5rem] bg-gradient-to-br from-rose-500 to-red-700 shadow-[0_15px_30px_rgba(225,29,72,0.4)]">
                            <Trash2 className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h3 className={`text-3xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Asset Depreciation & Loss Intelligence
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full xl:w-auto">
                        <div className={`px-6 py-4 rounded-3xl border ${isDarkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100'}`}>
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-500/60 block mb-1">MTD Waste</span>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-2xl font-black text-rose-500 tracking-tighter">{summary.mtd.toLocaleString()}</span>
                                <span className="text-[10px] font-bold text-rose-500/50 uppercase">PCS</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative h-[400px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <ComposedChart data={data} accessibilityLayer>
                            <defs>
                                <linearGradient id="scrappedTrendGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                                <filter id="glowScrap">
                                    <feGaussianBlur stdDeviation="4" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={isDarkMode ? '#ffffff08' : '#00000008'} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: '#64748b' }}
                            />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <Tooltip
                                cursor={{ stroke: '#f43f5e', strokeWidth: 2, strokeDasharray: '5 5' }}
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className={`p-4 rounded-2xl border backdrop-blur-xl shadow-2xl ${isDarkMode ? 'bg-slate-950/90 border-white/20' : 'bg-white/95 border-slate-200'} min-w-[180px]`}>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">{label}</p>
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-[10px] font-black text-rose-500 uppercase">Scrapped</span>
                                                    <span className="text-xl font-black text-rose-500">{payload[0].value.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar
                                dataKey="value"
                                fill="#f43f5e"
                                radius={[10, 10, 0, 0]}
                                barSize={40}
                                animationDuration={1500}
                                filter="url(#glowScrap)"
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#f43f5e"
                                strokeWidth={4}
                                fill="url(#scrappedTrendGradient)"
                                animationDuration={2500}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </motion.div>
    );
};
