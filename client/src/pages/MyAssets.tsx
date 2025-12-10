import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const MyAssets: React.FC = () => {
    const { token } = useAuth();
    const [assets, setAssets] = useState<any[]>([]);

    useEffect(() => {
        fetchMyAssets();
    }, []);

    const fetchMyAssets = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/assets/my', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setAssets(await res.json());
        } catch (error) { console.error(error); }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">My Assigned Assets</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assets.length === 0 && <div className="text-slate-500">No assets assigned to you.</div>}
                {assets.map(asset => (
                    <div key={asset.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                {asset.type === 'LAPTOP' ? '💻' : asset.type === 'PHONE' ? '📱' : '📦'}
                            </div>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">Active</span>
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 mb-1">{asset.name}</h3>
                        <p className="text-slate-500 text-sm mb-4">Serial: {asset.serialNumber || 'N/A'}</p>
                        <div className="text-xs text-slate-400">Assigned Date: {new Date(asset.updatedAt || new Date()).toLocaleDateString()}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MyAssets;
