import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Assets: React.FC = () => {
    const { token } = useAuth();
    const [assets, setAssets] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [form, setForm] = useState({ name: '', type: '', serialNumber: '', purchasedAt: '' });
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        fetchAssets();
        fetchUsers();
    }, []);

    const fetchAssets = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/assets', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setAssets(await res.json());
        } catch (error) { console.error(error); }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/users', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setUsers(await res.json());
        } catch (error) { console.error(error); }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                alert('Asset Created');
                setIsOpen(false);
                fetchAssets();
                setForm({ name: '', type: '', serialNumber: '', purchasedAt: '' });
            }
        } catch (error) { console.error(error); }
    };

    const handleAssign = async (id: string, userId: string) => {
        try {
            const res = await fetch(`http://localhost:5000/api/assets/${id}/assign`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ userId })
            });
            if (res.ok) fetchAssets();
        } catch (error) { console.error(error); }
    };

    const handleReturn = async (id: string) => {
        try {
            const res = await fetch(`http://localhost:5000/api/assets/${id}/return`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) fetchAssets();
        } catch (error) { console.error(error); }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Asset Inventory</h1>
                <button onClick={() => setIsOpen(!isOpen)} className="btn-primary">
                    {isOpen ? 'Cancel' : '+ Add Asset'}
                </button>
            </div>

            {isOpen && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 max-w-2xl">
                    <h2 className="text-lg font-bold mb-4">Add New Asset</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" placeholder="Asset Name (e.g. MacBook Pro)" className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} required>
                                <option value="">Select Type</option>
                                <option value="LAPTOP">Laptop</option>
                                <option value="PHONE">Phone</option>
                                <option value="LICENSE">License</option>
                                <option value="FURNITURE">Furniture</option>
                            </select>
                            <input type="text" placeholder="Serial Number" className="input-field" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} />
                            <input type="date" className="input-field" value={form.purchasedAt} onChange={e => setForm({ ...form, purchasedAt: e.target.value })} />
                        </div>
                        <button type="submit" className="btn-primary w-full">Add Asset</button>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-4 text-sm font-semibold text-slate-600">Asset Name</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Type</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Serial</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Assigned To</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map(asset => (
                            <tr key={asset.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-4 font-bold text-slate-800">{asset.name}</td>
                                <td className="p-4 text-sm">{asset.type}</td>
                                <td className="p-4 text-sm font-mono text-slate-500">{asset.serialNumber || '-'}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold 
                                        ${asset.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                                            asset.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                        {asset.status}
                                    </span>
                                </td>
                                <td className="p-4 text-sm">
                                    {asset.assignedTo ? (
                                        <div>
                                            <div className="font-bold">{asset.user?.profile?.firstName}</div>
                                            <div className="text-xs text-slate-500">{asset.user?.email}</div>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400">Unassigned</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    {asset.status === 'AVAILABLE' ? (
                                        <select onChange={(e) => handleAssign(asset.id, e.target.value)} className="input-field py-1 text-xs" defaultValue="">
                                            <option value="" disabled>Assign User</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
                                        </select>
                                    ) : (
                                        <button onClick={() => handleReturn(asset.id)} className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1 rounded">Return</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Assets;
