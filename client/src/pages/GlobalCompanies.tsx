import React, { useState, useEffect } from 'react';
import { Icon } from '../components/ui/Icons';
import { PageHeader } from '../components/ui/PageHeader';
import { StatsCardPremium } from '../components/ui/DashboardElements';
import { Dropdown } from '../components/ui/Dropdown';
import { Modal } from '../components/ui/Modal';

import { api } from '../services/api';

export const GlobalCompanies: React.FC = () => {
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'hard' | 'archive' } | null>(null);
    
    // Modal state
    const [formData, setFormData] = useState({
        name: '',
        domain: '',
        plan: 'STARTER',
        slogan: '',
        adminEmail: '',
        adminPassword: '',
        adminFirstName: '',
        adminLastName: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadCompanies();
    }, []);

    const loadCompanies = async () => {
        try {
            setLoading(true);
            const data: any = await api.get('/companies');
            setCompanies(data.value || []);
        } catch (e) {
            console.error("Failed to fetch companies", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            
            if (editingId) {
                await api.put(`/companies/${editingId}`, formData);
            } else {
                await api.post('/companies', formData);
            }
            
            setShowModal(false);
            setEditingId(null);
            setFormData({ name: '', domain: '', plan: 'STARTER', slogan: '', adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '' });
            loadCompanies();
        } catch (e: any) {
            alert(e.message || "Failed to save company");
        } finally {
            setSubmitting(false);
        }
    };

    const handleArchive = (id: string) => {
        setConfirmDelete({ id, type: 'archive' });
    };

    const handleUnarchive = async (id: string) => {
        try {
            await api.put(`/companies/${id}/restore`, {});
            loadCompanies();
        } catch (e: any) {
            alert(e.message || "Failed to unarchive company");
        }
    };

    const handleHardDelete = (id: string) => {
        setConfirmDelete({ id, type: 'hard' });
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Global Companies" 
                subtitle="Manage HRMS tenants and super admins"
                actions={
                    <button onClick={() => { setEditingId(null); setFormData({ name: '', domain: '', plan: 'STARTER', slogan: '', adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '' }); setShowModal(true); }} className="btn-primary">
                        <Icon name="plus" size={20} />
                        <span>Add Company</span>
                    </button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCardPremium
                    title="Total Tenants"
                    value={companies.length.toString()}
                    subtext="Active companies on platform"
                    icon="departments"
                    variant="purple"
                />
                <StatsCardPremium
                    title="Total Users"
                    value={companies.reduce((sum, c) => sum + c.employeeCount, 0).toString()}
                    subtext="Across all tenants"
                    icon="employees"
                    variant="green"
                />
                <StatsCardPremium
                    title="System Health"
                    value="Optimal"
                    subtext="All clusters operational"
                    icon="check_circle"
                    variant="orange"
                />
            </div>

            <div className="glass-panel p-6">
                {loading ? (
                    <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-[var(--border-light)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                                    <th className="pb-4 font-bold">Company Name</th>
                                    <th className="pb-4 font-bold">Domain</th>
                                    <th className="pb-4 font-bold">Tagline</th>
                                    <th className="pb-4 font-bold">Plan</th>
                                    <th className="pb-4 font-bold">Super Admin</th>
                                    <th className="pb-4 font-bold">Users</th>
                                    <th className="pb-4 font-bold text-right">Registered</th>
                                    <th className="pb-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-light)]">
                                {companies.map((c: any) => (
                                    <tr key={c.id} className={`group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors ${c.status === 'ARCHIVED' ? 'opacity-60 grayscale' : ''}`}>
                                        <td className="py-4 font-semibold text-[var(--text-main)] flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm">
                                                {c.name.charAt(0).toUpperCase()}
                                            </div>
                                            {c.name}
                                        </td>
                                        <td className="py-4 text-sm text-[var(--text-muted)] font-mono">{c.domain || '-'}</td>
                                        <td className="py-4 text-sm text-[var(--text-muted)]">{c.slogan || '-'}</td>
                                        <td className="py-4">
                                            <span className="px-2.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg text-xs font-bold border border-purple-200 dark:border-purple-800/50">
                                                {c.plan}
                                            </span>
                                            {c.status === 'ARCHIVED' && (
                                                <span className="ml-2 px-2.5 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700">
                                                    Archived
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold">{c.superAdminName || 'No Admin'}</span>
                                                <span className="text-xs text-[var(--text-muted)]">{c.superAdminEmail}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-sm font-medium">{c.employeeCount}</td>
                                        <td className="py-4 text-sm text-[var(--text-muted)] text-right">
                                            {new Date(c.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-4 text-right">
                                            <Dropdown
                                                trigger={
                                                    <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-2 transition-colors inline-flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                                                        <Icon name="more_horizontal" size={20} />
                                                    </button>
                                                }
                                                items={[
                                                    {
                                                        label: 'Edit',
                                                        icon: 'edit',
                                                        onClick: () => {
                                                            const [fName, ...lName] = (c.superAdminName || '').split(' ');
                                                            setEditingId(c.id);
                                                            setFormData({
                                                                name: c.name,
                                                                domain: c.domain || '',
                                                                plan: c.plan || 'STARTER',
                                                                slogan: c.slogan || '',
                                                                adminEmail: c.superAdminEmail || '',
                                                                adminPassword: '',
                                                                adminFirstName: fName || '',
                                                                adminLastName: lName.join(' ') || ''
                                                            });
                                                            setShowModal(true);
                                                        }
                                                    },
                                                    c.status !== 'ARCHIVED' ? {
                                                        label: 'Archive',
                                                        icon: 'download',
                                                        onClick: () => handleArchive(c.id)
                                                    } : {
                                                        label: 'Unarchive',
                                                        icon: 'rotate_ccw',
                                                        onClick: () => handleUnarchive(c.id)
                                                    },
                                                    {
                                                        label: 'Delete Permanently',
                                                        icon: 'delete',
                                                        variant: 'danger',
                                                        onClick: () => handleHardDelete(c.id)
                                                    }
                                                ]}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-xl font-bold">{editingId ? 'Edit Company' : 'Add New Company'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form id="add-company-form" onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider">Company Details</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="form-label">Company Name *</label>
                                            <input required type="text" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
                                                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="form-label">Subdomain (e.g. acme)</label>
                                            <input type="text" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
                                                value={formData.domain} onChange={e => setFormData({...formData, domain: e.target.value})} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="form-label">Subscription Plan</label>
                                        <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                            value={formData.plan} onChange={e => setFormData({...formData, plan: e.target.value})}>
                                            <option value="STARTER">Starter</option>
                                            <option value="PRO">Professional</option>
                                            <option value="ENTERPRISE">Enterprise</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label">Company Tagline (e.g. Citrux SaaS)</label>
                                        <input type="text" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
                                            value={formData.slogan} onChange={e => setFormData({...formData, slogan: e.target.value})} placeholder="Citrux SaaS" />
                                    </div>
                                </div>

                                <hr className="border-slate-100 dark:border-slate-800" />

                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider">Super Admin Credentials</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="form-label">Admin First Name</label>
                                            <input type="text" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
                                                value={formData.adminFirstName} onChange={e => setFormData({...formData, adminFirstName: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="form-label">Admin Last Name</label>
                                            <input type="text" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
                                                value={formData.adminLastName} onChange={e => setFormData({...formData, adminLastName: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="form-label">Admin Email *</label>
                                            <input required type="email" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
                                                value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="form-label">Admin Password {editingId ? '(Leave blank to keep current)' : '*'}</label>
                                            <input required={!editingId} type="text" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
                                                value={formData.adminPassword} onChange={e => setFormData({...formData, adminPassword: e.target.value})} placeholder={editingId ? '********' : ''} />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={submitting} form="add-company-form" className={`btn-primary ${submitting ? 'opacity-70 cursor-wait' : ''}`}>
                                {submitting ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Company')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                isOpen={confirmDelete !== null}
                onClose={() => setConfirmDelete(null)}
                title={confirmDelete?.type === 'hard' ? 'Permanent Delete' : 'Archive Company'}
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-500 p-4 rounded-xl">
                        <Icon name="warning" size={24} className="shrink-0 mt-0.5" />
                        <p className="text-sm font-medium leading-relaxed">
                            {confirmDelete?.type === 'hard' 
                                ? "WARNING: This will permanently delete the company and ALL its data (users, leaves, etc.). This CANNOT be undone."
                                : "Are you sure you want to archive this company? Users will no longer be able to access the platform."}
                        </p>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            className="px-4 py-2 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            onClick={() => setConfirmDelete(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${
                                confirmDelete?.type === 'hard' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
                            }`}
                            onClick={async () => {
                                if (!confirmDelete) return;
                                try {
                                    if (confirmDelete.type === 'hard') {
                                        await api.delete(`/companies/${confirmDelete.id}/hard`);
                                    } else {
                                        await api.delete(`/companies/${confirmDelete.id}`);
                                    }
                                    loadCompanies();
                                    setConfirmDelete(null);
                                } catch (e: any) {
                                    alert(e.message || "Failed to delete company");
                                }
                            }}
                        >
                            {confirmDelete?.type === 'hard' ? 'Permanently Delete' : 'Archive'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default GlobalCompanies;
