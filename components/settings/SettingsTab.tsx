import React, { useState, useEffect } from 'react';
import { Settings, MapPin, Package, Plus, Trash2, Save, Building2, Truck, X, Send, Wrench } from 'lucide-react';
import * as firebaseService from '../../services/firebase';
import { PalletType, Branch, Partner, BranchId } from '../../types';
import { useStock } from '../../contexts/StockContext';
import * as telegramService from '../../services/telegramService';
import Swal from 'sweetalert2';

const SettingsTab: React.FC = () => {
    const [activeSection, setActiveSection] = useState<'pallets' | 'locations' | 'telegram' | 'developer'>('pallets');

    // Real-time data from Firebase
    const [pallets, setPallets] = useState<PalletType[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const { config, updateSystemConfig, stock } = useStock();
    const [telegramChatId, setTelegramChatId] = useState(config.telegramChatId);

    useEffect(() => {
        setTelegramChatId(config.telegramChatId);
    }, [config.telegramChatId]);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        const unsubPallets = firebaseService.subscribeToPallets(setPallets);
        const unsubBranches = firebaseService.subscribeToBranches(setBranches);
        const unsubPartners = firebaseService.subscribeToPartners(setPartners);
        return () => {
            if (typeof unsubPallets === 'function') (unsubPallets as Function)();
            if (typeof unsubBranches === 'function') (unsubBranches as Function)();
            if (typeof unsubPartners === 'function') (unsubPartners as Function)();
        };
    }, []);

    // Temporary form state
    const [newPallet, setNewPallet] = useState<Partial<PalletType>>({ material: 'wood', isRental: false, color: '#cccccc' });
    const [newLocation, setNewLocation] = useState<{ name: string, type: 'internal' | 'external', subType: string }>({ name: '', type: 'internal', subType: 'BRANCH' });

    const handleAddPallet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPallet.id || !newPallet.name) return;

        const pallet: PalletType = {
            id: newPallet.id as any,
            name: newPallet.name,
            color: newPallet.color || 'bg-gray-400',
            isRental: newPallet.isRental || false,
            material: newPallet.material || 'wood'
        };

        try {
            await firebaseService.addMasterData('pallets', pallet);
            setIsAddModalOpen(false);
            Swal.fire('Success', 'Pallet type added successfully', 'success');
            setNewPallet({ material: 'wood', isRental: false, color: '#cccccc' }); // Reset form
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Failed to add pallet type', 'error');
        }
    };

    const handleAddLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLocation.name) return;

        try {
            if (newLocation.type === 'internal') {
                const newBranch: Branch = {
                    id: newLocation.name.toLowerCase().replace(/\s+/g, '_') as BranchId,
                    name: newLocation.name,
                    type: newLocation.subType as 'HUB' | 'BRANCH'
                };
                await firebaseService.addMasterData('branches', newBranch);
            } else {
                const newPartner: Partner = {
                    id: newLocation.name.toLowerCase().replace(/\s+/g, '_'),
                    name: newLocation.name,
                    type: newLocation.subType as 'customer' | 'provider',
                    allowedPallets: [] // Default empty
                };
                await firebaseService.addMasterData('partners', newPartner);
            }
            setIsAddModalOpen(false);
            Swal.fire('Success', 'Location added successfully', 'success');
            setNewLocation({ name: '', type: 'internal', subType: 'BRANCH' }); // Reset form
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Failed to add location', 'error');
        }
    };

    const handleSeedDemoData = async () => {
        const result = await Swal.fire({
            title: 'ล้างข้อมูลทั้งหมดในระบบ?',
            text: 'ยอดสต็อก ประวัติรายการ และรายการคำขอทั้งหมดจะถูกลบและเริ่มใหม่เป็น 0 (Clean Slate)',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ยืนยันการล้างข้อมูล',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            try {
                const { INITIAL_STOCK } = await import('../../constants');
                await firebaseService.resetAllData(INITIAL_STOCK);
                Swal.fire('สำเร็จ', 'ระบบถูกรีเซ็ตเป็น 0 และประวัติทั้งหมดถูกล้างเรียบร้อยแล้ว', 'success');
            } catch (error) {
                console.error(error);
                Swal.fire('ผิดพลาด', 'ไม่สามารถรีเซ็ตข้อมูลได้', 'error');
            }
        }
    };

    const handleRepairBranch = async (branchId?: BranchId) => {
        const { INITIAL_STOCK, BRANCHES } = await import('../../constants');

        if (!branchId) {
            // Show selection if no specific branch
            const { value: selected } = await Swal.fire({
                title: 'เลือกสาขาที่ต้องการล้างยอดเป็น 0',
                input: 'select',
                inputOptions: BRANCHES.reduce((acc, b) => ({ ...acc, [b.id]: b.name }), {}),
                showCancelButton: true,
                confirmButtonText: 'ยืนยันการรีเซ็ตสาขานี้'
            });

            if (selected) branchId = selected as BranchId; else return;
        }

        try {
            const nextStock = { ...stock };
            nextStock[branchId] = INITIAL_STOCK[branchId];
            await firebaseService.addMovementBatch([], nextStock);
            Swal.fire('สำเร็จ', `ยอดสต็อกของ ${branchId} ถูกรีเซ็ตเป็น 0 แล้ว`, 'success');
        } catch (error) {
            console.error(error);
            Swal.fire('ผิดพลาด', 'ไม่สามารถดำเนินการได้', 'error');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200">
                        <Settings size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">System Settings</h1>
                        <p className="text-slate-500 font-medium">Manage Master Data</p>
                    </div>
                </div>
            </div>

            {/* Navigation Palls */}
            <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit flex-wrap">
                <button
                    onClick={() => setActiveSection('pallets')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSection === 'pallets'
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <Package size={18} />
                    Pallet Types
                </button>
                <button
                    onClick={() => setActiveSection('locations')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSection === 'locations'
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <MapPin size={18} />
                    Locations
                </button>
                <button
                    onClick={() => setActiveSection('telegram')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSection === 'telegram'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <Send size={18} />
                    Telegram Bot
                </button>
                <button
                    onClick={() => setActiveSection('developer')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSection === 'developer'
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <Wrench size={18} />
                    Developer & Recovery
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-black text-slate-800">
                            {activeSection === 'pallets' ? 'Registered Pallet Types' :
                                activeSection === 'locations' ? 'Registered Locations' :
                                    activeSection === 'telegram' ? 'Telegram Integration' : 'Developer & Recovery Operations'}
                        </h2>
                        <p className="text-sm text-slate-500">
                            {activeSection === 'pallets' ? 'Manage types of pallets tracked in the system.' :
                                activeSection === 'locations' ? 'Manage internal branches and external partners.' :
                                    activeSection === 'telegram' ? 'ตั้งค่าการแจ้งเตือนผ่าน Telegram Group หรือ Chat' : 'Advanced system maintenance and data recovery tools.'}
                        </p>
                    </div>
                    {activeSection !== 'telegram' && activeSection !== 'developer' && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                        >
                            <Plus size={18} />
                            Add New
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    {activeSection === 'pallets' ? (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                <tr>
                                    <th className="p-4 pl-6">ID</th>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Material</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4 text-center">Color Code</th>
                                    <th className="p-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {pallets.map((p) => {
                                    const dotStyle = { backgroundColor: !p.color.startsWith('bg-') ? p.color : undefined };
                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50/50">
                                            <td className="p-4 pl-6 font-mono text-slate-500">{p.id}</td>
                                            <td className="p-4 font-bold text-slate-900">{p.name}</td>
                                            <td className="p-4 capitalize text-slate-600">{p.material}</td>
                                            <td className="p-4">
                                                {p.isRental ? (
                                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-bold">Rental</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-bold">Owned</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {/* eslint-disable-next-line */}
                                                <div className={`w-6 h-6 rounded-full mx-auto shadow-sm border border-slate-200 ${p.color.startsWith('bg-') ? p.color : ''}`} {...{ style: dotStyle }}></div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button aria-label="Delete" className="text-slate-400 hover:text-red-500 transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : activeSection === 'locations' ? (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                <tr>
                                    <th className="p-4 pl-6">ID</th>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {/* Internal Branches */}
                                <tr className="bg-slate-50/50">
                                    <td colSpan={5} className="p-2 px-6 text-xs font-black text-slate-400 uppercase tracking-wider">Internal Branches</td>
                                </tr>
                                {branches.map((b) => (
                                    <tr key={b.id} className="hover:bg-slate-50/50">
                                        <td className="p-4 pl-6 font-mono text-slate-500">{b.id}</td>
                                        <td className="p-4 font-bold text-slate-900">{b.name}</td>
                                        <td className="p-4">
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold w-fit">
                                                <Building2 size={12} /> Internal
                                            </span>
                                        </td>
                                        <td className="p-4 uppercase text-xs font-bold text-slate-500">{b.type}</td>
                                        <td className="p-4 text-center">
                                            <button aria-label="Delete branch" className="text-slate-400 hover:text-red-500 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {/* External Partners */}
                                <tr className="bg-slate-50/50">
                                    <td colSpan={5} className="p-2 px-6 text-xs font-black text-slate-400 uppercase tracking-wider mt-4">External Partners</td>
                                </tr>
                                {partners.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50">
                                        <td className="p-4 pl-6 font-mono text-slate-500">{p.id}</td>
                                        <td className="p-4 font-bold text-slate-900">{p.name}</td>
                                        <td className="p-4">
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs font-bold w-fit">
                                                <Truck size={12} /> External
                                            </span>
                                        </td>
                                        <td className="p-4 uppercase text-xs font-bold text-slate-500">{p.type}</td>
                                        <td className="p-4 text-center">
                                            <button aria-label="Delete partner" className="text-slate-400 hover:text-red-500 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : activeSection === 'telegram' ? (
                        <div className="p-8 max-w-2xl">
                            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 flex items-start gap-4 mb-8">
                                <div className="p-3 bg-white rounded-xl shadow-sm">
                                    <Send className="text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-black text-blue-900 mb-1">Telegram Bot: @NSPalletBot</h3>
                                    <p className="text-sm text-blue-700 leading-relaxed">
                                        บอทจะทำหน้าที่ส่งการแจ้งเตือนเมื่อมีการทำรายการในระบบ คุณสามารถรับ <b>Chat ID</b> ได้โดยการทักแชทไปที่บอท <b>@NSPalletBot</b> แล้วส่งข้อความอะไรก็ได้ จากนั้นใช้บอท <b>@userinfobot</b> เพื่อดูไอดีของคุณ หรือหากเป็นกลุ่มให้ใช้บอท <b>@GroupBuddy_Bot</b>
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Telegram Chat ID <span className="text-red-500">*</span></label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            placeholder="ระบุ Chat ID (เช่น -100123456789)"
                                            value={telegramChatId}
                                            onChange={(e) => setTelegramChatId(e.target.value)}
                                        />
                                        <button
                                            onClick={() => {
                                                updateSystemConfig({ telegramChatId: telegramChatId });
                                                Swal.fire('บันทึกสำเร็จ', 'Chat ID ถูกอัปเดตแล้ว', 'success');
                                            }}
                                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all"
                                        >
                                            <Save size={18} /> บันทึก
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 italic">* หากต้องการส่งเข้ากลุ่ม ให้ดึงบอทเข้ากลุ่มก่อนแล้วหา Chat ID ของกลุ่มนั้น</p>
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <h4 className="font-bold text-slate-800 mb-4">ทดสอบการส่งข้อความ</h4>
                                    <button
                                        onClick={async () => {
                                            if (!telegramChatId) return Swal.fire('ผิดพลาด', 'กรุณาระบุ Chat ID ก่อน', 'error');
                                            const res = await telegramService.sendMessage(telegramChatId, '🔔 *ทดสอบการแจ้งเตือน*\nระบบบริหารจัดการพาเลทเชื่อมต่อสำเร็จแล้ว!');
                                            if (res?.ok) {
                                                Swal.fire('สำเร็จ', 'ส่งข้อความทดสอบแล้ว กรุณาเช็คที่ Telegram', 'success');
                                            } else {
                                                Swal.fire('ล้มล้ว', 'ไม่สามารถส่งได้ กรุณาเช็ค Chat ID อีกครั้ง', 'error');
                                            }
                                        }}
                                        className="w-full py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2 border border-slate-200"
                                    >
                                        <Send size={16} /> ส่งข้อความทดสอบ (Test Notification)
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 max-w-2xl space-y-8">
                            <div className="bg-red-50 rounded-2xl p-6 border border-red-100 flex items-start gap-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm">
                                    <Wrench className="text-red-600" />
                                </div>
                                <div>
                                    <h3 className="font-black text-red-900 mb-1">Stock Data Recovery</h3>
                                    <p className="text-sm text-red-700 leading-relaxed">
                                        ใช้เครื่องมือเหล่านี้เพื่อแก้ไขปัญหาข้อมูลไม่ถูกต้อง หรือสต็อกแสดงผลเป็น 0 ทั้งที่ควรมีข้อมูล
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-start gap-4 hover:border-blue-200 transition-all">
                                    <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-blue-600">
                                        <Package size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-800 mb-1">Deep Reset (Clear All Data)</h4>
                                        <p className="text-xs text-slate-500 mb-4">ล้างยอดสต็อก ประวัติ และคำขอทั้งหมดเป็น 0 (เริ่มระบบใหม่)</p>
                                        <button
                                            onClick={handleSeedDemoData}
                                            className="w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-all"
                                        >
                                            Reset Entire System (Zero)
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-start gap-4 hover:border-amber-200 transition-all">
                                    <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-amber-600">
                                        <Building2 size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-800 mb-1">Reset Branch Stock to 0</h4>
                                        <p className="text-xs text-slate-500 mb-4">ล้างสต็อกรายสาขาให้เป็น 0 (กรณีข้อมูลผิดพลาดรุนแรง)</p>
                                        <button
                                            onClick={() => handleRepairBranch()}
                                            className="w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
                                        >
                                            Select Branch to Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center shrink-0">
                            <h2 className="text-white font-bold text-lg flex items-center gap-2">
                                <Plus size={20} className="text-blue-400" />
                                Add New {activeSection === 'pallets' ? 'Pallet Type' : 'Location'}
                            </h2>
                            <button
                                aria-label="Close modal"
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors bg-white/10 p-1 rounded-full"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={activeSection === 'pallets' ? handleAddPallet : handleAddLocation} className="p-6 space-y-4 overflow-y-auto">
                            {activeSection === 'pallets' ? (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ID (Unique)</label>
                                        <input required type="text" value={newPallet.id || ''} onChange={e => setNewPallet({ ...newPallet, id: e.target.value as any })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500/20" placeholder="e.g. plastic_blue" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name</label>
                                        <input required type="text" value={newPallet.name || ''} onChange={e => setNewPallet({ ...newPallet, name: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500/20" placeholder="Display Name" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Material</label>
                                            <select aria-label="Select Material" value={newPallet.material} onChange={e => setNewPallet({ ...newPallet, material: e.target.value as any })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                                                <option value="wood">Wood</option>
                                                <option value="plastic">Plastic</option>
                                                <option value="metal">Metal</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</label>
                                            <select aria-label="Select Pallet Type" value={newPallet.isRental ? 'rental' : 'owned'} onChange={e => setNewPallet({ ...newPallet, isRental: e.target.value === 'rental' })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                                                <option value="owned">Owned</option>
                                                <option value="rental">Rental</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Color Code (รหัสสี)</label>
                                        <div className="grid grid-cols-8 gap-2">
                                            {[
                                                'bg-red-600', 'bg-orange-500', 'bg-amber-400', 'bg-green-600',
                                                'bg-blue-600', 'bg-indigo-600', 'bg-purple-600', 'bg-gray-400'
                                            ].map(color => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => setNewPallet({ ...newPallet, color })}
                                                    className={`w-8 h-8 rounded-full border-2 transition-all ${newPallet.color === color ? 'border-slate-900 scale-110 shadow-md' : 'border-transparent hover:scale-110'
                                                        } ${color}`}
                                                    aria-label={`Select color ${color}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location Name</label>
                                        <input required type="text" value={newLocation.name} onChange={e => setNewLocation({ ...newLocation, name: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500/20" placeholder="e.g. Bang Na Branch" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Access Type</label>
                                        <div className="flex bg-slate-100 p-1 rounded-xl">
                                            <button type="button" onClick={() => setNewLocation({ ...newLocation, type: 'internal', subType: 'BRANCH' })} className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${newLocation.type === 'internal' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>Internal</button>
                                            <button type="button" onClick={() => setNewLocation({ ...newLocation, type: 'external', subType: 'customer' })} className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${newLocation.type === 'external' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>External</button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sub-Type</label>
                                        <select aria-label="Select Location Sub-Type" value={newLocation.subType} onChange={e => setNewLocation({ ...newLocation, subType: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                                            {newLocation.type === 'internal' ? (
                                                <>
                                                    <option value="BRANCH">Branch (สาขา)</option>
                                                    <option value="HUB">Hub (ศูนย์กระจายสินค้า)</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="customer">Customer (ลูกค้า)</option>
                                                    <option value="provider">Provider (ผู้ให้บริการ)</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                </>
                            )}
                            <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">
                                <Save size={18} className="inline mr-2" /> Save Record
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsTab;
