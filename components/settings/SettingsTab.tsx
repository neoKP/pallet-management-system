import React, { useState } from 'react';
import { Settings, MapPin, Package, Plus, Trash2, Save, Building2, Truck, X } from 'lucide-react';
import { PALLET_TYPES, BRANCHES, EXTERNAL_PARTNERS } from '../../constants';
import { PalletType, Branch, Partner, BranchId } from '../../types';
import Swal from 'sweetalert2';

const SettingsTab: React.FC = () => {
    const [activeSection, setActiveSection] = useState<'pallets' | 'locations'>('pallets');

    // Local state to simulate management (Note: Real implementation requires moving constants to Context/Firebase)
    const [pallets, setPallets] = useState<PalletType[]>(PALLET_TYPES);
    const [branches, setBranches] = useState<Branch[]>(BRANCHES);
    const [partners, setPartners] = useState<Partner[]>(EXTERNAL_PARTNERS);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Temporary form state
    const [newPallet, setNewPallet] = useState<Partial<PalletType>>({ material: 'wood', isRental: false, color: '#cccccc' });
    const [newLocation, setNewLocation] = useState<{ name: string, type: 'internal' | 'external', subType: string }>({ name: '', type: 'internal', subType: 'BRANCH' });

    const handleAddPallet = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPallet.id || !newPallet.name) return;

        const pallet: PalletType = {
            id: newPallet.id as any,
            name: newPallet.name,
            color: newPallet.color || 'bg-gray-400', // Simplified color handling
            isRental: newPallet.isRental || false,
            material: newPallet.material || 'wood'
        };

        setPallets([...pallets, pallet]);
        setIsAddModalOpen(false);
        Swal.fire('Success', 'Pallet type added successfully (Local Session Only)', 'success');
    };

    const handleAddLocation = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLocation.name) return;

        if (newLocation.type === 'internal') {
            const newBranch: Branch = {
                id: newLocation.name.toLowerCase().replace(/\s+/g, '_') as BranchId,
                name: newLocation.name,
                type: newLocation.subType as 'HUB' | 'BRANCH'
            };
            setBranches([...branches, newBranch]);
        } else {
            const newPartner: Partner = {
                id: newLocation.name.toLowerCase().replace(/\s+/g, '_'),
                name: newLocation.name,
                type: newLocation.subType as 'customer' | 'provider',
                allowedPallets: [] // Default empty
            };
            setPartners([...partners, newPartner]);
        }
        setIsAddModalOpen(false);
        Swal.fire('Success', 'Location added successfully (Local Session Only)', 'success');
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
            <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
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
                    Locations (Source/Dest)
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-black text-slate-800">
                            {activeSection === 'pallets' ? 'Registered Pallet Types' : 'Registered Locations'}
                        </h2>
                        <p className="text-sm text-slate-500">
                            {activeSection === 'pallets'
                                ? 'Manage types of pallets tracked in the system.'
                                : 'Manage internal branches and external partners.'}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                    >
                        <Plus size={18} />
                        Add New
                    </button>
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
                                                <div
                                                    className={`w-6 h-6 rounded-full mx-auto shadow-sm border border-slate-200 ${p.color.startsWith('bg-') ? p.color : ''}`}
                                                    style={dotStyle}
                                                ></div>
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
                    ) : (
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
