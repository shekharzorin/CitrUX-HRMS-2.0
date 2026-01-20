import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Card } from '../components/ui/Card';

const MyAssets: React.FC = () => {
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyAssets();
    }, []);

    const fetchMyAssets = async () => {
        try {
            const data = await api.get<any[]>('/assets/my');
            if (data) setAssets(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container space-y-8">
            <PageHeader
                title="My Assigned Assets"
                subtitle="View all company assets currently assigned to you."
                icon="assets"
            />

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            ) : assets.length === 0 ? (
                <EmptyState
                    title="No Assets Assigned"
                    description="You currently have no company assets assigned to you."
                    icon="assets"
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assets.map(asset => (
                        <Card key={asset.id} className="hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg text-2xl">
                                    {asset.type === 'LAPTOP' ? '💻' : asset.type === 'PHONE' ? '📱' : '📦'}
                                </div>
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded uppercase tracking-wider">
                                    Active
                                </span>
                            </div>
                            <h3 className="font-bold text-lg text-slate-800 mb-1">{asset.name}</h3>
                            <p className="text-slate-500 text-sm font-mono mb-4">Serial: {asset.serialNumber || 'N/A'}</p>
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-medium uppercase tracking-wider">
                                <span>Assigned On</span>
                                <span>{new Date(asset.updatedAt || new Date()).toLocaleDateString()}</span>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyAssets;
