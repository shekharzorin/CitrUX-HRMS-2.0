import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const Settings: React.FC = () => {
    const { token, logout } = useAuth();

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
    const [activeTab, setActiveTab] = useState<'general' | 'roles' | 'leaves' | 'holidays' | 'security' | 'danger'>('general');

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
            const res = await fetch('http://localhost:5000/api/settings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
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
            const res = await fetch('http://localhost:5000/api/job-roles', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setRoles(await res.json());
        } catch (error) { console.error(error); }
    };

    const fetchLeaveTypes = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/leaves/types', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setLeaves(await res.json());
        } catch (error) { console.error(error); }
    };

    const fetchHolidays = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/holidays', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setHolidays(await res.json());
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
            const res = await fetch('http://localhost:5000/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ settings: settingsToSave })
            });
            if (res.ok) alert('Employee ID Settings Saved!');
        } catch (error) { console.error(error); }
    };

    const handleChangePass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pass.new !== pass.confirm) return alert('New passwords do not match');
        try {
            const res = await fetch('http://localhost:5000/api/profile/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ currentPassword: pass.current, newPassword: pass.new })
            });
            const data = await res.json();
            if (res.ok) {
                alert('Password Updated');
                setPass({ current: '', new: '', confirm: '' });
            } else {
                alert(data.message);
            }
        } catch (error) { console.error(error); }
    };

    const handleUpdateGeneral = async () => {
        try {
            const settingsToSave = { 'company_name': companyName, 'company_logo': companyLogo };
            const res = await fetch('http://localhost:5000/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ settings: settingsToSave })
            });
            if (res.ok) {
                localStorage.setItem('company_name', companyName);
                localStorage.setItem('company_logo', companyLogo);
                window.dispatchEvent(new Event('storage'));
                alert('General settings updated successfully!');
            }
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
            const res = await fetch('http://localhost:5000/api/job-roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(newRole)
            });
            if (res.ok) {
                setNewRole({ title: '', department: '', level: 0, description: '' });
                fetchRoles();
            }
        } catch (error) { console.error(error); }
    };

    const handleDeleteRole = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Delete Role',
            message: 'Are you sure you want to delete this job role?',
            type: 'danger',
            onConfirm: async () => {
                await fetch(`http://localhost:5000/api/job-roles/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                fetchRoles();
            }
        });
    };

    const handleCreateLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/leaves/types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(newLeave)
            });
            if (res.ok) {
                setNewLeave({ name: '', code: '', daysPerYear: 12, carryForward: false });
                fetchLeaveTypes();
            }
        } catch (error) { console.error(error); }
    };

    const handleDeleteLeave = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Delete Leave Type',
            message: 'Are you sure? This may affect employee balances.',
            type: 'danger',
            onConfirm: async () => {
                await fetch(`http://localhost:5000/api/leaves/types/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                fetchLeaveTypes();
            }
        });
    };

    const handleCreateHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/holidays', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(newHoliday)
            });
            if (res.ok) {
                setNewHoliday({ name: '', date: '', type: 'Public' });
                fetchHolidays();
            }
        } catch (error) { console.error(error); }
    };

    const handleDeleteHoliday = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Delete Holiday',
            message: 'Remove this holiday from the calendar?',
            type: 'danger',
            onConfirm: async () => {
                await fetch(`http://localhost:5000/api/holidays/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
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

            <div className="flex gap-4 mb-8 border-b border-slate-200 overflow-x-auto">
                {[
                    { id: 'general', label: 'General' },
                    { id: 'roles', label: 'Job Roles' },
                    { id: 'leaves', label: 'Leave Policies' },
                    { id: 'holidays', label: 'Holidays' },
                    { id: 'security', label: 'Security' },
                    { id: 'danger', label: 'Danger Zone' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-3 px-1 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id
                            ? 'border-purple-600 text-purple-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            } ${tab.id === 'danger' ? 'hover:text-red-600' : ''}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="max-w-4xl">
                {activeTab === 'general' && (
                    <div className="space-y-6 animation-fade-in">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-2xl">🏢</span>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">Organization Profile</h2>
                                    <p className="text-sm text-slate-500">Manage your company branding</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">Company Name</label>
                                        <input type="text" className="input-field" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                                    </div>
                                    <button onClick={handleUpdateGeneral} className="btn-primary">Save Changes</button>
                                </div>
                                <div className="space-y-2">
                                    <label className="label">Company Logo</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 relative group">
                                            {companyLogo ? <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-2" /> : <span className="text-xs text-slate-400">No Logo</span>}
                                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-2xl">🆔</span>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">Employee IDs</h2>
                                    <p className="text-sm text-slate-500">Auto-generation settings</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <input type="checkbox" checked={empSettings.autoGenerate} onChange={e => setEmpSettings({ ...empSettings, autoGenerate: e.target.checked })} className="w-5 h-5 rounded" />
                                <span className="font-medium text-slate-800">Enable Auto-Generation</span>
                            </div>
                            {empSettings.autoGenerate && (
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div><label className="label">Prefix</label><input className="input-field" value={empSettings.prefix} onChange={e => setEmpSettings({ ...empSettings, prefix: e.target.value })} /></div>
                                    <div><label className="label">Sequence</label><input type="number" className="input-field" value={empSettings.sequence} onChange={e => setEmpSettings({ ...empSettings, sequence: e.target.value })} /></div>
                                    <div><label className="label">Padding</label><input type="number" className="input-field" value={empSettings.padding} onChange={e => setEmpSettings({ ...empSettings, padding: e.target.value })} /></div>
                                </div>
                            )}
                            <button onClick={saveEmpSettings} className="btn-primary">Save Configuration</button>
                        </div>
                    </div>
                )}

                {activeTab === 'roles' && (
                    <div className="space-y-6 animation-fade-in">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold mb-4">Create Job Role</h2>
                            <form onSubmit={handleCreateRole} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="label">Title</label><input className="input-field" required value={newRole.title} onChange={e => setNewRole({ ...newRole, title: e.target.value })} /></div>
                                <div><label className="label">Department</label><input className="input-field" value={newRole.department} onChange={e => setNewRole({ ...newRole, department: e.target.value })} /></div>
                                <div><label className="label">Level</label><input type="number" className="input-field" value={newRole.level} onChange={e => setNewRole({ ...newRole, level: Number(e.target.value) })} /></div>
                                <div><label className="label">Description</label><input className="input-field" value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} /></div>
                                <div className="md:col-span-2"><button type="submit" className="btn-primary">Add Role</button></div>
                            </form>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left text-sm"><thead className="bg-slate-50 border-b"><tr><th className="p-4">Title</th><th className="p-4">Dept</th><th className="p-4">Level</th><th className="p-4"></th></tr></thead>
                                <tbody className="divide-y">{roles.map(r => <tr key={r.id}><td className="p-4 font-medium">{r.title}</td><td className="p-4">{r.department}</td><td className="p-4">{r.level}</td><td className="p-4 text-right"><button onClick={() => handleDeleteRole(r.id)} className="text-red-500 hover:text-red-700">Delete</button></td></tr>)}</tbody></table>
                        </div>
                    </div>
                )}

                {activeTab === 'leaves' && (
                    <div className="space-y-6 animation-fade-in">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold mb-4">Leave Types Configuration</h2>
                            <form onSubmit={handleCreateLeave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="label">Name</label><input className="input-field" placeholder="e.g. Sick Leave" required value={newLeave.name} onChange={e => setNewLeave({ ...newLeave, name: e.target.value })} /></div>
                                <div><label className="label">Code</label><input className="input-field" placeholder="e.g. SL" required value={newLeave.code} onChange={e => setNewLeave({ ...newLeave, code: e.target.value.toUpperCase() })} /></div>
                                <div><label className="label">Days Per Year</label><input type="number" className="input-field" required value={newLeave.daysPerYear} onChange={e => setNewLeave({ ...newLeave, daysPerYear: Number(e.target.value) })} /></div>
                                <div className="flex items-center mt-6">
                                    <input type="checkbox" id="carry" className="mr-2 w-4 h-4" checked={newLeave.carryForward} onChange={e => setNewLeave({ ...newLeave, carryForward: e.target.checked })} />
                                    <label htmlFor="carry" className="text-slate-700 font-medium">Allow Carry Forward</label>
                                </div>
                                <div className="md:col-span-2"><button type="submit" className="btn-primary">Create Leave Type</button></div>
                            </form>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
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
                                <div className="flex-1 w-full"><label className="label">Holiday Name</label><input className="input-field" required value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} /></div>
                                <div className="w-full md:w-48"><label className="label">Date</label><input type="date" className="input-field" required value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} /></div>
                                <div className="w-full md:w-40"><label className="label">Type</label>
                                    <select className="input-field" value={newHoliday.type} onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value })}>
                                        <option>Public</option><option>Optional</option><option>Observance</option>
                                    </select>
                                </div>
                                <button type="submit" className="btn-primary w-full md:w-auto">Add</button>
                            </form>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
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

                {activeTab === 'security' && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animation-fade-in">
                        <h2 className="text-lg font-bold mb-6 text-slate-700">Change Password</h2>
                        <form onSubmit={handleChangePass} className="space-y-4 max-w-md">
                            <div><label className="label">Current Password</label><input type="password" className="input-field" value={pass.current} onChange={e => setPass({ ...pass, current: e.target.value })} required /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="label">New Password</label><input type="password" className="input-field" value={pass.new} onChange={e => setPass({ ...pass, new: e.target.value })} required /></div>
                                <div><label className="label">Confirm</label><input type="password" className="input-field" value={pass.confirm} onChange={e => setPass({ ...pass, confirm: e.target.value })} required /></div>
                            </div>
                            <button type="submit" className="btn-primary mt-2">Update Password</button>
                        </form>
                    </div>
                )}

                {activeTab === 'danger' && (
                    <div className="bg-red-50 p-6 rounded-xl border border-red-100 animation-fade-in">
                        <h2 className="text-lg font-bold mb-4 text-red-700">Danger Zone</h2>
                        <p className="text-sm text-red-600 mb-6">Once you sign out, you will need to log in again to access your account.</p>
                        <button onClick={handleLogoutConfirm} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-sm">
                            <span>🚪</span> Sign Out
                        </button>
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
