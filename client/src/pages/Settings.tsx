import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import ShiftConfig from './ShiftConfig';
import SalaryConfig from './SalaryConfig';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Tabs } from '../components/ui/Tabs';

const Settings: React.FC = () => {
    const { logout } = useAuth(); // Token unused by api service but kept for confirm modal/logic

    // Security State
    const [pass, setPass] = useState({ current: '', new: '', confirm: '' });

    // General Settings State
    const [companyName, setCompanyName] = useState(localStorage.getItem('company_name') || '');
    const [companyLogo, setCompanyLogo] = useState(localStorage.getItem('company_logo') || '');
    const [companyFavicon, setCompanyFavicon] = useState(localStorage.getItem('company_favicon') || '');

    // Employee ID Settings State
    const [empSettings, setEmpSettings] = useState({
        autoGenerate: false,
        prefix: 'EMP-',
        sequence: '1',
        padding: '4'
    });

    // Leave & Holidays State
    const [leaves, setLeaves] = useState<any[]>([]);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [newLeave, setNewLeave] = useState({ name: '', code: '', daysPerYear: 12, carryForward: false });
    const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'Public' });

    // Modal State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'danger' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'danger'
    });

    // Roles State
    const [roles, setRoles] = useState<any[]>([]);
    const [newRole, setNewRole] = useState({ title: '', department: '', level: 0, description: '' });
    const [activeTab, setActiveTab] = useState<'general' | 'roles' | 'leaves' | 'holidays' | 'shifts' | 'salary' | 'security' | 'danger'>('general');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        if (activeTab === 'roles') fetchRoles();
        if (activeTab === 'leaves') fetchLeaveTypes();
        if (activeTab === 'holidays') fetchHolidays();
    }, [activeTab]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const data = await api.get<any>('/settings');
            if (data) {
                if (data['company_name']) setCompanyName(data['company_name']);
                if (data['company_logo']) setCompanyLogo(data['company_logo']);
                if (data['company_favicon']) setCompanyFavicon(data['company_favicon']);
                setEmpSettings({
                    autoGenerate: data['EMP_ID_AUTO_GENERATE'] === 'true',
                    prefix: data['EMP_ID_PREFIX'] || 'EMP-',
                    sequence: data['EMP_ID_SEQUENCE'] || '1',
                    padding: data['EMP_ID_PADDING'] || '4'
                });
            }
            // Initial fetch of other important data
            await Promise.all([fetchRoles(), fetchLeaveTypes(), fetchHolidays()]);
        } catch (error) {
            console.error("Failed to fetch settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const data = await api.get<any[]>('/job-roles');
            setRoles(data || []);
        } catch (error) { console.error(error); }
    };

    const fetchLeaveTypes = async () => {
        try {
            const data = await api.get<any[]>('/leaves/types');
            setLeaves(data || []);
        } catch (error) { console.error(error); }
    };

    const fetchHolidays = async () => {
        try {
            const data = await api.get<any[]>('/holidays');
            setHolidays(data || []);
        } catch (error) { console.error(error); }
    };

    const saveEmpSettings = async () => {
        try {
            const settingsToSave = {
                'EMP_ID_AUTO_GENERATE': empSettings.autoGenerate.toString(),
                'EMP_ID_PREFIX': empSettings.prefix,
                'EMP_ID_SEQUENCE': empSettings.sequence,
                'EMP_ID_PADDING': empSettings.padding
            };
            await api.post('/settings', { settings: settingsToSave });
            alert('Employee ID Settings Saved!');
        } catch (error) { console.error(error); }
    };

    const handleChangePass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pass.new !== pass.confirm) return alert('New passwords do not match');
        try {
            await api.put('/profile/password', { currentPassword: pass.current, newPassword: pass.new });
            alert('Password Updated');
            setPass({ current: '', new: '', confirm: '' });
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Failed to update password');
        }
    };

    const handleUpdateGeneral = async () => {
        try {
            const settingsToSave = { 'company_name': companyName, 'company_logo': companyLogo, 'company_favicon': companyFavicon };
            await api.post('/settings', { settings: settingsToSave });

            // Update local storage
            localStorage.setItem('company_name', companyName);
            localStorage.setItem('company_logo', companyLogo);
            localStorage.setItem('company_favicon', companyFavicon);

            // Dispatch events for other components
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('branding-update'));

            alert('General settings updated successfully!');
        } catch (error) { console.error(error); }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate dimensions first
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
                const image = new Image();
                image.onload = async () => {
                    if (image.width > 500 || image.height > 500) {
                        alert(`Image dimensions (${image.width}x${image.height}px) exceed the maximum allowed size of 500x500px.`);
                        e.target.value = ''; return;
                    }

                    // Upload via FormData
                    try {
                        const formData = new FormData();
                        formData.append('file', file);
                        setLoading(true);
                        const data = await api.post<{ url: string }>('/onboarding/upload', formData);
                        if (data?.url) {
                            setCompanyLogo(data.url);
                        }
                    } catch (error) {
                        console.error("Upload failed", error);
                        alert("Failed to upload logo");
                    } finally {
                        setLoading(false);
                    }
                };
                if (readerEvent.target?.result) image.src = readerEvent.target.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate dimensions first
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
                const image = new Image();
                image.onload = async () => {
                    // Check dimensions (skip for SVGs or 0-dimension detection issues)
                    const isSvg = file.type === 'image/svg+xml' || file.name.endsWith('.svg');
                    // Relaxed validation: Only check if NOT svg and dimensions are clearly read
                    if (!isSvg && image.width > 0 && (image.width > 256 || image.height > 256)) {
                        alert(`Favicon dimensions (${image.width}x${image.height}px) are too large. Max 256x256px.`);
                        e.target.value = ''; return;
                    }

                    // Upload via FormData
                    try {
                        const formData = new FormData();
                        formData.append('file', file);
                        setLoading(true);
                        const data = await api.post<{ url: string }>('/onboarding/upload', formData);
                        if (data?.url) {
                            setCompanyFavicon(data.url);
                        }
                    } catch (error: any) {
                        console.error("Favicon Upload Error", error);
                        // Show specific error if available
                        alert(error.response?.data?.message || error.message || "Failed to upload favicon. Please ensure it is a valid image file.");
                    } finally {
                        setLoading(false);
                    }
                };

                // Fallback for load error (e.g. ICO not supported by Image in some envs, or corrupt)
                image.onerror = async () => {
                    // If client-side parse fails, try uploading anyway (let backend decide)
                    console.warn("Client-side image parsing failed, attempting upload anyway...");
                    try {
                        const formData = new FormData();
                        formData.append('file', file);
                        setLoading(true);
                        const data = await api.post<{ url: string }>('/onboarding/upload', formData);
                        if (data?.url) {
                            setCompanyFavicon(data.url);
                        }
                    } catch (error: any) {
                        console.error("Upload failed", error);
                        alert(error.response?.data?.message || "Failed to upload favicon.");
                    } finally {
                        setLoading(false);
                    }
                };

                if (readerEvent.target?.result) image.src = readerEvent.target.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/job-roles', newRole);
            setNewRole({ title: '', department: '', level: 0, description: '' });
            fetchRoles();
        } catch (error) { console.error(error); }
    };

    const handleDeleteRole = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Delete Role',
            message: 'Are you sure you want to delete this job role?',
            type: 'danger',
            onConfirm: async () => {
                await api.delete(`/job-roles/${id}`);
                fetchRoles();
            }
        });
    };

    const handleCreateLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/leaves/types', newLeave);
            setNewLeave({ name: '', code: '', daysPerYear: 12, carryForward: false });
            fetchLeaveTypes();
        } catch (error) { console.error(error); }
    };

    const handleDeleteLeave = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Delete Leave Type',
            message: 'Are you sure? This may affect employee balances.',
            type: 'danger',
            onConfirm: async () => {
                await api.delete(`/leaves/types/${id}`);
                fetchLeaveTypes();
            }
        });
    };

    const handleCreateHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/holidays', newHoliday);
            setNewHoliday({ name: '', date: '', type: 'Public' });
            fetchHolidays();
        } catch (error) { console.error(error); }
    };

    const handleDeleteHoliday = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Delete Holiday',
            message: 'Remove this holiday from the calendar?',
            type: 'danger',
            onConfirm: async () => {
                await api.delete(`/holidays/${id}`);
                fetchHolidays();
            }
        });
    };

    const handleLogoutConfirm = () => {
        setConfirmState({
            isOpen: true,
            title: 'Sign Out',
            message: 'Are you sure you want to sign out?',
            type: 'danger',
            onConfirm: logout
        });
    };

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">System Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage global configurations and preferences</p>
                </div>
            </div>

            <div className="max-w-4xl">
                <Tabs
                    tabs={[
                        { id: 'general', label: 'General', icon: 'settings' },
                        { id: 'roles', label: 'Roles', icon: 'roles' },
                        { id: 'leaves', label: 'Leaves', icon: 'leaves' },
                        { id: 'holidays', label: 'Holidays', icon: 'holidays' },
                        { id: 'shifts', label: 'Shifts', icon: 'shifts' },
                        { id: 'salary', label: 'Salary', icon: 'payroll' },
                        { id: 'security', label: 'Security', icon: 'profile' },
                    ]}
                    activeTab={activeTab}
                    onChange={(id) => setActiveTab(id as any)}
                />
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="glass-panel p-6 md:p-8">
                            <div className="flex items-start gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center shadow-sm border border-fuchsia-100 dark:border-fuchsia-800">
                                    <Icon name="settings" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Organization Profile</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage your company branding and details</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label htmlFor="companyName" className="form-label">Company Name</label>
                                        <input id="companyName" type="text" className="input-field" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                                    </div>
                                    <Button onClick={handleUpdateGeneral} className="w-full md:w-auto">Save Changes</Button>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label htmlFor="companyLogo" className="form-label">Company Logo</label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-20 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 relative group overflow-hidden transition-colors hover:border-[var(--primary)] hover:bg-slate-100 dark:hover:bg-slate-800">
                                                {companyLogo ? <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-2" /> : <span className="text-[10px] text-slate-400">Upload</span>}
                                                <input id="companyLogo" type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" title="Upload Company Logo" />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                {companyLogo && (
                                                    <button
                                                        onClick={() => setCompanyLogo('')}
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wider self-start"
                                                    >
                                                        <Icon name="delete" size={16} /> Remove
                                                    </button>
                                                )}
                                                <p className="text-[10px] text-slate-400 max-w-[150px]">
                                                    Max size: 500x500px <br />
                                                    Formats: PNG, JPG, SVG
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="companyFavicon" className="form-label">Favicon</label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 relative group overflow-hidden transition-colors hover:border-[var(--primary)] hover:bg-slate-100 dark:hover:bg-slate-800">
                                                {companyFavicon ? <img src={companyFavicon} alt="Favicon" className="w-8 h-8 object-contain" /> : <span className="text-[10px] text-slate-400">Upload</span>}
                                                <input id="companyFavicon" type="file" accept="image/*" onChange={handleFaviconUpload} className="absolute inset-0 opacity-0 cursor-pointer" title="Upload Favicon" />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                {companyFavicon && (
                                                    <button
                                                        onClick={() => setCompanyFavicon('')}
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wider self-start"
                                                    >
                                                        <Icon name="delete" size={16} /> Remove
                                                    </button>
                                                )}
                                                <p className="text-[10px] text-slate-400 max-w-[150px]">
                                                    Max size: 256x256px <br />
                                                    Formats: PNG, ICO, SVG
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-6 md:p-8">
                            <div className="flex items-start gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm border border-blue-100 dark:border-blue-800">
                                    <Icon name="onboarding" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Employee IDs</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Auto-generation settings</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mb-8 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <input id="autoGenerate" type="checkbox" checked={empSettings.autoGenerate} onChange={e => setEmpSettings({ ...empSettings, autoGenerate: e.target.checked })} className="form-checkbox" />
                                <label htmlFor="autoGenerate" className="font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none text-sm">Enable Auto-Generation</label>
                            </div>
                            {empSettings.autoGenerate && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div><label htmlFor="prefix" className="form-label">Prefix</label><input id="prefix" className="input-field" value={empSettings.prefix} onChange={e => setEmpSettings({ ...empSettings, prefix: e.target.value })} /></div>
                                    <div><label htmlFor="sequence" className="form-label">Sequence</label><input id="sequence" type="number" className="input-field" value={empSettings.sequence} onChange={e => setEmpSettings({ ...empSettings, sequence: e.target.value })} /></div>
                                    <div><label htmlFor="padding" className="form-label">Padding</label><input id="padding" type="number" className="input-field" value={empSettings.padding} onChange={e => setEmpSettings({ ...empSettings, padding: e.target.value })} /></div>
                                </div>
                            )}
                            <Button onClick={saveEmpSettings} className="w-full md:w-auto">Save Configuration</Button>
                        </div>
                    </div>
                )}

                {activeTab === 'roles' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="glass-panel p-6 md:p-8">
                            <h2 className="text-lg font-bold mb-6 text-slate-800 dark:text-white">Create Job Role</h2>
                            <form onSubmit={handleCreateRole} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label htmlFor="roleTitle" className="form-label">Title</label><input id="roleTitle" className="input-field" required value={newRole.title} onChange={e => setNewRole({ ...newRole, title: e.target.value })} /></div>
                                <div><label htmlFor="roleDept" className="form-label">Department</label><input id="roleDept" className="input-field" value={newRole.department} onChange={e => setNewRole({ ...newRole, department: e.target.value })} /></div>
                                <div><label htmlFor="roleLevel" className="form-label">Level</label><input id="roleLevel" type="number" className="input-field" value={newRole.level} onChange={e => setNewRole({ ...newRole, level: Number(e.target.value) })} /></div>
                                <div><label htmlFor="roleDesc" className="form-label">Description</label><input id="roleDesc" className="input-field" value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} /></div>
                                <div className="md:col-span-2"><Button type="submit" className="w-full md:w-auto">Add Role</Button></div>
                            </form>
                        </div>
                        <div className="glass-panel overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="table-premium min-w-[600px]">
                                    <thead>
                                        <tr>
                                            <th>Title</th>
                                            <th>Dept</th>
                                            <th>Level</th>
                                            <th className="text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {loading ? (
                                            [...Array(3)].map((_, i) => (
                                                <tr key={i}>
                                                    <td className="p-4"><Skeleton width="60%" height={20} /></td>
                                                    <td className="p-4"><Skeleton width="40%" height={20} /></td>
                                                    <td className="p-4"><Skeleton width={60} height={24} variant="rounded" /></td>
                                                    <td className="p-4"><Skeleton width={24} height={24} className="ml-auto" /></td>
                                                </tr>
                                            ))
                                        ) : roles.length > 0 ? (
                                            roles.map(r => (
                                                <tr key={r.id}>
                                                    <td className="font-bold text-slate-700 dark:text-slate-200">{r.title}</td>
                                                    <td>{r.department}</td>
                                                    <td>
                                                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold text-slate-600 dark:text-slate-400">LVL {r.level}</span>
                                                    </td>
                                                    <td className="text-right">
                                                        <button onClick={() => handleDeleteRole(r.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors" title="Delete Role">
                                                            <Icon name="delete" size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="p-0">
                                                    <EmptyState title="No Job Roles" description="Define roles to assign to employees." icon="roles" className="py-12" />
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'leaves' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="glass-panel p-6 md:p-8">
                            <h2 className="text-lg font-bold mb-6 text-slate-800 dark:text-white">Leave Types Configuration</h2>
                            <form onSubmit={handleCreateLeave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label htmlFor="leaveName" className="form-label">Name</label><input id="leaveName" className="input-field" placeholder="e.g. Sick Leave" required value={newLeave.name} onChange={e => setNewLeave({ ...newLeave, name: e.target.value })} /></div>
                                <div><label htmlFor="leaveCode" className="form-label">Code</label><input id="leaveCode" className="input-field" placeholder="e.g. SL" required value={newLeave.code} onChange={e => setNewLeave({ ...newLeave, code: e.target.value.toUpperCase() })} /></div>
                                <div><label htmlFor="leaveDays" className="form-label">Days Per Year</label><input id="leaveDays" type="number" className="input-field" required value={newLeave.daysPerYear} onChange={e => setNewLeave({ ...newLeave, daysPerYear: Number(e.target.value) })} /></div>
                                <div className="flex items-center mt-8">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" id="carry" className="form-checkbox" checked={newLeave.carryForward} onChange={e => setNewLeave({ ...newLeave, carryForward: e.target.checked })} />
                                        <label htmlFor="carry" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none text-sm">Allow Carry Forward</label>
                                    </div>
                                </div>
                                <div className="md:col-span-2"><button type="submit" className="btn btn-primary w-full md:w-auto px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all">Create Leave Type</button></div>
                            </form>
                        </div>
                        <div className="glass-panel overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="table-premium min-w-[600px]">
                                    <thead><tr><th>Name</th><th>Code</th><th>Days/Year</th><th>Carry Forward</th><th></th></tr></thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {loading ? (
                                            [...Array(3)].map((_, i) => (
                                                <tr key={i}>
                                                    <td className="p-4"><Skeleton width="50%" height={20} /></td>
                                                    <td className="p-4"><Skeleton width={40} height={20} /></td>
                                                    <td className="p-4"><Skeleton width={60} height={20} /></td>
                                                    <td className="p-4"><Skeleton width={40} height={20} /></td>
                                                    <td className="p-4"><Skeleton width={40} height={20} className="ml-auto" /></td>
                                                </tr>
                                            ))
                                        ) : leaves.length > 0 ? (
                                            leaves.map(l => (
                                                <tr key={l.id}>
                                                    <td className="font-medium text-slate-900 dark:text-white">{l.name}</td>
                                                    <td><span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-mono text-slate-600 dark:text-slate-400">{l.code}</span></td>
                                                    <td>{l.daysPerYear} days</td>
                                                    <td>{l.carryForward ? <span className="text-green-600 dark:text-green-400 text-xs font-bold">Yes</span> : <span className="text-slate-400 text-xs">No</span>}</td>
                                                    <td className="text-right"><button onClick={() => handleDeleteLeave(l.id)} className="text-red-500 hover:text-red-700 font-medium text-xs">Delete</button></td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="p-0">
                                                    <EmptyState title="No Leave Types" description="Create leave types (e.g. Sick, Casual) for employees." icon="leaves" className="py-12" />
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'holidays' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="glass-panel p-6 md:p-8">
                            <h2 className="text-lg font-bold mb-6 text-slate-800 dark:text-white">Add Holiday</h2>
                            <form onSubmit={handleCreateHoliday} className="flex flex-col md:flex-row gap-6 items-end">
                                <div className="flex-1 w-full"><label htmlFor="holidayName" className="form-label">Holiday Name</label><input id="holidayName" className="input-field" required value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} /></div>
                                <div className="w-full md:w-48"><label htmlFor="holidayDate" className="form-label">Date</label><input id="holidayDate" type="date" className="input-field" required value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} /></div>
                                <div className="w-full md:w-40"><label htmlFor="holidayType" className="form-label">Type</label>
                                    <select id="holidayType" className="input-field" value={newHoliday.type} onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value })} title="Holiday Type">
                                        <option>Public</option><option>Optional</option><option>Observance</option>
                                    </select>
                                </div>
                                <button type="submit" className="btn btn-primary w-full md:w-auto px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all">Add</button>
                            </form>
                        </div>
                        <div className="glass-panel overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="table-premium min-w-[500px]">
                                    <thead><tr><th>Date</th><th>Holiday</th><th>Type</th><th></th></tr></thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {loading ? (
                                            [...Array(3)].map((_, i) => (
                                                <tr key={i}>
                                                    <td className="p-4"><Skeleton width={120} height={20} /></td>
                                                    <td className="p-4"><Skeleton width="60%" height={20} /></td>
                                                    <td className="p-4"><Skeleton width={60} height={24} /></td>
                                                    <td className="p-4"><Skeleton width={40} height={20} className="ml-auto" /></td>
                                                </tr>
                                            ))
                                        ) : holidays.length > 0 ? (
                                            holidays.map(h => (
                                                <tr key={h.id}>
                                                    <td className="font-medium text-slate-700 dark:text-slate-300">{new Date(h.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</td>
                                                    <td className="font-bold text-slate-900 dark:text-white">{h.name}</td>
                                                    <td><span className={`px-2 py-0.5 rounded text-xs font-bold ${h.type === 'Public' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>{h.type}</span></td>
                                                    <td className="text-right"><button onClick={() => handleDeleteHoliday(h.id)} className="text-red-500 hover:text-red-700 font-medium text-xs">Delete</button></td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="p-0">
                                                    <EmptyState title="No Holidays" description="Add holidays to the calendar." icon="holidays" className="py-12" />
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'shifts' && (
                    <div className="animation-fade-in">
                        <ShiftConfig embedded />
                    </div>
                )}

                {activeTab === 'salary' && (
                    <div className="animation-fade-in">
                        <SalaryConfig embedded />
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="glass-panel p-6 md:p-8 animate-fade-in max-w-2xl">
                        <div className="flex items-start gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
                                <Icon name="profile" size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Security Settings</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Manage your password and account security</p>
                            </div>
                        </div>
                        <form onSubmit={handleChangePass} className="space-y-6">
                            <div><label htmlFor="currentPass" className="form-label">Current Password</label><input id="currentPass" type="password" className="input-field" value={pass.current} onChange={e => setPass({ ...pass, current: e.target.value })} required /></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label htmlFor="newPass" className="form-label">New Password</label><input id="newPass" type="password" className="input-field" value={pass.new} onChange={e => setPass({ ...pass, new: e.target.value })} required /></div>
                                <div><label htmlFor="confirmPass" className="form-label">Confirm Password</label><input id="confirmPass" type="password" className="input-field" value={pass.confirm} onChange={e => setPass({ ...pass, confirm: e.target.value })} required /></div>
                            </div>
                            <div className="pt-2">
                                <button type="submit" className="btn btn-primary px-8 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all w-full md:w-auto">Update Password</button>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'danger' && (
                    <div className="bg-white dark:bg-slate-900/50 p-8 md:p-12 rounded-[32px] border-2 border-red-100 dark:border-red-900/30 animate-fade-in text-center max-w-lg mx-auto relative overflow-hidden group">
                        <div className="absolute inset-0 bg-red-50/50 dark:bg-red-900/10 pointer-events-none group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-colors"></div>
                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-3xl flex items-center justify-center shadow-inner mx-auto mb-6 transform group-hover:scale-110 transition-transform duration-300">
                                <Icon name="logout" size={32} />
                            </div>
                            <h2 className="text-2xl font-black mb-3 text-slate-900 dark:text-white">Sign Out</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">You are about to end your current session. Please ensure all your changes are saved before proceeding.</p>
                            <Button variant="danger" onClick={handleLogoutConfirm} className="w-full h-12 text-base font-bold shadow-lg shadow-red-500/20 hover:shadow-red-500/30">
                                Confirm Sign Out
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                type={confirmState.type}
            />
        </div>
    );
};

export default Settings;
