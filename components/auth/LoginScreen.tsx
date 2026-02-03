import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserIcon, Lock, ShieldCheck, LogIn, X, Loader2 } from 'lucide-react';
import BrandLogo from '../common/BrandLogo';
import { User } from '../../types';
import { AUTHORIZED_USERS } from '../../constants';

interface LoginScreenProps {
    onLogin: (user: User) => void;
    onClose?: () => void;
    isModal?: boolean;
    isDarkMode?: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onClose, isModal, isDarkMode = true }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Simulate network delay for premium feel
        await new Promise(resolve => setTimeout(resolve, 800));

        const user = AUTHORIZED_USERS.find(u => u.username === username);
        const requiredPassword = username === 'admin' ? '8888' : '1234';

        if (user && password === requiredPassword) {
            onLogin(user);
        } else {
            setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
            setIsLoading(false);
        }
    };

    return (
        <div className={`
            ${isModal
                ? 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl'
                : 'min-h-screen flex items-center justify-center p-4 md:p-6 bg-slate-950'}
            transition-all duration-500
        `}>
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className={`
                    p-8 md:p-12 rounded-[3rem] border backdrop-blur-3xl relative overflow-hidden transition-all duration-500
                    ${isDarkMode
                        ? 'bg-slate-900/40 border-white/5 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)]'
                        : 'bg-white/80 border-slate-200 shadow-2xl'}
                `}>
                    {/* Interior decorative elements */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

                    {isModal && onClose && (
                        <button
                            onClick={onClose}
                            title="Close Login"
                            className={`
                                absolute top-8 right-8 p-2 rounded-full transition-all cursor-pointer active:scale-90
                                ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}
                            `}
                        >
                            <X size={20} />
                        </button>
                    )}

                    <div className="text-center mb-12">
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex justify-center mb-8"
                        >
                            <div className="relative group">
                                <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full group-hover:bg-blue-500/30 transition-all duration-500" />
                                <BrandLogo className="w-24 h-24 md:w-28 relative z-10 shadow-2xl rounded-[2rem] border-4 border-white/5" />
                            </div>
                        </motion.div>

                        <h1 className={`text-3xl font-black tracking-tight mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Access Terminal
                        </h1>
                        <p className={`text-sm font-medium tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Neo Siam Logistics • PMS Enterprise
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-3">
                            <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                <UserIcon size={12} className="text-blue-500" />
                                Station Identity
                            </label>
                            <div className="relative">
                                <select
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={isLoading}
                                    title="Choose User Role"
                                    className={`
                                        w-full px-6 py-5 rounded-2xl font-bold transition-all cursor-pointer appearance-none border
                                        ${isDarkMode
                                            ? 'bg-white/5 border-white/5 text-slate-100 focus:border-blue-500/50 focus:bg-white/10'
                                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}
                                    `}
                                    required
                                >
                                    <option className="text-slate-900" value="" disabled>Select User Role</option>
                                    {AUTHORIZED_USERS.map(user => (
                                        <option className="text-slate-900" key={user.username} value={user.username}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                <Lock size={12} className="text-blue-500" />
                                Security Token
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                className={`
                                    w-full px-6 py-5 rounded-2xl font-bold transition-all border
                                    ${isDarkMode
                                        ? 'bg-white/5 border-white/5 text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:bg-white/10'
                                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-300 focus:border-blue-500'}
                                `}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[11px] font-bold text-red-500 flex items-center gap-2"
                                >
                                    <X size={14} className="flex-shrink-0" />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                            whileHover={!isLoading ? { scale: 1.02 } : {}}
                            whileTap={!isLoading ? { scale: 0.98 } : {}}
                            disabled={isLoading}
                            type="submit"
                            className={`
                                w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.25em] transition-all shadow-2xl flex items-center justify-center gap-3 cursor-pointer
                                ${isLoading
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20'}
                            `}
                        >
                            {isLoading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <LogIn size={18} className="drop-shadow-lg" />
                                    AUTHENTICATE
                                </>
                            )}
                        </motion.button>
                    </form>

                    <div className="mt-12 text-center">
                        <div className={`
                            inline-flex items-center gap-3 px-5 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-widest
                            ${isDarkMode ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400'}
                        `}>
                            <ShieldCheck size={14} className="text-blue-500" />
                            PROV: NSL-PMS SECURE LAYER v3
                        </div>
                    </div>
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    transition={{ delay: 1 }}
                    className="mt-10 text-center text-[10px] font-black text-slate-200 uppercase tracking-[0.4em]"
                >
                    Authorized Personnel Only
                </motion.p>
            </motion.div>
        </div>
    );
};

export default LoginScreen;
