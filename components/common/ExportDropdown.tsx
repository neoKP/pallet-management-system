/**
 * Export Dropdown Component
 * Following frontend-design skill for distinctive UI
 * 
 * Features:
 * - Animated dropdown menu
 * - Excel and PDF export options
 * - Loading states
 * - Accessible keyboard navigation
 */

import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from 'lucide-react';

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => Promise<void> | void;
  color: string;
}

interface ExportDropdownProps {
  options: ExportOption[];
  buttonLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
}

const ExportDropdown: React.FC<ExportDropdownProps> = ({
  options,
  buttonLabel = 'Export',
  size = 'md',
  variant = 'primary'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleOptionClick = async (option: ExportOption) => {
    setLoadingId(option.id);
    try {
      await option.onClick();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoadingId(null);
      setIsOpen(false);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2'
  };

  // Variant classes
  const variantClasses = {
    primary: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100'
  };

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center font-bold rounded-xl transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${isOpen ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}
        `}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Download size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} />
        <span>{buttonLabel}</span>
        <ChevronDown 
          size={size === 'sm' ? 12 : 14} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          role="menu"
        >
          <div className="p-2">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Export Options
            </div>
            
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option)}
                disabled={loadingId !== null}
                className={`
                  w-full flex items-start gap-3 p-3 rounded-xl transition-all duration-150
                  hover:bg-slate-50 focus:bg-slate-50 focus:outline-none
                  disabled:opacity-50 disabled:cursor-not-allowed
                  group cursor-pointer
                `}
                role="menuitem"
              >
                <div 
                  className={`
                    p-2 rounded-lg transition-colors duration-150
                    ${option.color}
                    group-hover:scale-110 transform transition-transform
                  `}
                >
                  {loadingId === option.id ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    option.icon
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-slate-800 text-sm">
                    {option.label}
                  </div>
                  <div className="text-[11px] text-slate-500 leading-tight">
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 text-center">
              Files will be downloaded to your device
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Pre-configured export options factory
export const createStockExportOptions = (
  onExportExcel: () => Promise<void>,
  onExportPDF: () => void
): ExportOption[] => [
  {
    id: 'excel',
    label: 'Export to Excel',
    description: 'Full data with multiple sheets',
    icon: <FileSpreadsheet size={18} />,
    onClick: onExportExcel,
    color: 'bg-emerald-100 text-emerald-600'
  },
  {
    id: 'pdf',
    label: 'Export to PDF',
    description: 'Print-ready summary report',
    icon: <FileText size={18} />,
    onClick: onExportPDF,
    color: 'bg-red-100 text-red-600'
  }
];

export const createTransactionExportOptions = (
  onExportExcel: () => Promise<void>,
  onExportPDF: () => void
): ExportOption[] => [
  {
    id: 'excel',
    label: 'Export Transactions',
    description: 'Complete transaction log',
    icon: <FileSpreadsheet size={18} />,
    onClick: onExportExcel,
    color: 'bg-emerald-100 text-emerald-600'
  },
  {
    id: 'pdf',
    label: 'Generate Report',
    description: 'Summary PDF document',
    icon: <FileText size={18} />,
    onClick: onExportPDF,
    color: 'bg-indigo-100 text-indigo-600'
  }
];

export default ExportDropdown;
