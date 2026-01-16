import React, { useState, useEffect } from 'react';
import { BranchId } from './types';
import { useAuth } from './contexts/AuthContext';
import { useStock } from './contexts/StockContext';
import { useQRScanner } from './hooks/useQRScanner';
import LoginScreen from './components/auth/LoginScreen';
import Dashboard from './components/dashboard/Dashboard';
import MovementTab from './components/movements/MovementTab';
import MaintenanceTab from './components/maintenance/MaintenanceTab';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MobileNav from './components/layout/MobileNav';
import SettingsTab from './components/settings/SettingsTab';
import QRScannerModal from './components/common/QRScannerModal';
import { BRANCHES } from './constants';
import { safeStorage } from './utils/helpers';
// @ts-ignore
import Swal from 'sweetalert2';

export default function App() {
  const { currentUser, login, logout } = useAuth();
  const { stock, transactions, addTransaction, processBatchMaintenance, confirmTransactionsBatch } = useStock();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'record' | 'maintenance' | 'settings' | 'analytics'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchId | 'ALL'>(() => {

    const savedUser = safeStorage.getItem('neo-siam-user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.role === 'ADMIN' || user.branchId === 'hub_nw') return 'ALL';
      if (user.role === 'USER' && user.branchId) return user.branchId;
    }
    return 'hub_nw';
  });


  const { isScannerOpen, setIsScannerOpen, handleScanSuccess } = useQRScanner(
    currentUser,
    transactions,
    confirmTransactionsBatch,
    setActiveTab
  );

  const canViewAll = currentUser?.role === 'ADMIN' || currentUser?.branchId === 'hub_nw';

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'USER' && currentUser.branchId !== 'hub_nw' && currentUser.branchId) {
        setSelectedBranch(currentUser.branchId);
      } else if ((currentUser.role === 'ADMIN' || currentUser.branchId === 'hub_nw') && selectedBranch !== 'ALL' && !BRANCHES.some(b => b.id === selectedBranch)) {
        setSelectedBranch('ALL');
      }
    }
  }, [currentUser, selectedBranch]);

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
        popup: 'rounded-3xl shadow-xl border border-slate-100',
        title: 'font-black text-slate-800',
        htmlContainer: 'text-slate-600'
      }
    }).then((result: any) => {
      if (result.isConfirmed) {
        logout();
      }
    });
  };

  if (!currentUser) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        selectedBranch={selectedBranch}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />


      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>

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

        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-[1600px] mx-auto pb-24 md:pb-8">
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

      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedBranch={selectedBranch}
        currentUser={currentUser}
      />
    </div>
  );
}
