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
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`
                        px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md
                        ${isDarkMode ? 'bg-slate-900/90 border-white/20' : 'bg-white/90 border-gray-200'}
                    `}
                >
                    <p className={`font-black text-sm mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {payload[0].payload.name}
                    </p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.color || '#6366f1' }} />
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            Value: <span className="font-black text-indigo-500">{payload[0].value.toLocaleString()}</span>
                        </p>
                    </div>
                </motion.div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                group rounded-2xl p-6 relative overflow-hidden transition-all duration-500
                ${isDarkMode
                    ? 'bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-white/10'
                    : 'bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]'
                }
            `}
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className={`text-lg font-bold tracking-tight ${isDarkMode ? 'text-indigo-400' : 'text-indigo-900'}`}>
                    {title}
                </h3>
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
                            <stop offset="0%" stopColor="#818cf8" stopOpacity={1} />
                            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={isDarkMode ? '#ffffff05' : '#00000005'} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        stroke={isDarkMode ? '#64748b' : '#94a3b8'}
                        tick={{ fill: isDarkMode ? '#64748b' : '#64748b', fontSize: 11, fontWeight: 500 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        stroke={isDarkMode ? '#64748b' : '#94a3b8'}
                        tick={{ fill: isDarkMode ? '#64748b' : '#64748b', fontSize: 11, fontWeight: 500 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: isDarkMode ? 'white' : 'black', fillOpacity: 0.03 }} />
                    <Bar
                        dataKey="value"
                        radius={[6, 6, 0, 0]}
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
                                    fillOpacity={isHighlighted ? (isHovered ? 1 : 0.8) : 0.2}
                                    style={{ transition: 'all 0.3s ease' }}
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

const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
        <g>
            <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="font-black text-xl">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 6}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + 10}
                outerRadius={outerRadius + 12}
                fill={fill}
            />
            <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
            <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
            <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill={fill} fontSize={12} fontWeight={700}>{payload.name}</text>
            <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill={fill} fontSize={10} opacity={0.7}>
                {`(${value.toLocaleString()} ชิ้น)`}
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
    const [activeIndex, setActiveIndex] = useState(0);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`
                rounded-2xl p-6 relative
                ${isDarkMode
                    ? 'bg-slate-900/50 backdrop-blur-xl border border-white/10'
                    : 'bg-white border border-slate-200 shadow-sm'
                }
            `}
        >
            <h3 className={`text-lg font-bold mb-6 ${isDarkMode ? 'text-indigo-400' : 'text-slate-900'}`}>
                {title}
            </h3>

            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        {...({
                            activeIndex,
                            activeShape: renderActiveShape,
                            data: data as any,
                            cx: "50%",
                            cy: "50%",
                            innerRadius: 65,
                            outerRadius: 85,
                            dataKey: "value",
                            onMouseEnter: (_: any, index: number) => setActiveIndex(index),
                            onClick: (entry: any) => onSegmentClick?.(entry)
                        } as any)}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color || '#6366f1'}
                                style={{ outline: 'none' }}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<div className="hidden" />} />
                </PieChart>
            </ResponsiveContainer>
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
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div
                    className={`
                        px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md min-w-[150px]
                        ${isDarkMode ? 'bg-slate-900/90 border-white/20' : 'bg-white/90 border-gray-200'}
                    `}
                >
                    <p className={`font-black mb-2 text-xs uppercase tracking-widest ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        {new Date(label).toLocaleDateString('th-TH', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4 py-1 border-b border-white/5 last:border-0">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{entry.name}</span>
                            </div>
                            <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{entry.value.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                col-span-1 lg:col-span-2 rounded-2xl p-6
                ${isDarkMode
                    ? 'bg-slate-900/40 border border-white/10'
                    : 'bg-white border border-slate-200 shadow-sm'
                }
            `}
        >
            <h3 className={`text-lg font-bold mb-6 ${isDarkMode ? 'text-indigo-400' : 'text-slate-900'}`}>
                {title}
            </h3>

            <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorMaintenance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={isDarkMode ? '#ffffff05' : '#00000005'} />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        stroke={isDarkMode ? '#64748b' : '#94a3b8'}
                        tick={{ fill: isDarkMode ? '#64748b' : '#64748b', fontSize: 11 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        stroke={isDarkMode ? '#64748b' : '#94a3b8'}
                        tick={{ fill: isDarkMode ? '#64748b' : '#64748b', fontSize: 11 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
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
                            return <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{labels[value] || value}</span>;
                        }}
                    />
                    <Area type="monotone" dataKey="in" stroke="#3b82f6" strokeWidth={3} fill="url(#colorIn)" animationDuration={2000} />
                    <Area type="monotone" dataKey="out" stroke="#f59e0b" strokeWidth={3} fill="url(#colorOut)" animationDuration={2000} />
                    <Area type="monotone" dataKey="maintenance" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorMaintenance)" animationDuration={2000} />
                    <Brush
                        dataKey="date"
                        height={30}
                        stroke="#6366f1"
                        fill={isDarkMode ? '#1e293b' : '#f8fafc'}
                        tickFormatter={(v) => new Date(v).toLocaleDateString('th-TH', { day: 'numeric' })}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </motion.div>
    );
};
