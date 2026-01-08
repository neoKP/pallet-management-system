import React from 'react';
import { BarChart3 } from 'lucide-react';
import { PALLET_TYPES } from '../../constants';

interface StockBarProps {
    width: number;
    color: string;
}

const StockBar: React.FC<StockBarProps> = ({ width, color }) => {
    const barRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (barRef.current) {
            barRef.current.style.width = `${width}%`;
        }
    }, [width]);

    return (
        <div
            ref={barRef}
            className={`h-full ${color} rounded-full transition-all duration-1000`}
        />
    );
};

interface StockVisualizerProps {
    currentStock: Record<string, number>;
    totalStock: number;
}

const StockVisualizer: React.FC<StockVisualizerProps> = ({ currentStock, totalStock }) => {
    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="text-slate-400" size={20} />
                <h2 className="text-lg font-black text-slate-800">ภาพรวมสต็อก (Stock Visualizer)</h2>
            </div>

            {/* Visual Bars */}
            <div className="space-y-4">
                {PALLET_TYPES.map(pallet => {
                    const qty = currentStock[pallet.id] || 0;
                    const barWidth = totalStock > 0 ? (qty / totalStock) * 100 : 0;

                    return (
                        <div key={pallet.id} className={qty === 0 ? 'opacity-40' : ''}>
                            <div className="flex justify-between text-sm font-bold mb-1">
                                <span className="text-slate-600 flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${pallet.color}`}></span>
                                    {pallet.name}
                                </span>
                                <span className="text-slate-900">{qty}</span>
                            </div>
                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <StockBar width={barWidth} color={pallet.color} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StockVisualizer;
