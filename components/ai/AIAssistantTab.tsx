import React from 'react';
import { Sparkles, ExternalLink, Send } from 'lucide-react';

interface AIAssistantTabProps {
    aiChat: { role: 'user' | 'bot'; text: string; links?: any[] }[];
    aiQuery: string;
    isAiLoading: boolean;
    onQueryChange: (query: string) => void;
    onSend: () => void;
    chatEndRef: React.RefObject<HTMLDivElement | null>;
}

const AIAssistantTab: React.FC<AIAssistantTabProps> = ({
    aiChat,
    aiQuery,
    isAiLoading,
    onQueryChange,
    onSend,
    chatEndRef
}) => {
    return (
        <div className="glass p-6 rounded-3xl border border-slate-200 bg-white max-w-4xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-2">
                    <Sparkles className="text-yellow-500" />
                    Neo AI Assistant
                </h2>
                <p className="text-slate-500 text-sm">
                    ผู้ช่วยอัจฉริยะสำหรับการจัดการพาเลท - ถามคำถามเกี่ยวกับสต็อก การจัดการ และคำแนะนำต่างๆ
                </p>
            </div>

            {/* Chat Area */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 h-[500px] overflow-y-auto">
                {aiChat.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                        <Sparkles size={48} className="mb-4 text-yellow-500/50" />
                        <p className="text-slate-500">เริ่มต้นการสนทนากับ Neo AI Assistant</p>
                        <p className="text-sm mt-2 text-slate-400">ลองถามเกี่ยวกับสต็อก การจัดการพาเลท หรือคำแนะนำต่างๆ</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {aiChat.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                                        : 'bg-white border border-slate-200 text-slate-700 shadow-sm'
                                        }`}
                                >
                                    <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                                    {msg.links && msg.links.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-slate-200">
                                            {msg.links.map((link: any, i: number) => (
                                                <a
                                                    key={i}
                                                    href={link.web?.uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 mt-1"
                                                >
                                                    <ExternalLink size={12} />
                                                    {link.web?.title || link.web?.uri}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isAiLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-200 text-slate-400 p-4 rounded-2xl shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce animate-delay-200" />
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce animate-delay-400" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="flex gap-3">
                <input
                    type="text"
                    value={aiQuery}
                    onChange={(e) => onQueryChange(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && onSend()}
                    placeholder="พิมพ์คำถามของคุณ..."
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isAiLoading}
                />
                <button
                    onClick={onSend}
                    disabled={!aiQuery.trim() || isAiLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="ส่งข้อความ"
                    aria-label="ส่งข้อความ"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
};

export default AIAssistantTab;
