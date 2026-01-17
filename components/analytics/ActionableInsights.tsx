import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    ArrowRight,
    Lightbulb,
    Shield,
    Truck,
    Package,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Zap,
} from 'lucide-react';
import { BranchPerformance, PalletTypeAnalysis, KPIMetrics } from '../../services/analyticsService';

interface ActionableInsightsProps {
    kpis: KPIMetrics;
    branchPerformance: BranchPerformance[];
    palletAnalysis: PalletTypeAnalysis[];
    isDarkMode: boolean;
}

type InsightType = 'warning' | 'success' | 'info' | 'action';
type Priority = 'high' | 'medium' | 'low';

interface Insight {
    id: string;
    type: InsightType;
    priority: Priority;
    title: string;
    description: string;
    action?: string;
    impact?: string;
    icon: React.ReactNode;
}

export const ActionableInsights: React.FC<ActionableInsightsProps> = ({
    kpis,
    branchPerformance,
    palletAnalysis,
    isDarkMode,
}) => {
    const insights = useMemo(() => {
        const result: Insight[] = [];

        // 1. Stock Capacity Warning
        const highUtilizationBranches = branchPerformance.filter(b => b.utilizationRate > 85);
        if (highUtilizationBranches.length > 0) {
            result.push({
                id: 'high-utilization',
                type: 'warning',
                priority: 'high',
                title: '⚠️ สาขามีพาเลทในคลังสูง',
                description: `สาขา ${highUtilizationBranches.map(b => b.branchName).join(', ')} มีพาเลทในคลังเกิน 85% ของความจุ`,
                action: 'โอนย้ายพาเลทไปยังสาขาที่มีความต้องการ',
                impact: `เพิ่มประสิทธิภาพการหมุนเวียนพาเลท ${Math.min(highUtilizationBranches.length * 8, 25)}%`,
                icon: <AlertTriangle className="w-5 h-5" />,
            });
        }

        // 2. Low Utilization Opportunity
        const lowUtilizationBranches = branchPerformance.filter(b => b.utilizationRate < 30 && b.totalStock > 0);
        if (lowUtilizationBranches.length > 0 && highUtilizationBranches.length > 0) {
            const fromBranch = highUtilizationBranches[0];
            const toBranch = lowUtilizationBranches[0];
            const suggestedQty = Math.round(fromBranch.totalStock * 0.15);

            result.push({
                id: 'rebalance-stock',
                type: 'action',
                priority: 'high',
                title: '📦 แนะนำโอนย้ายพาเลท',
                description: `โอนพาเลท ${suggestedQty} ชิ้น จาก ${fromBranch.branchName} (เกินความต้องการ) ไปยัง ${toBranch.branchName} (ขาดแคลน)`,
                action: 'สร้างใบรายการโอนย้ายพาเลท',
                impact: `ลดการสั่งพาเลทใหม่ เพิ่มประสิทธิภาพการหมุนเวียน 12%`,
                icon: <Truck className="w-5 h-5" />,
            });
        }

        // 3. Maintenance Rate Check
        if (kpis.maintenanceRate > 15) {
            result.push({
                id: 'high-maintenance',
                type: 'warning',
                priority: 'medium',
                title: '🔧 พาเลทเข้าซ่อมบำรุงสูง',
                description: `มีพาเลทเข้าซ่อมบำรุง ${kpis.maintenanceRate}% ซึ่งสูงกว่าค่าเฉลี่ย (10%)`,
                action: 'ตรวจสอบสาเหตุความเสียหายของพาเลท',
                impact: 'ยืดอายุการใช้งานพาเลท ลดค่าซ่อม 20%',
                icon: <RefreshCw className="w-5 h-5" />,
            });
        } else if (kpis.maintenanceRate < 5) {
            result.push({
                id: 'low-maintenance',
                type: 'success',
                priority: 'low',
                title: '✅ อัตราซ่อมบำรุงอยู่ในเกณฑ์ดี',
                description: `อัตราซ่อมบำรุงอยู่ที่ ${kpis.maintenanceRate}% ซึ่งต่ำกว่าค่าเฉลี่ย`,
                icon: <CheckCircle2 className="w-5 h-5" />,
            });
        }

        // 4. Trend Analysis
        if (kpis.trend === 'up' && kpis.trendPercentage > 10) {
            result.push({
                id: 'positive-trend',
                type: 'success',
                priority: 'medium',
                title: '📈 การหมุนเวียนพาเลทเพิ่มขึ้น',
                description: `การเคลื่อนไหวพาเลทเพิ่มขึ้น ${kpis.trendPercentage}% จากช่วงก่อนหน้า`,
                action: 'เตรียมพาเลทสำรองรองรับความต้องการที่สูงขึ้น',
                icon: <TrendingUp className="w-5 h-5" />,
            });
        } else if (kpis.trend === 'down' && kpis.trendPercentage > 10) {
            result.push({
                id: 'negative-trend',
                type: 'warning',
                priority: 'high',
                title: '📉 การหมุนเวียนพาเลทลดลง',
                description: `การเคลื่อนไหวพาเลทลดลง ${kpis.trendPercentage}% จากช่วงก่อนหน้า`,
                action: 'ตรวจสอบความต้องการใช้งานของแต่ละสาขา',
                impact: 'อาจมีพาเลทค้างสต็อกเกินความจำเป็น',
                icon: <TrendingDown className="w-5 h-5" />,
            });
        }

        // 5. Top Pallet Type Insight
        if (palletAnalysis.length > 0) {
            const topPallet = palletAnalysis[0];
            if ((topPallet.percentage || 0) > 40) {
                result.push({
                    id: 'pallet-concentration',
                    type: 'info',
                    priority: 'low',
                    title: '📊 พาเลทประเภทใช้งานมากที่สุด',
                    description: `${topPallet.palletName} ถูกใช้งาน ${(topPallet.percentage || 0).toFixed(1)}% ของการหมุนเวียนทั้งหมด`,
                    action: 'ควรเตรียมพาเลทประเภทนี้ให้พร้อมใช้งาน',
                    icon: <Package className="w-5 h-5" />,
                });
            }
        }

        // 6. Optimal Status
        if (kpis.utilizationRate >= 70 && kpis.utilizationRate <= 85) {
            result.push({
                id: 'optimal-status',
                type: 'success',
                priority: 'low',
                title: '🎯 การหมุนเวียนพาเลทสมดุล',
                description: `อัตราการใช้พาเลทอยู่ที่ ${kpis.utilizationRate}% การกระจายระหว่างสาขาสมดุลดี`,
                icon: <Shield className="w-5 h-5" />,
            });
        }

        // Sort by priority
        const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
        return result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }, [kpis, branchPerformance, palletAnalysis]);

    const getTypeStyles = (type: InsightType) => {
        switch (type) {
            case 'warning':
                return {
                    bg: isDarkMode ? 'bg-amber-500/10' : 'bg-amber-50',
                    border: isDarkMode ? 'border-amber-500/30' : 'border-amber-200',
                    icon: 'text-amber-500',
                    badge: 'bg-amber-500/20 text-amber-500',
                };
            case 'success':
                return {
                    bg: isDarkMode ? 'bg-green-500/10' : 'bg-green-50',
                    border: isDarkMode ? 'border-green-500/30' : 'border-green-200',
                    icon: 'text-green-500',
                    badge: 'bg-green-500/20 text-green-500',
                };
            case 'action':
                return {
                    bg: isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50',
                    border: isDarkMode ? 'border-purple-500/30' : 'border-purple-200',
                    icon: 'text-purple-500',
                    badge: 'bg-purple-500/20 text-purple-500',
                };
            default:
                return {
                    bg: isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50',
                    border: isDarkMode ? 'border-blue-500/30' : 'border-blue-200',
                    icon: 'text-blue-500',
                    badge: 'bg-blue-500/20 text-blue-500',
                };
        }
    };

    const getPriorityBadge = (priority: Priority) => {
        switch (priority) {
            case 'high':
                return { text: 'สำคัญมาก', style: 'bg-red-500 text-white' };
            case 'medium':
                return { text: 'ปานกลาง', style: 'bg-yellow-500 text-white' };
            default:
                return { text: 'ทั่วไป', style: isDarkMode ? 'bg-slate-600 text-white' : 'bg-slate-300 text-slate-700' };
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                rounded-2xl p-6 relative overflow-hidden
                ${isDarkMode
                    ? 'bg-gradient-to-br from-slate-900/60 to-emerald-950/30 border border-emerald-500/20'
                    : 'bg-gradient-to-br from-white to-emerald-50 border border-emerald-200 shadow-lg'
                }
            `}
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                    <Brain className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        🧠 Actionable AI Insights
                    </h3>
                    <p className={`text-xs ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        คำแนะนำเชิงปฏิบัติอัตโนมัติจากระบบ AI
                    </p>
                </div>
                <div className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                    {insights.length} รายการ
                </div>
            </div>

            {/* Insights List */}
            <div className="space-y-4">
                <AnimatePresence>
                    {insights.map((insight, index) => {
                        const styles = getTypeStyles(insight.type);
                        const priority = getPriorityBadge(insight.priority);

                        return (
                            <motion.div
                                key={insight.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{
                                    y: -5,
                                    scale: 1.02,
                                    boxShadow: isDarkMode
                                        ? '0 20px 40px -10px rgba(0,0,0,0.5)'
                                        : '0 20px 40px -10px rgba(0,0,0,0.15)'
                                }}
                                className={`
                                    p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden
                                    ${styles.bg} ${styles.border}
                                    ${insight.priority === 'high' ? 'urgency-pulse' : ''}
                                `}
                            >
                                {/* Urgency Pulse Glow for High Priority */}
                                {insight.priority === 'high' && (
                                    <motion.div
                                        className="absolute inset-0 rounded-xl pointer-events-none"
                                        animate={{
                                            boxShadow: [
                                                `inset 0 0 0 2px ${insight.type === 'warning' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                                `inset 0 0 0 2px ${insight.type === 'warning' ? 'rgba(245, 158, 11, 0.8)' : 'rgba(239, 68, 68, 0.8)'}`,
                                                `inset 0 0 0 2px ${insight.type === 'warning' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                            ],
                                        }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    />
                                )}

                                <div className="flex items-start gap-3 relative z-10">
                                    <motion.div
                                        className={`mt-0.5 ${styles.icon}`}
                                        animate={insight.priority === 'high' ? { scale: [1, 1.2, 1] } : {}}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        {insight.icon}
                                    </motion.div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {insight.title}
                                            </h4>
                                            <motion.span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${priority.style}`}
                                                animate={insight.priority === 'high' ? {
                                                    scale: [1, 1.05, 1],
                                                } : {}}
                                                transition={{ duration: 1, repeat: Infinity }}
                                            >
                                                {priority.text}
                                            </motion.span>
                                        </div>
                                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {insight.description}
                                        </p>

                                        {(insight.action || insight.impact) && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {insight.action && (
                                                    <motion.div
                                                        className={`relative flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold overflow-hidden cursor-pointer ${styles.badge}`}
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        {/* Liquid Gradient Background on Hover */}
                                                        <motion.div
                                                            className="absolute inset-0 opacity-0 hover:opacity-100"
                                                            style={{
                                                                background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`,
                                                                backgroundSize: '200% 100%',
                                                            }}
                                                            animate={{
                                                                backgroundPosition: ['200% 0', '-200% 0'],
                                                            }}
                                                            transition={{ duration: 2, repeat: Infinity }}
                                                        />
                                                        <Zap className="w-3 h-3 relative z-10" />
                                                        <span className="relative z-10">{insight.action}</span>
                                                    </motion.div>
                                                )}
                                                {insight.impact && (
                                                    <motion.div
                                                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}
                                                        whileHover={{ scale: 1.02 }}
                                                    >
                                                        <Lightbulb className="w-3 h-3" />
                                                        ผลกระทบ: {insight.impact}
                                                    </motion.div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {insights.length === 0 && (
                    <div className={`text-center py-8 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">ระบบทำงานปกติ ไม่มีคำแนะนำเพิ่มเติม</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ActionableInsights;
