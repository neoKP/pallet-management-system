import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
    className?: string;
    isDarkMode: boolean;
    style?: React.CSSProperties;
}

const SkeletonBase: React.FC<SkeletonProps> = ({ className = '', isDarkMode, style }) => (
    <div
        className={`animate-pulse rounded-lg js-dynamic-height js-dynamic-vars ${className} ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}
        style={{ ...style, '--dynamic-height': style?.height } as React.CSSProperties}
    />
);

export const KPICardSkeleton: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => (
    <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-4`}>
        <div className="flex justify-between items-start">
            <SkeletonBase className="h-4 w-24" isDarkMode={isDarkMode} />
            <SkeletonBase className="h-10 w-10 rounded-lg" isDarkMode={isDarkMode} />
        </div>
        <SkeletonBase className="h-8 w-32" isDarkMode={isDarkMode} />
        <div className="h-10 w-full mt-4">
            <SkeletonBase className="h-full w-full opacity-50" isDarkMode={isDarkMode} />
        </div>
    </div>
);

export const ChartSkeleton: React.FC<{ title: string; isDarkMode: boolean; height?: number }> = ({
    title,
    isDarkMode,
    height = 300
}) => (
    <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
        <div className="flex justify-between items-center mb-6">
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
            <SkeletonBase className="h-4 w-16" isDarkMode={isDarkMode} />
        </div>
        <div style={{ height } as React.CSSProperties} className="flex items-end gap-2 px-2">
            {[...Array(12)].map((_, i) => (
                <SkeletonBase
                    key={i}
                    className="flex-1"
                    style={{ '--dynamic-height': `${20 + Math.random() * 80}%` } as React.CSSProperties}
                    isDarkMode={isDarkMode}
                />
            ))}
        </div>
        <div className="mt-4 flex justify-between">
            <SkeletonBase className="h-3 w-12" isDarkMode={isDarkMode} />
            <SkeletonBase className="h-3 w-12" isDarkMode={isDarkMode} />
            <SkeletonBase className="h-3 w-12" isDarkMode={isDarkMode} />
        </div>
    </div>
);

export const ComparisonSkeleton: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => (
    <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-6`}>
        <div className="flex justify-between items-center">
            <SkeletonBase className="h-5 w-40" isDarkMode={isDarkMode} />
            <SkeletonBase className="h-10 w-10 rounded-full" isDarkMode={isDarkMode} />
        </div>
        <div className="space-y-4">
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <SkeletonBase className="h-4 w-20" isDarkMode={isDarkMode} />
                    <SkeletonBase className="h-8 w-24" isDarkMode={isDarkMode} />
                </div>
                <SkeletonBase className="h-4 w-16" isDarkMode={isDarkMode} />
            </div>
            <div className="h-2 w-full">
                <SkeletonBase className="h-full w-full rounded-full" isDarkMode={isDarkMode} />
            </div>
            <div className="flex justify-between">
                <SkeletonBase className="h-3 w-16" isDarkMode={isDarkMode} />
                <SkeletonBase className="h-3 w-16" isDarkMode={isDarkMode} />
            </div>
        </div>
    </div>
);

export const AnalyticsSkeleton: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => (
    <div className="space-y-8 animate-in fade-in duration-500">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
                <KPICardSkeleton key={i} isDarkMode={isDarkMode} />
            ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartSkeleton title="Loading Trends..." isDarkMode={isDarkMode} />
            <ChartSkeleton title="Loading Status..." isDarkMode={isDarkMode} />
            <ChartSkeleton title="Loading Branches..." isDarkMode={isDarkMode} />
            <ChartSkeleton title="Loading Pallet Types..." isDarkMode={isDarkMode} />
        </div>

        {/* Advanced Section */}
        <div className="space-y-6">
            <SkeletonBase className="h-8 w-64" isDarkMode={isDarkMode} />
            <ChartSkeleton title="Loading Flow..." isDarkMode={isDarkMode} height={400} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ComparisonSkeleton isDarkMode={isDarkMode} />
                <ComparisonSkeleton isDarkMode={isDarkMode} />
                <ComparisonSkeleton isDarkMode={isDarkMode} />
            </div>
        </div>
    </div>
);
