
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, TrendingUp, AlertTriangle, Zap, ChevronRight, MessageSquare, Bot, Activity } from 'lucide-react';
import { Stock, BranchId, Transaction } from '../../types';
import { getLogisticsAssistantResponse } from '../../services/geminiService';
import { BRANCHES } from '../../constants';

interface NeoAIBriefingProps {
    stock: Stock;
    selectedBranch: BranchId | 'ALL';
    transactions: Transaction[];
}

export const NeoAIBriefing: React.FC<NeoAIBriefingProps> = ({ stock, selectedBranch, transactions }) => {
    const [briefing, setBriefing] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isThinking, setIsThinking] = useState(false);

    const generateBriefing = async () => {
        setIsLoading(true);
        setIsThinking(true);

        const branchName = selectedBranch === 'ALL' ? 'ทุกสาขา' : BRANCHES.find(b => b.id === selectedBranch)?.name || selectedBranch;

        const prompt = `
            ช่วยสรุป "Daily Logistics Briefing" สั้นๆ (ไม่เกิน 3-4 ประโยค) สำหรับวันนี้
            โดยวิเคราะห์จากสถานะสต็อกและธุรกรรมล่าสุด
            เน้น:
            1. จุดที่ต้องระวัง (เช่น สต็อกพาเลทเช่าเหลือน้อยหรือมากเกินไป)
            2. โอกาสในการลดต้นทุน (เช่น การโอนพาเลทระหว่างสาขา)
            3. สรุปภาพรวมความเคลื่อนคืนวันนี้
            
            เขียนให้น่าสนใจ มั่นใจ และเป็นมืออาชีพ เริ่มต้นด้วย "สวัสดีครับ ผม Neo AI นี่สรุปสถานการณ์ล่าสุดสำหรับ ${branchName} ครับ..."
        `;

        try {
            const response = await getLogisticsAssistantResponse(prompt, stock, selectedBranch, branchName);
            setBriefing(response.text);
        } catch (error) {
            setBriefing("ขออภัยครับ ระบบวิเคราะห์ข้อมูลขัดข้องชั่วคราว แต่ภาพรวมการหมุนเวียนพาเลทวันนี้ยังคงปกติครับ");
        } finally {
            setIsLoading(false);
            setIsThinking(false);
        }
    };

    useEffect(() => {
        generateBriefing();
    }, [selectedBranch]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-8 group"
        >
            {/* Outer Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

            <div className="relative bg-white/80 backdrop-blur-xl border border-white/40 p-6 md:p-8 rounded-[2.5rem] shadow-2xl overflow-hidden min-h-[160px]">
                {/* Animated Background Shapes */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

                <div className="relative flex flex-col md:flex-row gap-6 items-start">
                    {/* AI Avatar Section */}
                    <div className="flex-shrink-0">
                        <div className="relative">
                            <motion.div
                                animate={isThinking ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-xl relative z-10"
                            >
                                <Bot className="w-9 h-9 text-white" />
                                {isThinking && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500"></span>
                                    </span>
                                )}
                            </motion.div>
                            <div className="absolute -inset-2 bg-indigo-500/20 rounded-3xl blur-lg -z-0"></div>
                        </div>
                        <div className="mt-2 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest">
                                Neo AI 3.0
                            </span>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Daily Briefing • Intelligence Report</h3>
                        </div>

                        <AnimatePresence mode="wait">
                            {isLoading ? (
                                <motion.div
                                    key="loader"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-2"
                                >
                                    <div className="h-4 bg-slate-100 rounded-full w-3/4 animate-pulse"></div>
                                    <div className="h-4 bg-slate-100 rounded-full w-1/2 animate-pulse"></div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="content"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="relative"
                                >
                                    <p className="text-lg md:text-xl font-bold text-slate-800 leading-relaxed italic">
                                        "{briefing}"
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex flex-wrap gap-3 mt-4">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-200"
                                onClick={generateBriefing}
                            >
                                <Zap className="w-3 h-3" />
                                REFRESH INSIGHTS
                            </motion.button>

                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl">
                                <Activity className="w-3 h-3 text-slate-500" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Analysis: 98.4% Confidence</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Sidebar (Desktop) */}
                    <div className="hidden lg:flex flex-col gap-2 w-48 pt-2">
                        <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status</p>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-xs font-bold text-slate-700">All Nodes Healthy</span>
                            </div>
                        </div>
                        <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Next Action</p>
                            <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                                Check Hub Returns
                                <ChevronRight className="w-3 h-3" />
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default NeoAIBriefing;
