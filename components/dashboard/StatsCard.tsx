import { AlertCircle, Truck, Warehouse } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    textColor: string;
    subtext: string;
    alert?: boolean;
    pendingValue?: number;
    confirmedValue?: number;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color, textColor, subtext, alert, pendingValue = 0, confirmedValue = 0 }) => {
    return (
        <div className={`relative overflow-hidden bg-white p-6 rounded-3xl border transition-all duration-300 hover:shadow-lg ${alert ? 'border-red-200 shadow-red-100 ring-4 ring-red-50/50' : 'border-slate-100 shadow-sm'}`}>
            <div className="flex justify-between items-start">
                <div className="z-10 flex-1">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">{title}</p>
                    <h3 className={`text-4xl font-black tracking-tight ${textColor}`}>{value.toLocaleString()}</h3>

                    {(pendingValue > 0) && (
                        <div className="mt-3 space-y-1.5">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg w-fit">
                                <Warehouse size={12} className="text-slate-400" />
                                <span>ในสาขา: {confirmedValue.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg w-fit border border-amber-100 animate-pulse">
                                <Truck size={12} />
                                <span>บนรถ (ระหว่างทาง): {pendingValue.toLocaleString()}</span>
                            </div>
                        </div>
                    )}

                    {!pendingValue && (
                        <p className="text-xs font-medium text-slate-400 mt-2 flex items-center gap-1">
                            {alert && <AlertCircle size={12} className="text-red-500" />} {subtext}
                        </p>
                    )}
                </div>
                <div className={`p-4 rounded-2xl ${color} text-white shadow-lg transform rotate-3 transition-transform group-hover:rotate-6 z-10`}>
                    <Icon size={24} />
                </div>
            </div>
            {/* Background decoration */}
            <div className="absolute -bottom-4 -right-4 opacity-[0.03] z-0">
                <Icon size={110} />
            </div>
        </div>
    );
};

export default StatsCard;
