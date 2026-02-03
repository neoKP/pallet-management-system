import React, { useState, useEffect, useMemo } from 'react';
import { BranchId } from './types';
import { useAuth } from './contexts/AuthContext';
import { useStock } from './contexts/StockContext';
import { useQRScanner } from './hooks/useQRScanner';
import LoginScreen from './components/auth/LoginScreen';
import HomePage from './components/home/HomePage';
import Dashboard from './components/dashboard/Dashboard';
import MovementTab from './components/movements/MovementTab';
import MaintenanceTab from './components/maintenance/MaintenanceTab';
import ScrapSalesTab from './components/maintenance/ScrapSalesTab.tsx';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MobileNav from './components/layout/MobileNav';
import SettingsTab from './components/settings/SettingsTab';
import HistoryTab from './components/history/HistoryTab';
import QRScannerModal from './components/common/QRScannerModal';
import { QuickLoopRecord } from './components/movements/QuickLoopRecord';
import { BRANCHES } from './constants';
import { safeStorage } from './utils/helpers';
// @ts-ignore
import Swal from 'sweetalert2';

export default function App() {
  const { currentUser, login, logout } = useAuth();
  const { stock, transactions, addTransaction, processBatchMaintenance, confirmTransactionsBatch } = useStock();

  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'record' | 'maintenance' | 'settings' | 'analytics' | 'history' | 'scrapsales'>('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Memoize canViewAll for performance
  const canViewAll = useMemo(() => currentUser?.role === 'ADMIN', [currentUser]);

  const [selectedBranch, setSelectedBranch] = useState<BranchId | 'ALL'>(() => {
    const savedUser = safeStorage.getItem('neo-siam-user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        if (user && typeof user === 'object') {
          if (user.role === 'ADMIN' || user.branchId === 'hub_nw') return 'ALL';
          if (user.role === 'USER' && user.branchId) return user.branchId;
        }
      } catch (e) {
        console.error('Failed to parse saved user:', e);
        safeStorage.removeItem('neo-siam-user');
      }
    }
    return 'hub_nw';
  });

  const { isScannerOpen, setIsScannerOpen, handleScanSuccess } = useQRScanner(
    currentUser as any,
    transactions,
    confirmTransactionsBatch,
    setActiveTab
  );

  // Sync selectedBranch when currentUser changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'ADMIN') {
        if (!selectedBranch || (selectedBranch !== 'ALL' && !BRANCHES.some(b => b.id === selectedBranch))) {
          setSelectedBranch('ALL');
        }
      } else {
        if (currentUser.branchId && currentUser.branchId !== selectedBranch) {
          setSelectedBranch(currentUser.branchId as BranchId);
        }
      }
    }
  }, [currentUser]); // Optimized dependency array

  const handleLogout = () => {
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
        popup: 'rounded-[2rem] shadow-2xl border border-slate-100',
        title: 'font-black text-slate-800',
        htmlContainer: 'text-slate-600'
      }
    }).then((result: any) => {
      if (result.isConfirmed) {
        logout();
      }
    });
  };

  const handleNavigate = (tab: any) => {
    if (!currentUser && tab !== 'home') {
      setIsLoginModalOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  // Layer 1: Public-First Priority
  if (activeTab === 'home') {
    return (
      <div className="min-h-screen bg-slate-900 overflow-x-hidden selection:bg-blue-500/30">
        <HomePage
          currentUser={currentUser}
          selectedBranch={selectedBranch}
          stock={stock}
          transactions={transactions}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          openLogin={() => setIsLoginModalOpen(true)}
        />
        {isLoginModalOpen && (
          <LoginScreen
            onLogin={(user) => {
              login(user);
              setIsLoginModalOpen(false);
            }}
            onClose={() => setIsLoginModalOpen(false)}
            isModal={true}
          />
        )}
      </div>
    );
  }

  // Layer 2: Auth Guard
  if (!currentUser) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-600/10">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        selectedBranch={selectedBranch}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header
          activeTab={activeTab}
          currentUser={currentUser}
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
          canViewAll={canViewAll}
          handleLogout={handleLogout}
          setIsScannerOpen={setIsScannerOpen}
        />

        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />

        <main className={`flex-1 overflow-y-auto w-full mx-auto pb-24 md:pb-8 ${activeTab === 'analytics' ? 'max-w-none p-0' : 'p-4 md:p-8 max-w-[1600px]'}`}>
          {activeTab === 'dashboard' && (
            <Dashboard
              stock={stock}
              selectedBranch={selectedBranch}
              transactions={transactions}
              addTransaction={addTransaction}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard
              transactions={transactions}
              stock={stock}
            />
          )}

          {activeTab === 'record' && selectedBranch !== 'ALL' && (
            <MovementTab
              transactions={transactions}
              selectedBranch={selectedBranch}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'history' && (
            <HistoryTab
              transactions={transactions}
              selectedBranch={selectedBranch}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'maintenance' && (
            <MaintenanceTab
              stock={stock}
              selectedBranch={selectedBranch === 'ALL' ? (currentUser?.branchId || 'hub_nw') : selectedBranch}
              transactions={transactions}
              onBatchMaintenance={processBatchMaintenance}
              onAddTransaction={addTransaction}
            />
          )}

          {activeTab === 'scrapsales' && (currentUser?.role === 'ADMIN' || currentUser?.branchId === 'maintenance_stock') && (
            <ScrapSalesTab
              transactions={transactions}
            />
          )}

          {activeTab === 'settings' && currentUser?.role === 'ADMIN' && (
            <SettingsTab />
          )}
        </main>
      </div>

      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedBranch={selectedBranch}
        currentUser={currentUser}
      />

      {(selectedBranch === 'sai3' || selectedBranch === 'hub_nw') && (
        <QuickLoopRecord selectedBranch={selectedBranch} />
      )}
    </div>
  );
}

