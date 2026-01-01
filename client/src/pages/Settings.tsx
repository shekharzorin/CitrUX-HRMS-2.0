import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import ShiftConfig from './ShiftConfig';
import SalaryConfig from './SalaryConfig';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';
import { Button } from '../components/ui/Button';

const Settings: React.FC = () => {
    const { logout } = useAuth(); // Token unused by api service but kept for confirm modal/logic

    // Security State
    const [pass, setPass] = useState({ current: '', new: '', confirm: '' });

    // General Settings State
    const [companyName, setCompanyName] = useState(localStorage.getItem('company_name') || '');
    const [companyLogo, setCompanyLogo] = useState(localStorage.getItem('company_logo') || '');

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

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        if (activeTab === 'roles') fetchRoles();
        if (activeTab === 'leaves') fetchLeaveTypes();
        if (activeTab === 'holidays') fetchHolidays();
    }, [activeTab]);

    const fetchSettings = async () => {
        try {
            const data = await api.get<any>('/settings');
            if (data) {
                if (data['company_name']) setCompanyName(data['company_name']);
                if (data['company_logo']) setCompanyLogo(data['company_logo']);
                setEmpSettings({
                    autoGenerate: data['EMP_ID_AUTO_GENERATE'] === 'true',
                    prefix: data['EMP_ID_PREFIX'] || 'EMP-',
                    sequence: data['EMP_ID_SEQUENCE'] || '1',
                    padding: data['EMP_ID_PADDING'] || '4'
                });
            }
        } catch (error) { console.error("Failed to fetch settings:", error); }
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
            const settingsToSave = { 'company_name': companyName, 'company_logo': companyLogo };
            await api.post('/settings', { settings: settingsToSave });
            localStorage.setItem('company_name', companyName);
            localStorage.setItem('company_logo', companyLogo);
            window.dispatchEvent(new Event('storage'));
            alert('General settings updated successfully!');
        } catch (error) { console.error(error); }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
                const image = new Image();
                image.onload = () => {
                    if (image.width > 500 || image.height > 500) {
                        alert(`Image dimensions (${image.width}x${image.height}px) exceed the maximum allowed size of 500x500px.`);
                        e.target.value = ''; return;
                    }
                    if (readerEvent.target?.result) setCompanyLogo(readerEvent.target.result as string);
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
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Settings</h1>

            <div className="flex gap-2 mb-8 border-b border-slate-200 overflow-x-auto no-scrollbar">
                {[
                    { id: 'general', label: 'General', icon: 'settings' },
                    { id: 'roles', label: 'Job Roles', icon: 'roles' },
                    { id: 'leaves', label: 'Leave Policies', icon: 'leaves' },
                    { id: 'holidays', label: 'Holidays', icon: 'holidays' },
                    { id: 'shifts', label: 'Shifts', icon: 'shifts' },
                    { id: 'salary', label: 'Salary', icon: 'payroll' },
                    { id: 'security', label: 'Security', icon: 'profile' },
                    { id: 'danger', label: 'Sign Out', icon: 'logout' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-3 px-4 font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id
                            ? 'border-[var(--primary)] text-[var(--primary)]'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                            } ${tab.id === 'danger' && activeTab !== 'danger' ? 'hover:text-red-500' : ''}`}
                    >
                        <Icon name={tab.icon as any} size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="max-w-4xl">
                {activeTab === 'general' && (
                    <div className="space-y-6 animation-fade-in">
                        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center shadow-inner">
                                    <Icon name="settings" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Organization Profile</h2>
                                    <p className="text-sm text-slate-500 font-medium">Manage your company branding</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label htmlFor="companyName" className="label font-bold text-xs uppercase tracking-wider text-slate-400 mb-2 block">Company Name</label>
                                        <input id="companyName" type="text" className="input-field" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                                    </div>
                                    <Button onClick={handleUpdateGeneral} className="px-8">Save Changes</Button>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="companyLogo" className="label">Company Logo</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 relative group">
                                            {companyLogo ? <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-2" /> : <span className="text-xs text-slate-400">No Logo</span>}
                                            <input id="companyLogo" type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" title="Upload Company Logo" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                                    <Icon name="onboarding" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Employee IDs</h2>
                                    <p className="text-sm text-slate-500 font-medium">Auto-generation settings</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <input id="autoGenerate" type="checkbox" checked={empSettings.autoGenerate} onChange={e => setEmpSettings({ ...empSettings, autoGenerate: e.target.checked })} className="w-5 h-5 rounded accent-[var(--primary)]" />
                                <label htmlFor="autoGenerate" className="font-bold text-slate-700 cursor-pointer">Enable Auto-Generation</label>
                            </div>
                            {empSettings.autoGenerate && (
                                <div className="grid grid-cols-3 gap-6 mb-8">
                                    <div><label htmlFor="prefix" className="label font-bold text-[10px] uppercase text-slate-400 mb-2 block">Prefix</label><input id="prefix" className="input-field" value={empSettings.prefix} onChange={e => setEmpSettings({ ...empSettings, prefix: e.target.value })} /></div>
                                    <div><label htmlFor="sequence" className="label font-bold text-[10px] uppercase text-slate-400 mb-2 block">Sequence</label><input id="sequence" type="number" className="input-field" value={empSettings.sequence} onChange={e => setEmpSettings({ ...empSettings, sequence: e.target.value })} /></div>
                                    <div><label htmlFor="padding" className="label font-bold text-[10px] uppercase text-slate-400 mb-2 block">Padding</label><input id="padding" type="number" className="input-field" value={empSettings.padding} onChange={e => setEmpSettings({ ...empSettings, padding: e.target.value })} /></div>
                                </div>
                            )}
                            <Button onClick={saveEmpSettings} className="px-8">Save Configuration</Button>
                        </div>
                    </div>
                )}

                {activeTab === 'roles' && (
                    <div className="space-y-6 animation-fade-in">
                        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                            <h2 className="text-xl font-bold mb-6">Create Job Role</h2>
                            <form onSubmit={handleCreateRole} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label htmlFor="roleTitle" className="label font-bold text-[10px] uppercase text-slate-400 mb-2 block">Title</label><input id="roleTitle" className="input-field" required value={newRole.title} onChange={e => setNewRole({ ...newRole, title: e.target.value })} /></div>
                                <div><label htmlFor="roleDept" className="label font-bold text-[10px] uppercase text-slate-400 mb-2 block">Department</label><input id="roleDept" className="input-field" value={newRole.department} onChange={e => setNewRole({ ...newRole, department: e.target.value })} /></div>
                                <div><label htmlFor="roleLevel" className="label font-bold text-[10px] uppercase text-slate-400 mb-2 block">Level</label><input id="roleLevel" type="number" className="input-field" value={newRole.level} onChange={e => setNewRole({ ...newRole, level: Number(e.target.value) })} /></div>
                                <div><label htmlFor="roleDesc" className="label font-bold text-[10px] uppercase text-slate-400 mb-2 block">Description</label><input id="roleDesc" className="input-field" value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} /></div>
                                <div className="md:col-span-2"><Button type="submit" className="px-8">Add Role</Button></div>
                            </form>
                        </div>
                        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
                            <table className="table-premium w-full text-left text-sm min-w-[600px]">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="p-4">Title</th>
                                        <th className="p-4">Dept</th>
                                        <th className="p-4">Level</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {roles.map(r => (
                                        <tr key={r.id}>
                                            <td className="p-4 font-bold text-slate-700">{r.title}</td>
                                            <td className="p-4">{r.department}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold">LVL {r.level}</span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => handleDeleteRole(r.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors" title="Delete Role">
                                                    <Icon name="delete" size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'leaves' && (
                    <div className="space-y-6 animation-fade-in">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold mb-4">Leave Types Configuration</h2>
                            <form onSubmit={handleCreateLeave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label htmlFor="leaveName" className="label">Name</label><input id="leaveName" className="input-field" placeholder="e.g. Sick Leave" required value={newLeave.name} onChange={e => setNewLeave({ ...newLeave, name: e.target.value })} /></div>
                                <div><label htmlFor="leaveCode" className="label">Code</label><input id="leaveCode" className="input-field" placeholder="e.g. SL" required value={newLeave.code} onChange={e => setNewLeave({ ...newLeave, code: e.target.value.toUpperCase() })} /></div>
                                <div><label htmlFor="leaveDays" className="label">Days Per Year</label><input id="leaveDays" type="number" className="input-field" required value={newLeave.daysPerYear} onChange={e => setNewLeave({ ...newLeave, daysPerYear: Number(e.target.value) })} /></div>
                                <div className="flex items-center mt-6">
                                    <input type="checkbox" id="carry" className="mr-2 w-4 h-4" checked={newLeave.carryForward} onChange={e => setNewLeave({ ...newLeave, carryForward: e.target.checked })} />
                                    <label htmlFor="carry" className="text-slate-700 font-medium">Allow Carry Forward</label>
                                </div>
                                <div className="md:col-span-2"><button type="submit" className="btn-primary">Create Leave Type</button></div>
                            </form>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[600px]">
                                <thead className="bg-slate-50 border-b"><tr><th className="p-4">Name</th><th className="p-4">Code</th><th className="p-4">Days/Year</th><th className="p-4">Carry Forward</th><th className="p-4"></th></tr></thead>
                                <tbody className="divide-y">
                                    {leaves.map(l => (
                                        <tr key={l.id}>
                                            <td className="p-4 font-medium">{l.name}</td>
                                            <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">{l.code}</span></td>
                                            <td className="p-4">{l.daysPerYear} days</td>
                                            <td className="p-4">{l.carryForward ? '✅ Yes' : 'No'}</td>
                                            <td className="p-4 text-right"><button onClick={() => handleDeleteLeave(l.id)} className="text-red-500 hover:text-red-700">Delete</button></td>
                                        </tr>
                                    ))}
                                    {leaves.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No leave types defined.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'holidays' && (
                    <div className="space-y-6 animation-fade-in">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold mb-4">Add Holiday</h2>
                            <form onSubmit={handleCreateHoliday} className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 w-full"><label htmlFor="holidayName" className="label">Holiday Name</label><input id="holidayName" className="input-field" required value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} /></div>
                                <div className="w-full md:w-48"><label htmlFor="holidayDate" className="label">Date</label><input id="holidayDate" type="date" className="input-field" required value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} /></div>
                                <div className="w-full md:w-40"><label htmlFor="holidayType" className="label">Type</label>
                                    <select id="holidayType" className="input-field" value={newHoliday.type} onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value })} title="Holiday Type">
                                        <option>Public</option><option>Optional</option><option>Observance</option>
                                    </select>
                                </div>
                                <button type="submit" className="btn-primary w-full md:w-auto">Add</button>
                            </form>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[500px]">
                                <thead className="bg-slate-50 border-b"><tr><th className="p-4">Date</th><th className="p-4">Holiday</th><th className="p-4">Type</th><th className="p-4"></th></tr></thead>
                                <tbody className="divide-y">
                                    {holidays.map(h => (
                                        <tr key={h.id}>
                                            <td className="p-4 font-medium text-slate-700">{new Date(h.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</td>
                                            <td className="p-4 font-bold">{h.name}</td>
                                            <td className="p-4"><span className={`px-2 py-0.5 rounded text-xs font-bold ${h.type === 'Public' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{h.type}</span></td>
                                            <td className="p-4 text-right"><button onClick={() => handleDeleteHoliday(h.id)} className="text-red-500 hover:text-red-700">Delete</button></td>
                                        </tr>
                                    ))}
                                    {holidays.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-500">No holidays added yet.</td></tr>}
                                </tbody>
                            </table>
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
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animation-fade-in">
                        <h2 className="text-lg font-bold mb-6 text-slate-700">Change Password</h2>
                        <form onSubmit={handleChangePass} className="space-y-4 max-w-md">
                            <div><label htmlFor="currentPass" className="label">Current Password</label><input id="currentPass" type="password" className="input-field" value={pass.current} onChange={e => setPass({ ...pass, current: e.target.value })} required /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label htmlFor="newPass" className="label">New Password</label><input id="newPass" type="password" className="input-field" value={pass.new} onChange={e => setPass({ ...pass, new: e.target.value })} required /></div>
                                <div><label htmlFor="confirmPass" className="label">Confirm</label><input id="confirmPass" type="password" className="input-field" value={pass.confirm} onChange={e => setPass({ ...pass, confirm: e.target.value })} required /></div>
                            </div>
                            <button type="submit" className="btn-primary mt-2">Update Password</button>
                        </form>
                    </div>
                )}

                {activeTab === 'danger' && (
                    <div className="bg-red-50 p-10 rounded-[40px] border border-red-100 animation-fade-in text-center max-w-lg mx-auto">
                        <div className="w-20 h-20 bg-white text-red-500 rounded-full flex items-center justify-center shadow-lg mx-auto mb-6">
                            <Icon name="logout" size={32} />
                        </div>
                        <h2 className="text-2xl font-black mb-4 text-red-700">Danger Zone</h2>
                        <p className="text-red-600 mb-8 font-medium">Be careful. Signing out will end your current session. Make sure all your progress is saved.</p>
                        <Button variant="danger" onClick={handleLogoutConfirm} className="w-full h-14 text-lg shadow-xl shadow-red-200">
                            Sign Out Now
                        </Button>
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
