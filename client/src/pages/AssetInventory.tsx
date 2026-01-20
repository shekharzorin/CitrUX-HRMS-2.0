import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { WidgetHeader } from '../components/ui/DashboardElements';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icons';

const AssetInventory: React.FC = () => {
    const { showToast } = useToast();
    const [assets, setAssets] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [form, setForm] = useState({ name: '', type: '', serialNumber: '', purchasedAt: '' });
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([fetchAssets(), fetchUsers()]);
            setLoading(false);
        };
        init();
    }, []);

    const fetchAssets = async () => {
        try {
            const data = await api.get<any[]>('/assets');
            if (data) setAssets(data);
        } catch (error) { console.error(error); }
    };

    const fetchUsers = async () => {
        try {
            const data = await api.get<any[]>('/users');
            if (data) setUsers(data);
        } catch (error) { console.error(error); }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/assets', form);
            showToast('Asset Created', 'success');
            setIsOpen(false);
            fetchAssets();
            setForm({ name: '', type: '', serialNumber: '', purchasedAt: '' });
        } catch (error) { console.error(error); showToast('Failed to create asset', 'error'); }
    };

    const handleAssign = async (id: string, userId: string) => {
        try {
            await api.put(`/assets/${id}/assign`, { userId }); // Using put not patch based on typical crud
            fetchAssets();
            showToast('Asset assigned successfully', 'success');
        } catch (error) { console.error(error); showToast('Assignment failed', 'error'); }
    };

    const handleReturn = async (id: string) => {
        try {
            await api.put(`/assets/${id}/return`, {});
            fetchAssets();
            showToast('Asset returned successfully', 'success');
        } catch (error) { console.error(error); showToast('Return failed', 'error'); }
    };

    return (
        <div className="page-container space-y-8">
            <PageHeader
                title="Asset Inventory"
                subtitle="Manage company assets and track assignments."
                icon="inventory"
                actions={
                    <Button
                        onClick={() => setIsOpen(!isOpen)}
                        leftIcon={<Icon name="plus" size={18} />}
                        className="shadow-lg shadow-indigo-500/20"
                    >
                        {isOpen ? 'Cancel' : 'Add New Asset'}
                    </Button>
                }
            />

            {isOpen && (
                <div className="glass-panel p-6 mb-8 max-w-2xl animate-fade-in shadow-lg">
                    <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Register New Asset</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Asset Name</label>
                                <input type="text" placeholder="e.g. MacBook Pro M1" className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div>
                                <label className="form-label">Type</label>
                                <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} required title="Asset Type" aria-label="Asset Type">
                                    <option value="">Select Type</option>
                                    <option value="LAPTOP">Laptop</option>
                                    <option value="PHONE">Phone</option>
                                    <option value="LICENSE">License</option>
                                    <option value="FURNITURE">Furniture</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Serial Number</label>
                                <input type="text" placeholder="Optional" className="input-field" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} />
                            </div>
                            <div>
                                <label className="form-label">Purchase Date</label>
                                <input type="date" className="input-field" value={form.purchasedAt} onChange={e => setForm({ ...form, purchasedAt: e.target.value })} title="Purchase Date" aria-label="Purchase Date" />
                            </div>
                        </div>
                        <div className="pt-2">
                            <Button type="submit" className="w-full">Register Asset</Button>
                        </div>
                    </form>
                </div>
            )}

            <Card noPadding className="overflow-hidden border-none shadow-sm">
                <div className="p-6 border-b border-slate-100 bg-white dark:bg-slate-800">
                    <WidgetHeader
                        title="Inventory List"
                        icon="inventory"
                        className="mb-0"
                    />
                </div>
                {loading ? (
                    <div className="p-6 space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4">
                                <Skeleton width="30%" height={24} />
                                <Skeleton width="20%" height={24} />
                                <Skeleton width="20%" height={24} />
                                <Skeleton width="30%" height={24} />
                            </div>
                        ))}
                    </div>
                ) : assets.length === 0 ? (
                    <EmptyState
                        title="No Assets Found"
                        description="Start by adding your first company asset affecting inventory."
                        icon="inventory"
                        action={{ label: 'Add First Asset', onClick: () => setIsOpen(true) }}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Asset Name</th>
                                    <th>Type</th>
                                    <th>Serial</th>
                                    <th>Status</th>
                                    <th>Assigned To</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map(asset => (
                                    <tr key={asset.id}>
                                        <td className="font-bold text-slate-800 dark:text-slate-200">
                                            {asset.name}
                                        </td>
                                        <td>
                                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                {asset.type}
                                            </span>
                                        </td>
                                        <td className="font-mono text-xs text-slate-500">
                                            {asset.serialNumber || '-'}
                                        </td>
                                        <td>
                                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest
                                                ${asset.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' :
                                                    asset.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                {asset.status}
                                            </span>
                                        </td>
                                        <td>
                                            {asset.assignedTo ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-slate-700">{asset.user?.profile?.firstName}</span>
                                                    <span className="text-[10px] text-slate-400">{asset.user?.email}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic">Unassigned</span>
                                            )}
                                        </td>
                                        <td>
                                            {asset.status === 'AVAILABLE' ? (
                                                <select
                                                    onChange={(e) => handleAssign(asset.id, e.target.value)}
                                                    className="input-field py-1 text-xs w-40"
                                                    defaultValue=""
                                                    aria-label="Assign User"
                                                >
                                                    <option value="" disabled>Assign User...</option>
                                                    {users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
                                                </select>
                                            ) : (
                                                <button
                                                    onClick={() => handleReturn(asset.id)}
                                                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded transition-colors"
                                                >
                                                    Return Asset
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AssetInventory;
