import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wrench,
  LogOut,
} from 'lucide-react';
import { BranchId } from './types';
import { useAuth } from './contexts/AuthContext';
import { useStock } from './contexts/StockContext';
import LoginScreen from './components/auth/LoginScreen';
import Dashboard from './components/dashboard/Dashboard';
import MovementTab from './components/movements/MovementTab';
import MaintenanceTab from './components/maintenance/MaintenanceTab';
import Sidebar from './components/layout/Sidebar'; // New import
import { BRANCHES } from './constants';
import SettingsTab from './components/settings/SettingsTab';
// @ts-ignore
import Swal from 'sweetalert2';
import QRScannerModal from './components/common/QRScannerModal';

export default function App() {
  const { currentUser, login, logout } = useAuth();
  const { stock, transactions, addTransaction, processBatchMaintenance } = useStock();

  // Permissions: Admin and Hub NKS can see ALL
  const canViewAll = currentUser?.role === 'ADMIN' || currentUser?.branchId === 'hub_nw';

  // Removing 'ai' from activeTab state type definition and default state since we are removing the feature
  const [activeTab, setActiveTab] = useState<'dashboard' | 'record' | 'maintenance' | 'settings'>('dashboard');

  const [selectedBranch, setSelectedBranch] = useState<BranchId | 'ALL'>(() => {
    // Initialize based on user role immediately
    const savedUser = localStorage.getItem('neo-siam-user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.role === 'ADMIN' || user.branchId === 'hub_nw') return 'ALL';
      if (user.role === 'USER' && user.branchId) return user.branchId;
    }
    return 'hub_nw';
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [queuedReceiveDocNo, setQueuedReceiveDocNo] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      // If user is restricted (not admin and not hub_nks), force their branch
      if (currentUser.role === 'USER' && currentUser.branchId !== 'hub_nw' && currentUser.branchId) {
        setSelectedBranch(currentUser.branchId);
      }
      // If user is privileged but has invalid selection, reset to ALL
      else if ((currentUser.role === 'ADMIN' || currentUser.branchId === 'hub_nw') && selectedBranch !== 'ALL' && !BRANCHES.some(b => b.id === selectedBranch)) {
        setSelectedBranch('ALL');
      }
    }
  }, [currentUser, selectedBranch]);

  // QR Code Quick Receive Handler
  const { confirmTransactionsBatch } = useStock();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docNo = queuedReceiveDocNo || params.get('receive');

    if (docNo && currentUser) {
      // Find transactions for this docNo that are PENDING and for the current branch
      const pendingTxs = transactions.filter(t =>
        t.docNo === docNo &&
        t.status === 'PENDING' &&
        t.dest === currentUser.branchId
      );

      if (pendingTxs.length > 0) {
        // Clear param from URL and state
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        setQueuedReceiveDocNo(null);

        const itemsDescription = pendingTxs.map(t =>
          `• ${t.palletId}: ${t.qty} ตัว`
        ).join('\n');

        Swal.fire({
          title: 'สแกนรับพาเลทด่วน',
          html: `ยืนยันการรับพาเลทจากเอกสาร <b>${docNo}</b><br/><br/>` +
            `<div class="text-left bg-slate-50 p-4 rounded-xl border border-slate-100 font-bold text-slate-700 whitespace-pre-line">${itemsDescription}</div>`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#2563eb',
          cancelButtonColor: '#64748b',
          confirmButtonText: 'ยืนยันการรับของทั้งหมด',
          cancelButtonText: 'ยังไม่ได้รับ',
          reverseButtons: true
        }).then((result: any) => {
          if (result.isConfirmed) {
            confirmTransactionsBatch(pendingTxs.map(t => t.id));
            Swal.fire({
              title: 'สำเร็จ!',
              text: 'บันทึกการรับพาเลทเรียบร้อยแล้ว',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
            setActiveTab('dashboard');
          }
        });
      } else if (transactions.length > 0) {
        // If we have transactions but no pending ones found for this user/doc
        const anyTx = transactions.find(t => t.docNo === docNo);
        if (anyTx) {
          if (anyTx.status === 'COMPLETED') {
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
            setQueuedReceiveDocNo(null);
            Swal.fire('แจ้งเตือน', 'เอกสารนี้ถูกบันทึกรับเข้าเรียบร้อยแล้ว', 'info');
          } else if (anyTx.dest !== currentUser.branchId) {
            // Not for this branch
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
            setQueuedReceiveDocNo(null);
            Swal.fire('ข้อผิดพลาด', 'เอกสารนี้ไม่ใช่ของสาขาคุณ', 'error');
          }
        }
      }
    }
  }, [currentUser, transactions, confirmTransactionsBatch, queuedReceiveDocNo]);

  const handleScanSuccess = (decodedText: string) => {
    setIsScannerOpen(false);

    // Try to extract docNo from URL or use as is
    let docNo = decodedText;
    try {
      if (decodedText.includes('?receive=')) {
        const url = new URL(decodedText);
        docNo = url.searchParams.get('receive') || decodedText;
      }
    } catch (e) {
      // Not a valid URL, use as raw text
    }

    setQueuedReceiveDocNo(docNo);
  };

  const handleLogout = () => {
    // @ts-ignore
    const Swal = window.Swal;

    if (Swal) {
      Swal.fire({
        title: 'ยืนยันออกจากระบบ?',
        text: "คุณต้องการออกจากระบบใช่หรือไม่",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'ใช่, ออกจากระบบ',
        cancelButtonText: 'ยกเลิก',
        background: '#fff',
        customClass: {
          popup: 'rounded-3xl shadow-xl border border-slate-100',
          title: 'font-black text-slate-800',
          content: 'text-slate-600'
        }
      }).then((result: any) => {
        if (result.isConfirmed) {
          logout();
        }
      });
    } else {
      if (window.confirm('ยืนยันออกจากระบบ?')) {
        logout();
      }
    }
  };

  // Login Screen
  if (!currentUser) {
    return <LoginScreen onLogin={login} />;
  }

  // Calculate stats logic moved to Dashboard mostly, but we define getter here if needed or just pass props.
  // Dashboard handles stock aggregation.

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar (Desktop) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        selectedBranch={selectedBranch}
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300">

        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 shadow-sm px-6 py-3 flex justify-between items-center h-16">
          {/* Left Side (Title or Breadcrumb - Optional) */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="font-black text-xl text-slate-800">Neo<span className="text-blue-600">Siam</span></div>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="p-1.5 bg-blue-50 text-blue-600 rounded-lg ml-2"
              aria-label="Open Scanner"
              title="สแกน QR"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" /><path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" /></svg>
            </button>
          </div>
          <div className="hidden md:block text-slate-400 font-medium text-sm disabled">
            {/* Optional Breadcrumb area */}
            {activeTab === 'dashboard' && 'Inventory Overview'}
            {activeTab === 'record' && 'Movement Records'}
            {activeTab === 'maintenance' && 'Maintenance & Repairs'}
          </div>

          {/* Right Side: Branch Select & User Profile */}
          <div className="flex items-center gap-4 md:gap-6">

            {/* Hub Selection */}
            <div className="flex items-center">
              {canViewAll ? (
                <div className="relative group">
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value as BranchId | 'ALL')}
                    className="appearance-none bg-white border border-slate-200 rounded-full py-2 pl-6 pr-10 text-center text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer hover:bg-slate-50 transition-all min-w-[200px]"
                    aria-label="Select Branch Scope"
                  >
                    <option value="ALL">All Branches (ทุกสาขา)</option>
                    {BRANCHES.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-blue-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                  </div>
                </div>
              ) : (
                <div className="text-lg font-bold text-slate-700">
                  {BRANCHES.find(b => b.id === selectedBranch)?.name || selectedBranch}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

            {/* User Profile */}
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <div className="text-sm font-bold text-slate-900 leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                  {currentUser.role}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100 shadow-sm"
                title="ออกจากระบบ"
              >
                <LogOut size={18} />
              </button>
            </div>

            {/* Scan QR Button (Quick Receive Prompt) */}
            <button
              onClick={() => {
                Swal.fire({
                  title: 'วิธีรับพาเลทแบบรวดเร็ว (Quick Receive)',
                  html: `
                    <div class="text-left space-y-4">
                      <div class="flex items-start gap-3">
                        <div class="bg-blue-100 text-blue-600 p-2 rounded-lg font-bold">1</div>
                        <p class="text-sm">ใช้มือถือสแกน <b>QR Code</b> ที่มุมบนของใบส่งคืนพาเลท</p>
                      </div>
                      <div class="flex items-start gap-3">
                        <div class="bg-blue-100 text-blue-600 p-2 rounded-lg font-bold">2</div>
                        <p class="text-sm">กดลิงก์ที่ปรากฏบนหน้าจอเพื่อเปิดแอป</p>
                      </div>
                      <div class="flex items-start gap-3">
                        <div class="bg-blue-100 text-blue-600 p-2 rounded-lg font-bold">3</div>
                        <p class="text-sm">ระบบจะแสดงปุ่ม <b>"ยืนยันการรับ"</b> ให้ทันทีโดยไม่ต้องค้นหาเลขที่เอกสาร</p>
                      </div>
                    </div>
                  `,
                  icon: 'info',
                  confirmButtonText: 'เข้าใจแล้ว',
                  confirmButtonColor: '#2563eb'
                });
              }}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full font-bold text-sm hover:bg-blue-100 transition-all border border-blue-100"
            >
              <div className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" /><path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" /></svg>
              </div>
              Scan QR
            </button>

          </div>
        </header>

        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-[1600px] mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              stock={stock}
              selectedBranch={selectedBranch}
              transactions={transactions}
              addTransaction={addTransaction}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'record' && selectedBranch !== 'ALL' && (
            <MovementTab
              stock={stock}
              transactions={transactions}
              addTransaction={addTransaction}
              selectedBranch={selectedBranch}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'maintenance' && (selectedBranch === 'hub_nw' || currentUser?.branchId === 'hub_nw') && (
            <MaintenanceTab
              stock={stock}
              selectedBranch={'hub_nw'}
              onBatchMaintenance={processBatchMaintenance}
              onAddTransaction={addTransaction}
            />
          )}

          {activeTab === 'settings' && currentUser?.role === 'ADMIN' && (
            <SettingsTab />
          )}
        </main>

      </div>

      {/* Mobile Bottom Nav (Optional Fallback since Sidebar is hidden on mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around p-2 pb-safe">
        <button onClick={() => setActiveTab('dashboard')} className={`p-2 rounded-lg flex flex-col items-center ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}>
          <LayoutDashboard size={24} />
          <span className="text-[10px] font-bold mt-1">Dash</span>
        </button>

        {(selectedBranch !== 'ALL') && (
          <button onClick={() => setActiveTab('record')} className={`p-2 rounded-lg flex flex-col items-center ${activeTab === 'record' ? 'text-blue-600' : 'text-slate-400'}`}>
            <ArrowRightLeft size={24} />
            <span className="text-[10px] font-bold mt-1">Move</span>
          </button>
        )}

        {(selectedBranch === 'hub_nw' || currentUser?.branchId === 'hub_nw') && (
          <button onClick={() => setActiveTab('maintenance')} className={`p-2 rounded-lg flex flex-col items-center ${activeTab === 'maintenance' ? 'text-blue-600' : 'text-slate-400'}`}>
            <Wrench size={24} />
            <span className="text-[10px] font-bold mt-1">Maint</span>
          </button>
        )}
      </div>
    </div>
  );
}
