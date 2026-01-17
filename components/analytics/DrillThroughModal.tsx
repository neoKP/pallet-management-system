import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Download,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    Package,
    Calendar,
    Building2,
    User,
    FileText,
    TrendingUp,
    TrendingDown,
    Minus,
} from 'lucide-react';
import { Transaction } from '../../types';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { BRANCHES, PALLET_TYPES } from '../../constants';

interface DrillThroughModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    transactions: Transaction[];
    isDarkMode: boolean;
    filterType?: 'branch' | 'palletType' | 'status' | 'date';
    filterValue?: string;
}

type SortField = 'date' | 'type' | 'qty' | 'source' | 'dest' | 'palletType';
type SortDirection = 'asc' | 'desc';

export const DrillThroughModal: React.FC<DrillThroughModalProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    transactions,
    isDarkMode,
    filterType,
    filterValue,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const itemsPerPage = 10;

    // Get display names
    const getBranchName = (branchId: string) => {
        const branch = BRANCHES.find(b => b.id === branchId);
        return branch?.name || branchId;
    };

    const getPalletTypeName = (palletId: string) => {
        const pallet = PALLET_TYPES.find(p => p.id === palletId);
        return pallet?.name || palletId;
    };

    const getTypeDisplay = (type: string) => {
        const types: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
            IN: { label: 'รับเข้า', color: 'text-green-500 bg-green-500/10', icon: <TrendingUp className="w-3 h-3" /> },
            OUT: { label: 'จ่ายออก', color: 'text-amber-500 bg-amber-500/10', icon: <TrendingDown className="w-3 h-3" /> },
            MAINTENANCE: { label: 'ซ่อมบำรุง', color: 'text-purple-500 bg-purple-500/10', icon: <Minus className="w-3 h-3" /> },
        };
        return types[type] || { label: type, color: 'text-gray-500 bg-gray-500/10', icon: null };
    };

    // Filter and sort transactions
    const processedTransactions = useMemo(() => {
        let filtered = [...transactions];

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(t =>
                getBranchName(t.source).toLowerCase().includes(term) ||
                getBranchName(t.dest).toLowerCase().includes(term) ||
                getPalletTypeName(t.palletId).toLowerCase().includes(term) ||
                t.type.toLowerCase().includes(term) ||
                t.note?.toLowerCase().includes(term)
            );
        }

        // Sort
        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'date':
                    comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                    break;
                case 'type':
                    comparison = a.type.localeCompare(b.type);
                    break;
                case 'qty':
                    comparison = a.qty - b.qty;
                    break;
                case 'source':
                    comparison = getBranchName(a.source).localeCompare(getBranchName(b.source));
                    break;
                case 'dest':
                    comparison = getBranchName(a.dest).localeCompare(getBranchName(b.dest));
                    break;
                case 'palletType':
                    comparison = getPalletTypeName(a.palletId).localeCompare(getPalletTypeName(b.palletId));
                    break;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [transactions, searchTerm, sortField, sortDirection]);

    // Pagination
    const totalPages = Math.ceil(processedTransactions.length / itemsPerPage);
    const paginatedTransactions = processedTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Stats summary
    const stats = useMemo(() => {
        const inQty = processedTransactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.qty, 0);
        const outQty = processedTransactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.qty, 0);
        const maintenanceQty = processedTransactions.filter(t => t.type === 'MAINTENANCE').reduce((sum, t) => sum + t.qty, 0);
        return { total: processedTransactions.length, inQty, outQty, maintenanceQty };
    }, [processedTransactions]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const handleExportCSV = () => {
        const headers = ['วันที่', 'ประเภท', 'ต้นทาง', 'ปลายทาง', 'ประเภทพาเลท', 'จำนวน', 'หมายเหตุ'];
        const rows = processedTransactions.map(t => [
            format(new Date(t.date), 'dd/MM/yyyy HH:mm', { locale: th }),
            getTypeDisplay(t.type).label,
            getBranchName(t.source),
            getBranchName(t.dest),
            getPalletTypeName(t.palletId),
            t.qty.toString(),
            t.note || '-'
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `drill-through-${title.replace(/\s/g, '_')}-${format(new Date(), 'yyyyMMdd')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const SortableHeader: React.FC<{ field: SortField; label: string; className?: string }> = ({ field, label, className }) => (
        <th
            onClick={() => handleSort(field)}
            className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors ${className}`}
        >
            <div className="flex items-center gap-1">
                {label}
                <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-indigo-500' : 'opacity-30'}`} />
            </div>
        </th>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={`
                            fixed inset-4 md:inset-10 lg:inset-20 z-50 rounded-2xl overflow-hidden shadow-2xl flex flex-col
                            ${isDarkMode ? 'bg-slate-900' : 'bg-white'}
                        `}
                    >
                        {/* Header */}
                        <div className={`
                            flex items-center justify-between p-6 border-b
                            ${isDarkMode ? 'bg-slate-800/50 border-white/10' : 'bg-gray-50 border-gray-200'}
                        `}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                                    <FileText className="w-6 h-6 text-indigo-500" />
                                </div>
                                <div>
                                    <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {title}
                                    </h2>
                                    {subtitle && (
                                        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {subtitle}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleExportCSV}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm
                                        ${isDarkMode ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-green-100 text-green-600 hover:bg-green-200'}
                                    `}
                                >
                                    <Download className="w-4 h-4" />
                                    Export CSV
                                </motion.button>
                                <button
                                    onClick={onClose}
                                    title="ปิด"
                                    className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Stats Bar */}
                        <div className={`
                            grid grid-cols-4 gap-4 p-4 border-b
                            ${isDarkMode ? 'bg-slate-800/30 border-white/5' : 'bg-gray-50/50 border-gray-100'}
                        `}>
                            <div className="text-center">
                                <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {stats.total.toLocaleString()}
                                </p>
                                <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    รายการทั้งหมด
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-green-500">
                                    +{stats.inQty.toLocaleString()}
                                </p>
                                <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    รับเข้า
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-amber-500">
                                    -{stats.outQty.toLocaleString()}
                                </p>
                                <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    จ่ายออก
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-purple-500">
                                    {stats.maintenanceQty.toLocaleString()}
                                </p>
                                <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    ซ่อมบำรุง
                                </p>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="p-4">
                            <div className={`
                                flex items-center gap-3 px-4 py-3 rounded-xl
                                ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-gray-100 border border-gray-200'}
                            `}>
                                <Search className={`w-5 h-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                                <input
                                    type="text"
                                    placeholder="ค้นหาสาขา, ประเภท, รายละเอียด..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className={`
                                        flex-1 bg-transparent outline-none text-sm font-medium
                                        ${isDarkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}
                                    `}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        title="ล้างการค้นหา"
                                        className={`p-1 rounded-lg ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-auto px-4">
                            <table className="w-full">
                                <thead className={`sticky top-0 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                                    <tr className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                                        <SortableHeader field="date" label="วันที่/เวลา" />
                                        <SortableHeader field="type" label="ประเภท" />
                                        <SortableHeader field="source" label="ต้นทาง" />
                                        <SortableHeader field="dest" label="ปลายทาง" />
                                        <SortableHeader field="palletType" label="ประเภทพาเลท" />
                                        <SortableHeader field="qty" label="จำนวน" className="text-right" />
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center">
                                                <Package className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                                                <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    ไม่พบข้อมูลที่ตรงกับเงื่อนไข
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedTransactions.map((transaction, index) => {
                                            const typeDisplay = getTypeDisplay(transaction.type);
                                            return (
                                                <motion.tr
                                                    key={transaction.id || index}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.03 }}
                                                    className={`
                                                        border-b transition-colors
                                                        ${isDarkMode
                                                            ? 'border-white/5 hover:bg-white/5'
                                                            : 'border-gray-100 hover:bg-gray-50'
                                                        }
                                                    `}
                                                >
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                                                            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                                {format(new Date(transaction.date), 'dd MMM yyyy', { locale: th })}
                                                            </span>
                                                        </div>
                                                        <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} ml-6`}>
                                                            {format(new Date(transaction.date), 'HH:mm น.')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${typeDisplay.color}`}>
                                                            {typeDisplay.icon}
                                                            {typeDisplay.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <Building2 className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                                                            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                                {getBranchName(transaction.source)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <Building2 className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                                                            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                                {getBranchName(transaction.dest)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-sm font-medium ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                                            {getPalletTypeName(transaction.palletId)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                            {transaction.qty.toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                            {transaction.note || '-'}
                                                        </span>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className={`
                                flex items-center justify-between p-4 border-t
                                ${isDarkMode ? 'border-white/10' : 'border-gray-200'}
                            `}>
                                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, processedTransactions.length)} จาก {processedTransactions.length} รายการ
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        title="หน้าก่อนหน้า"
                                        className={`
                                            p-2 rounded-xl transition-all
                                            ${currentPage === 1
                                                ? 'opacity-30 cursor-not-allowed'
                                                : isDarkMode
                                                    ? 'hover:bg-white/10'
                                                    : 'hover:bg-gray-100'
                                            }
                                        `}
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`
                                                        w-10 h-10 rounded-xl font-bold text-sm transition-all
                                                        ${currentPage === pageNum
                                                            ? 'bg-indigo-500 text-white shadow-lg'
                                                            : isDarkMode
                                                                ? 'hover:bg-white/10 text-slate-400'
                                                                : 'hover:bg-gray-100 text-slate-600'
                                                        }
                                                    `}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        title="หน้าถัดไป"
                                        className={`
                                            p-2 rounded-xl transition-all
                                            ${currentPage === totalPages
                                                ? 'opacity-30 cursor-not-allowed'
                                                : isDarkMode
                                                    ? 'hover:bg-white/10'
                                                    : 'hover:bg-gray-100'
                                            }
                                        `}
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default DrillThroughModal;
