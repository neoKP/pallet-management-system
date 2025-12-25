import React, { useState } from 'react';
import { UserIcon, Lock, ShieldCheck, LogIn } from 'lucide-react';
import BrandLogo from '../common/BrandLogo';
import { User } from '../../types';

// Used locally for mock login
const MOCK_USERS: User[] = [
    { username: 'admin', role: 'ADMIN', name: 'System Administrator' },
    { username: 'user_nks', role: 'USER', branchId: 'hub_nks', name: 'Operator - Hub NKS' },
    { username: 'user_sai3', role: 'USER', branchId: 'sai3', name: 'Staff - Sai 3' },
    { username: 'user_cm', role: 'USER', branchId: 'cm', name: 'Staff - Chiang Mai' },
    { username: 'user_kpp', role: 'USER', branchId: 'kpp', name: 'Staff - Kamphaeng Phet' },
    { username: 'user_plk', role: 'USER', branchId: 'plk', name: 'Staff - Phitsanulok' },
    { username: 'user_ekp', role: 'USER', branchId: 'ekp', name: 'Staff - EKP' },
];

interface LoginScreenProps {
    onLogin: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const user = MOCK_USERS.find(u => u.username === username);
        if (user && password === '1234') {
            onLogin(user);
        } else {
            setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-slate-50">
            <div className="w-full max-w-md">
                <div className="glass p-8 md:p-12 rounded-[3rem] shadow-2xl bg-white border border-slate-200">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-6">
                            <BrandLogo className="w-24 h-24 md:w-28 md:w-28" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
                            Neo Siam Logistics
                        </h1>
                        <p className="text-slate-500 text-sm md:text-base">
                            ระบบจัดการพาเลท
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                <UserIcon size={16} className="inline mr-2" />
                                ชื่อผู้ใช้
                            </label>
                            <select
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="เลือกชื่อผู้ใช้"
                                required
                            >
                                <option value="">เลือกผู้ใช้</option>
                                {MOCK_USERS.map(user => (
                                    <option key={user.username} value={user.username} className="text-slate-900">
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                <Lock size={16} className="inline mr-2" />
                                รหัสผ่าน
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="ใส่รหัสผ่าน"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-2xl text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl flex items-center justify-center gap-2"
                        >
                            <LogIn size={20} />
                            เข้าสู่ระบบ
                        </button>
                    </form>

                    <div className="mt-6 text-center text-xs text-slate-400">
                        <ShieldCheck size={14} className="inline mr-1" />
                        Demo: รหัสผ่านทดสอบคือ <code className="bg-slate-100 px-2 py-1 rounded border border-slate-200">1234</code>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
