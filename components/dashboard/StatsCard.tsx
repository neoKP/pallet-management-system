import React from 'react';
import { AlertCircle } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string; // Tailwind bg class for Icon container
    textColor: string; // Tailwind text class
    subtext: string;
    alert?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color, textColor, subtext, alert }) => {
    return (
        <div className={`relative overflow-hidden bg-white p-6 rounded-3xl border transition-all duration-300 hover:shadow-lg ${alert ? 'border-red-200 shadow-red-100 ring-4 ring-red-50/50' : 'border-slate-100 shadow-sm'}`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-bold text-slate-500 mb-1">{title}</p>
                    <h3 className={`text-4xl font-black tracking-tight ${textColor}`}>{value}</h3>
                    <p className="text-xs font-medium text-slate-400 mt-2 flex items-center gap-1">
                        {alert && <AlertCircle size={12} className="text-red-500" />} {subtext}
                    </p>
                </div>
                <div className={`p-4 rounded-2xl ${color} text-white shadow-md transform rotate-3 transition-transform group-hover:rotate-6`}>
                    <Icon size={24} />
                </div>
            </div>
            {/* Background decoration */}
            <div className="absolute -bottom-4 -right-4 opacity-5">
                <Icon size={100} />
            </div>
        </div>
    );
};

export default StatsCard;
