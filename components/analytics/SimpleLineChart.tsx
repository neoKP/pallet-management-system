import React, { useState } from 'react';
import { TimeSeriesData } from '../../services/analyticsService';

interface SimpleLineChartProps {
    data: TimeSeriesData[];
    title: string;
    isDarkMode: boolean;
    height?: number;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
    data,
    title,
    isDarkMode,
    height = 300,
}) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set(['in', 'out', 'maintenance']));

    if (data.length === 0) {
        return (
            <div className={`rounded-2xl p-6 ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'}`}>
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                <p className={`mt-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>ไม่มีข้อมูล</p>
            </div>
        );
    }

    const maxValue = Math.max(
        ...data.map(d => Math.max(d.in, d.out, d.maintenance, d.total)),
        1
    );

    const lines = [
        { key: 'in', label: 'รับเข้า', color: '#3b82f6' },
        { key: 'out', label: 'จ่ายออก', color: '#f59e0b' },
        { key: 'maintenance', label: 'ซ่อมบำรุง', color: '#8b5cf6' },
    ];

    const toggleLine = (key: string) => {
        const newSelected = new Set(selectedLines);
        if (newSelected.has(key)) {
            newSelected.delete(key);
        } else {
            newSelected.add(key);
        }
        setSelectedLines(newSelected);
    };

    const getPath = (dataKey: 'in' | 'out' | 'maintenance') => {
        const points = data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - (d[dataKey] / maxValue) * 100;
            return `${x},${y}`;
        });
        return `M ${points.join(' L ')}`;
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
    };

    return (
        <div
            className={`
        rounded-2xl p-6
        ${isDarkMode
                    ? 'bg-white/5 backdrop-blur-xl border border-white/10'
                    : 'bg-white/80 backdrop-blur-xl border border-gray-200 shadow-lg'
                }
      `}
        >
            <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {title}
                </h3>

                {/* Legend / Toggle */}
                <div className="flex gap-4">
                    {lines.map((line) => (
                        <button
                            key={line.key}
                            onClick={() => toggleLine(line.key)}
                            className={`
                flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium
                transition-all duration-300
                ${selectedLines.has(line.key)
                                    ? 'opacity-100'
                                    : 'opacity-40 hover:opacity-60'
                                }
              `}
                        >
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: line.color }}
                            />
                            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                                {line.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative" style={{ height: `${height}px` }}>
                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="w-full h-full"
                >
                    {/* Grid Lines */}
                    {[0, 25, 50, 75, 100].map((y) => (
                        <line
                            key={y}
                            x1="0"
                            y1={y}
                            x2="100"
                            y2={y}
                            stroke={isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                            strokeWidth="0.2"
                        />
                    ))}

                    {/* Lines */}
                    {lines.map((line) => {
                        if (!selectedLines.has(line.key)) return null;

                        return (
                            <g key={line.key}>
                                {/* Area Fill */}
                                <path
                                    d={`${getPath(line.key as 'in' | 'out' | 'maintenance')} L 100,100 L 0,100 Z`}
                                    fill={`${line.color}20`}
                                    className="transition-all duration-500"
                                />

                                {/* Line */}
                                <path
                                    d={getPath(line.key as 'in' | 'out' | 'maintenance')}
                                    fill="none"
                                    stroke={line.color}
                                    strokeWidth="0.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="transition-all duration-500"
                                    style={{
                                        filter: `drop-shadow(0 0 4px ${line.color}80)`,
                                    }}
                                />

                                {/* Data Points */}
                                {data.map((d, i) => {
                                    const x = (i / (data.length - 1)) * 100;
                                    const y = 100 - (d[line.key as 'in' | 'out' | 'maintenance'] / maxValue) * 100;
                                    const isHovered = hoveredIndex === i;

                                    return (
                                        <circle
                                            key={i}
                                            cx={x}
                                            cy={y}
                                            r={isHovered ? "1.5" : "0.8"}
                                            fill={line.color}
                                            className="transition-all duration-300 cursor-pointer"
                                            onMouseEnter={() => setHoveredIndex(i)}
                                            onMouseLeave={() => setHoveredIndex(null)}
                                            style={{
                                                filter: isHovered ? `drop-shadow(0 0 4px ${line.color})` : 'none',
                                            }}
                                        />
                                    );
                                })}
                            </g>
                        );
                    })}
                </svg>

                {/* Tooltip */}
                {hoveredIndex !== null && (
                    <div
                        className={`
              absolute top-0 left-0 transform -translate-x-1/2 -translate-y-full
              px-4 py-3 rounded-lg shadow-xl
              ${isDarkMode
                                ? 'bg-gray-900 border border-white/20'
                                : 'bg-white border border-gray-200'
                            }
              pointer-events-none z-10
            `}
                        style={{
                            left: `${(hoveredIndex / (data.length - 1)) * 100}%`,
                            top: '0',
                        }}
                    >
                        <div className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {formatDate(data[hoveredIndex].date)}
                        </div>
                        {lines.map((line) => {
                            if (!selectedLines.has(line.key)) return null;
                            const value = data[hoveredIndex][line.key as 'in' | 'out' | 'maintenance'];
                            return (
                                <div key={line.key} className="flex items-center gap-2 text-sm">
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: line.color }}
                                    />
                                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                                        {line.label}:
                                    </span>
                                    <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {value.toLocaleString()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* X-Axis Labels */}
            <div className="flex justify-between mt-4">
                {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((d, i) => (
                    <div
                        key={i}
                        className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                        {formatDate(d.date)}
                    </div>
                ))}
            </div>
        </div>
    );
};
