import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserIcon, Lock, ShieldCheck, LogIn, X } from 'lucide-react';
import BrandLogo from '../common/BrandLogo';
import { User } from '../../types';
import { AUTHORIZED_USERS } from '../../constants';

interface LoginScreenProps {
    onLogin: (user: User) => void;
    onClose?: () => void;
    isModal?: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onClose, isModal }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const user = AUTHORIZED_USERS.find(u => u.username === username);

        // สำหรับ System Administrator (admin) ใช้รหัส 8888
        // สำหรับผู้ใช้อื่นๆ (Operator/Staff) ใช้รหัส 1234
        const requiredPassword = username === 'admin' ? '8888' : '1234';

        if (user && password === requiredPassword) {
            onLogin(user);
        } else {
            setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }
    };

    return (
        <div className={`${isModal ? 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500' : 'min-h-screen flex items-center justify-center p-4 md:p-6 bg-slate-100/50'}`}>
            <div className={`w-full max-w-md ${isModal ? 'animate-in zoom-in-95 slide-in-from-bottom-4 duration-500' : ''}`}>
                <div className="bg-white/90 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-200/50 relative overflow-hidden">
                    {/* Decorative Background Elements */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl" />

                    {isModal && onClose && (
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-900 cursor-pointer active:scale-90"
                            title="ปิด"
                            aria-label="Close login modal"
                        >
                            <X size={20} />
                        </button>
                    )}

                    <div className="text-center mb-10 relative z-10">
                        <div className="flex justify-center mb-6">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", damping: 12 }}
                            >
                                <BrandLogo className="w-24 h-24 md:w-32 shadow-2xl rounded-3xl" />
                            </motion.div>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2">
                            Welcome Back
                        </h1>
                        <p className="text-slate-500 text-sm font-medium">
                            Log in to manage Neosiam Pallet Systems
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                                <UserIcon size={12} className="text-blue-500" />
                                Identify Yourself
                            </label>
                            <div className="relative group">
                                <select
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-slate-300 transition-all cursor-pointer appearance-none"
                                    title="เลือกชื่อผู้ใช้"
                                    required
                                >
                                    <option value="" className="text-slate-400">Select Branch / User</option>
                                    {AUTHORIZED_USERS.map(user => (
                                        <option key={user.username} value={user.username} className="text-slate-900 font-bold">
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                                <Lock size={12} className="text-blue-500" />
                                Security Access
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-slate-300 transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-xs font-bold leading-relaxed shadow-sm"
                            >
                                ⚠️ {error}
                            </motion.div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 cursor-pointer"
                        >
                            <LogIn size={18} />
                            Authenticate
                        </motion.button>
                    </form>

                    <div className="mt-10 text-center relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                            <ShieldCheck size={12} className="text-blue-500" />
                            Secure Access: Admin (8888) | Staff (1234)
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-center text-xs font-black text-slate-400 uppercase tracking-widest opacity-50">
                    Enterprise Pallet Terminal
                </p>
            </div>
        </div>
    );
};


export default LoginScreen;
