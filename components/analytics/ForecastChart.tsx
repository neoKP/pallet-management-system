import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { TrendingUp, Brain, Sparkles } from 'lucide-react';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { THEMES } from './ThemeEngine';

interface ForecastDataPoint {
    date: string;
    actual?: number;
    forecast?: number;
    upperBound?: number;
    lowerBound?: number;
    isForecast: boolean;
}

interface ForecastChartProps {
    historicalData: { date: string; value: number }[];
    title: string;
    isDarkMode: boolean;
    forecastDays?: number;
}

/**
 * Simple Moving Average calculation
 */
const calculateSMA = (data: number[], period: number): number => {
    if (data.length < period) return data.reduce((a, b) => a + b, 0) / data.length;
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
};

/**
 * Calculate trend (slope) from recent data
 */
const calculateTrend = (data: number[], period: number): number => {
    if (data.length < 2) return 0;
    const recentData = data.slice(-period);
    const n = recentData.length;

    // Simple linear regression
    const xSum = (n * (n - 1)) / 2;
    const ySum = recentData.reduce((a, b) => a + b, 0);
    const xySum = recentData.reduce((sum, val, i) => sum + val * i, 0);
    const xxSum = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
    return isNaN(slope) ? 0 : slope;
};

/**
 * Generate forecast data points
 */
const generateForecast = (
    historicalData: { date: string; value: number }[],
    forecastDays: number
): ForecastDataPoint[] => {
    const values = historicalData.map(d => d.value);
    const smaPeriod = Math.min(7, values.length);
    const baseValue = calculateSMA(values, smaPeriod);
    const trend = calculateTrend(values, smaPeriod);

    // Calculate standard deviation for confidence bounds
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Historical data
    const result: ForecastDataPoint[] = historicalData.map(d => ({
        date: d.date,
        actual: d.value,
        isForecast: false,
    }));

    // Add transition point (last actual + first forecast)
    const lastActual = historicalData[historicalData.length - 1];
    if (lastActual) {
        result[result.length - 1] = {
            ...result[result.length - 1],
            forecast: lastActual.value,
            upperBound: lastActual.value,
            lowerBound: lastActual.value,
        };
    }

    // Generate forecast points
    const lastDate = new Date(historicalData[historicalData.length - 1]?.date || new Date());

    for (let i = 1; i <= forecastDays; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + i);

        // Forecast value with trend
        const forecastValue = Math.max(0, baseValue + (trend * i));

        // Confidence interval widens over time
        const confidenceMultiplier = 1 + (i * 0.15);
        const upperBound = forecastValue + (stdDev * confidenceMultiplier);
        const lowerBound = Math.max(0, forecastValue - (stdDev * confidenceMultiplier));

        result.push({
            date: nextDate.toISOString().split('T')[0],
            forecast: Math.round(forecastValue),
            upperBound: Math.round(upperBound),
            lowerBound: Math.round(lowerBound),
            isForecast: true,
        });
    }

    return result;
};

export const ForecastChart: React.FC<ForecastChartProps> = ({
    historicalData,
    title,
    isDarkMode,
    forecastDays = 7,
}) => {
    const { themeColor } = useAnalyticsStore();
    const currentTheme = THEMES.find(t => t.id === themeColor) || THEMES[0];

    const chartData = useMemo(() => {
        if (historicalData.length === 0) return [];
        return generateForecast(historicalData, forecastDays);
    }, [historicalData, forecastDays]);

    // Calculate forecast insights
    const insights = useMemo(() => {
        if (chartData.length === 0) return null;

        const actualData = chartData.filter(d => !d.isForecast && d.actual !== undefined);
        const forecastData = chartData.filter(d => d.isForecast);

        if (actualData.length === 0 || forecastData.length === 0) return null;

        const lastActual = actualData[actualData.length - 1].actual!;
        const lastForecast = forecastData[forecastData.length - 1].forecast!;
        const change = ((lastForecast - lastActual) / lastActual) * 100;

        const avgForecast = forecastData.reduce((sum, d) => sum + (d.forecast || 0), 0) / forecastData.length;
        const avgActual = actualData.reduce((sum, d) => sum + (d.actual || 0), 0) / actualData.length;

        return {
            projectedChange: change,
            avgForecast: Math.round(avgForecast),
            avgActual: Math.round(avgActual),
            trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
            confidence: Math.max(0, Math.min(100, 85 - Math.abs(change) * 0.5)),
        };
    }, [chartData]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const dataPoint = chartData.find(d => d.date === label);
            const isForecast = dataPoint?.isForecast;

            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`
                        px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md min-w-[180px]
                        ${isDarkMode ? 'bg-slate-900/95 border-white/20' : 'bg-white/95 border-gray-200'}
                    `}
                >
                    <div className="flex items-center gap-2 mb-2">
                        {isForecast ? (
                            <Brain className="w-4 h-4" style={{ color: currentTheme.primary }} />
                        ) : (
                            <TrendingUp className="w-4 h-4" style={{ color: currentTheme.secondary }} />
                        )}
                        <p
                            className={`font-bold text-xs uppercase tracking-wider transition-colors duration-500`}
                            style={{ color: isDarkMode ? currentTheme.secondary : currentTheme.primary }}
                        >
                            {new Date(label).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>

                    <div className="space-y-1">
                        {payload.map((entry: any, index: number) => {
                            if (entry.value === undefined || entry.value === null) return null;

                            const labels: Record<string, string> = {
                                actual: '📊 ข้อมูลจริง',
                                forecast: '🔮 พยากรณ์',
                                upperBound: '📈 ขอบบน',
                                lowerBound: '📉 ขอบล่าง',
                            };

                            return (
                                <div key={index} className="flex items-center justify-between gap-4">
                                    <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {labels[entry.dataKey] || entry.dataKey}
                                    </span>
                                    <span
                                        className={`text-xs font-bold transition-colors duration-500`}
                                        style={{ color: isDarkMode ? 'white' : 'black' }}
                                    >
                                        {entry.value.toLocaleString()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {isForecast && (
                        <div className={`mt-2 pt-2 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                            <span
                                className="text-[10px] font-medium flex items-center gap-1"
                                style={{ color: currentTheme.secondary }}
                            >
                                <Sparkles className="w-3 h-3" />
                                AI Prediction
                            </span>
                        </div>
                    )}
                </motion.div>
            );
        }
        return null;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
    };

    // Find the transition point between actual and forecast
    const transitionIndex = chartData.findIndex(d => d.isForecast);
    const transitionDate = transitionIndex > 0 ? chartData[transitionIndex - 1]?.date : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                rounded-2xl p-6 relative overflow-hidden group transition-all duration-500
                ${isDarkMode
                    ? 'bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-white/10'
                    : 'bg-gradient-to-br from-white to-gray-50 border border-slate-200 shadow-xl'
                }
                backdrop-blur-xl
            `}
            style={{
                borderLeft: `4px solid ${currentTheme.primary}`,
            }}
        >
            {/* AI Scanline Effect */}
            <motion.div
                className="absolute inset-0 pointer-events-none opacity-[0.05] z-10"
                style={{
                    background: `linear-gradient(transparent, ${currentTheme.primary}, transparent)`,
                    height: '10%',
                }}
                animate={{ top: ['-10%', '110%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div
                        className={`p-2.5 rounded-2xl shadow-lg transition-all duration-500`}
                        style={{
                            backgroundColor: currentTheme.primary,
                            boxShadow: `0 8px 20px ${currentTheme.primary}40`
                        }}
                    >
                        <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3
                            className={`text-lg font-black transition-colors duration-500`}
                            style={{ color: isDarkMode ? 'white' : 'black' }}
                        >
                            {title}
                        </h3>
                        <p
                            className={`text-xs transition-colors duration-500 font-medium`}
                            style={{ color: currentTheme.secondary }}
                        >
                            📊 ข้อมูลจริง + 🔮 พยากรณ์ {forecastDays} วันล่วงหน้า
                        </p>
                    </div>
                </div>

                {/* Insights Badge */}
                {insights && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className={`
                            flex items-center gap-4 px-4 py-2 rounded-xl
                            ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-purple-50 border border-purple-100'}
                        `}
                    >
                        <div className="text-center">
                            <p className={`text-[10px] font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                แนวโน้ม
                            </p>
                            <p className={`text-sm font-bold ${insights.trend === 'up' ? 'text-green-500' :
                                insights.trend === 'down' ? 'text-red-500' : 'text-yellow-500'
                                }`}>
                                {insights.trend === 'up' ? '📈 +' : insights.trend === 'down' ? '📉 ' : '➡️ '}
                                {Math.abs(insights.projectedChange).toFixed(1)}%
                            </p>
                        </div>
                        <div className={`w-px h-8 ${isDarkMode ? 'bg-white/10' : 'bg-purple-200'}`} />
                        <div className="text-center">
                            <p className={`text-[10px] font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                ค่าเฉลี่ยพยากรณ์
                            </p>
                            <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {insights.avgForecast.toLocaleString()}
                            </p>
                        </div>
                        <div className={`w-px h-8 ${isDarkMode ? 'bg-white/10' : 'bg-purple-200'}`} />
                        <div className="text-center">
                            <p className={`text-[10px] font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                ความเชื่อมั่น
                            </p>
                            <p className={`text-sm font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                {insights.confidence.toFixed(0)}%
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        {/* Actual Data Gradient */}
                        <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>

                        {/* Forecast Gradient */}
                        <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                        </linearGradient>

                        {/* Confidence Band Gradient */}
                        <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        stroke={isDarkMode ? '#ffffff08' : '#00000008'}
                    />

                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        stroke={isDarkMode ? '#64748b' : '#94a3b8'}
                        tick={{ fill: isDarkMode ? '#64748b' : '#64748b', fontSize: 11 }}
                        tickFormatter={formatDate}
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
                        height={36}
                        formatter={(value) => {
                            const labels: Record<string, string> = {
                                actual: '📊 ข้อมูลจริง',
                                forecast: '🔮 พยากรณ์',
                            };
                            return (
                                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {labels[value] || value}
                                </span>
                            );
                        }}
                    />

                    {/* Reference line at transition point */}
                    {transitionDate && (
                        <ReferenceLine
                            x={transitionDate}
                            stroke={isDarkMode ? '#a855f7' : '#9333ea'}
                            strokeDasharray="4 4"
                            strokeWidth={2}
                            label={{
                                value: '🔮 เริ่มพยากรณ์',
                                position: 'top',
                                fill: isDarkMode ? '#a855f7' : '#9333ea',
                                fontSize: 10,
                                fontWeight: 'bold',
                            }}
                        />
                    )}

                    {/* Confidence Band (Upper and Lower) */}
                    <Area
                        type="monotone"
                        dataKey="upperBound"
                        stroke="none"
                        fill="url(#confidenceGradient)"
                        animationDuration={2000}
                    />
                    <Area
                        type="monotone"
                        dataKey="lowerBound"
                        stroke="none"
                        fill={isDarkMode ? '#0f172a' : '#ffffff'}
                        animationDuration={2000}
                    />

                    {/* Actual Data Line */}
                    <Area
                        type="monotone"
                        dataKey="actual"
                        stroke="#3b82f6"
                        strokeWidth={4}
                        fill="url(#actualGradient)"
                        animationDuration={1500}
                        dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                        activeDot={{
                            r: 8,
                            fill: '#3b82f6',
                            stroke: '#ffffff',
                            strokeWidth: 2,
                            className: "animate-pulse"
                        }}
                    />

                    {/* Forecast Line */}
                    <Area
                        type="monotone"
                        dataKey="forecast"
                        stroke="#a855f7"
                        strokeWidth={4}
                        strokeDasharray="10 5"
                        fill="url(#forecastGradient)"
                        animationDuration={2500}
                        animationBegin={800}
                        dot={{ r: 4, fill: '#a855f7', strokeWidth: 0 }}
                        activeDot={{
                            r: 8,
                            fill: '#a855f7',
                            stroke: '#ffffff',
                            strokeWidth: 2,
                            className: "animate-bounce"
                        }}
                    />
                </AreaChart>
            </ResponsiveContainer>

            {/* AI Insight Footer */}
            {insights && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className={`
                        mt-4 p-4 rounded-xl flex items-start gap-3
                        ${isDarkMode ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-100'}
                    `}
                >
                    <Sparkles className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                            🧠 AI Insight
                        </p>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {insights.trend === 'up' && (
                                <>
                                    📈 ระบบคาดการณ์ว่าจะมีการเติบโต <span className="font-bold text-green-500">+{insights.projectedChange.toFixed(1)}%</span> ในช่วง {forecastDays} วันข้างหน้า
                                    ค่าเฉลี่ยพยากรณ์อยู่ที่ <span className="font-bold">{insights.avgForecast.toLocaleString()}</span> ต่อวัน
                                </>
                            )}
                            {insights.trend === 'down' && (
                                <>
                                    📉 ระบบคาดการณ์ว่าจะมีการลดลง <span className="font-bold text-red-500">{insights.projectedChange.toFixed(1)}%</span> ในช่วง {forecastDays} วันข้างหน้า
                                    แนะนำให้เตรียมแผนรับมือล่วงหน้า
                                </>
                            )}
                            {insights.trend === 'stable' && (
                                <>
                                    ➡️ ระบบคาดการณ์ว่าข้อมูลจะคงที่ในช่วง {forecastDays} วันข้างหน้า
                                    ไม่มีความเปลี่ยนแปลงที่มีนัยสำคัญ
                                </>
                            )}
                        </p>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default ForecastChart;
