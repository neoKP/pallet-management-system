import React from 'react';
import { motion } from 'framer-motion';
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
} from 'recharts';
import { ChartDataPoint, TimeSeriesData } from '../../services/analyticsService';

interface RechartsBarChartProps {
    data: ChartDataPoint[];
    title: string;
    isDarkMode: boolean;
    onBarClick?: (item: ChartDataPoint) => void;
}

export const RechartsBarChart: React.FC<RechartsBarChartProps> = ({
    data,
    title,
    isDarkMode,
    onBarClick,
}) => {
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div
                    className={`
            px-4 py-3 rounded-lg shadow-xl border
            ${isDarkMode ? 'bg-gray-900 border-white/20' : 'bg-white border-gray-200'}
          `}
                >
                    <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {payload[0].payload.name}
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        จำนวน: <span className="font-bold">{payload[0].value.toLocaleString()}</span>
                    </p>
                    {payload[0].payload.percentage && (
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {payload[0].payload.percentage}%
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className={`
        rounded-2xl p-6
        ${isDarkMode
                    ? 'bg-white/5 backdrop-blur-xl border border-white/10'
                    : 'bg-white/80 backdrop-blur-xl border border-gray-200 shadow-lg'
                }
      `}
        >
            <h3 className={`text-lg font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {title}
            </h3>

            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data as any} onClick={(e: any) => e?.activePayload && onBarClick?.(e.activePayload[0].payload)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#ffffff10' : '#00000010'} />
                    <XAxis
                        dataKey="name"
                        stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                        tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                    />
                    <YAxis
                        stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                        tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: isDarkMode ? '#ffffff10' : '#00000010' }} />
                    <Bar
                        dataKey="value"
                        radius={[8, 8, 0, 0]}
                        animationDuration={1000}
                        animationBegin={0}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                        ))}
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

export const RechartsPieChart: React.FC<RechartsPieChartProps> = ({
    data,
    title,
    isDarkMode,
    onSegmentClick,
}) => {
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div
                    className={`
            px-4 py-3 rounded-lg shadow-xl border
            ${isDarkMode ? 'bg-gray-900 border-white/20' : 'bg-white border-gray-200'}
          `}
                >
                    <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {payload[0].name}
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        จำนวน: <span className="font-bold">{payload[0].value.toLocaleString()}</span>
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {payload[0].payload.percentage}%
                    </p>
                </div>
            );
        }
        return null;
    };

    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                className="font-bold text-sm"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`
        rounded-2xl p-6
        ${isDarkMode
                    ? 'bg-white/5 backdrop-blur-xl border border-white/10'
                    : 'bg-white/80 backdrop-blur-xl border border-gray-200 shadow-lg'
                }
      `}
        >
            <h3 className={`text-lg font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {title}
            </h3>

            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data as any}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomLabel}
                        outerRadius={100}
                        innerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        animationDuration={1000}
                        onClick={(entry: any) => onSegmentClick?.(entry)}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value, entry: any) => (
                            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                                {entry.payload.name}
                            </span>
                        )}
                    />
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
            px-4 py-3 rounded-lg shadow-xl border
            ${isDarkMode ? 'bg-gray-900 border-white/20' : 'bg-white border-gray-200'}
          `}
                >
                    <p className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {new Date(label).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                    </p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span style={{ color: entry.color }}>●</span> {entry.name}:{' '}
                            <span className="font-bold">{entry.value.toLocaleString()}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`
        rounded-2xl p-6
        ${isDarkMode
                    ? 'bg-white/5 backdrop-blur-xl border border-white/10'
                    : 'bg-white/80 backdrop-blur-xl border border-gray-200 shadow-lg'
                }
      `}
        >
            <h3 className={`text-lg font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {title}
            </h3>

            <ResponsiveContainer width="100%" height={300}>
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
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#ffffff10' : '#00000010'} />
                    <XAxis
                        dataKey="date"
                        stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                        tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis
                        stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                        tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        verticalAlign="top"
                        height={36}
                        formatter={(value) => {
                            const labels: Record<string, string> = {
                                in: 'รับเข้า',
                                out: 'จ่ายออก',
                                maintenance: 'ซ่อมบำรุง',
                            };
                            return <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{labels[value] || value}</span>;
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="in"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#colorIn)"
                        animationDuration={1500}
                    />
                    <Area
                        type="monotone"
                        dataKey="out"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fill="url(#colorOut)"
                        animationDuration={1500}
                    />
                    <Area
                        type="monotone"
                        dataKey="maintenance"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fill="url(#colorMaintenance)"
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </motion.div>
    );
};
