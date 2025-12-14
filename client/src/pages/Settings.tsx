import React, { useState } from 'react';
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
    const [activeTab, setActiveTab] = useState<'general' | 'roles' | 'security' | 'danger'>('general');

    React.useEffect(() => {
        fetchSettings();
    }, []);

    React.useEffect(() => {
        if (activeTab === 'roles') {
            fetchRoles();
        }
    }, [activeTab]);

    const fetchSettings = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/settings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();

                // Load Company Settings
                if (data['company_name']) setCompanyName(data['company_name']);
                if (data['company_logo']) setCompanyLogo(data['company_logo']);

                // Load Employee Settings
                setEmpSettings({
                    autoGenerate: data['EMP_ID_AUTO_GENERATE'] === 'true',
                    prefix: data['EMP_ID_PREFIX'] || 'EMP-',
                    sequence: data['EMP_ID_SEQUENCE'] || '1',
                    padding: data['EMP_ID_PADDING'] || '4'
                });
            }
        } catch (error) {
            console.error("Failed to fetch settings:", error);
        }
    };

    const fetchRoles = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/job-roles', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setRoles(await res.json());
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

            if (res.ok) {
                alert('Employee ID Settings Saved!');
            } else {
                alert('Failed to save settings');
            }
        } catch (error) {
            console.error("Failed to save settings:", error);
        }
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
            const settingsToSave = {
                'company_name': companyName,
                'company_logo': companyLogo
            };

            const res = await fetch('http://localhost:5000/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ settings: settingsToSave })
            });

            if (res.ok) {
                localStorage.setItem('company_name', companyName);
                localStorage.setItem('company_logo', companyLogo);
                window.dispatchEvent(new Event('storage')); // Trigger update across app
                alert('General settings updated successfully!');
            } else {
                alert('Failed to save settings');
            }
        } catch (error) {
            console.error(error);
            alert('Error updating settings');
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
                const image = new Image();
                image.onload = () => {
                    if (image.width > 500 || image.height > 500) {
                        alert(`Image dimensions (${image.width}x${image.height}px) exceed the maximum allowed size of 500x500px. Please upload a smaller logo.`);
                        e.target.value = ''; // Reset file input
                        return;
                    }
                    if (readerEvent.target?.result) {
                        setCompanyLogo(readerEvent.target.result as string);
                    }
                };
                if (readerEvent.target?.result) {
                    image.src = readerEvent.target.result as string;
                }
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
            } else {
                alert('Failed to create role');
            }
        } catch (error) { console.error(error); }
    };

    const handleDeleteRole = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Delete Role',
            message: 'Are you sure you want to delete this job role? This action cannot be undone and may affect employees currently assigned to this role.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    const res = await fetch(`http://localhost:5000/api/job-roles/${id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) fetchRoles();
                } catch (error) { console.error(error); }
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

            {/* Tabs Navigation */}
            <div className="flex gap-4 mb-8 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`pb-3 px-1 font-medium transition-colors border-b-2 ${activeTab === 'general' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    General
                </button>
                <button
                    onClick={() => setActiveTab('roles')}
                    className={`pb-3 px-1 font-medium transition-colors border-b-2 ${activeTab === 'roles' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Job Roles
                </button>
                <button
                    onClick={() => setActiveTab('security')}
                    className={`pb-3 px-1 font-medium transition-colors border-b-2 ${activeTab === 'security' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Security
                </button>
                <button
                    onClick={() => setActiveTab('danger')}
                    className={`pb-3 px-1 font-medium transition-colors border-b-2 ${activeTab === 'danger' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Danger Zone
                </button>
            </div>

            <div className="max-w-4xl">

                {/* General Settings Section */}
                {activeTab === 'general' && (
                    <div className="space-y-6 animation-fade-in">

                        {/* Card 1: Organization Profile */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 text-xl">🏢</div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">Organization Profile</h2>
                                    <p className="text-sm text-slate-500">Manage your company branding and details</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">Company Name</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="e.g. Acme Corp"
                                            value={companyName}
                                            onChange={e => setCompanyName(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={handleUpdateGeneral}
                                        className="btn-primary w-full md:w-auto"
                                    >
                                        Save Changes
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <label className="label">Company Logo</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative group">
                                            {companyLogo ? (
                                                <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <span className="text-slate-400 text-xs text-center px-2">No Logo</span>
                                            )}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white text-xs font-medium">Change</span>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                        </div>
                                        <div className="text-xs text-slate-500 max-w-[200px]">
                                            <p>Recommended: 500x500px.</p>
                                            <p>Supports PNG, JPG.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Employee ID Configuration */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xl">🆔</div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">Employee ID Configuration</h2>
                                    <p className="text-sm text-slate-500">Automate unique ID generation for new employees</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <input
                                    type="checkbox"
                                    id="autoGen"
                                    className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    checked={empSettings.autoGenerate}
                                    onChange={e => setEmpSettings({ ...empSettings, autoGenerate: e.target.checked })}
                                />
                                <div>
                                    <label htmlFor="autoGen" className="font-medium text-slate-800 cursor-pointer">Enable Auto-Generation</label>
                                    <p className="text-sm text-slate-500 mt-0.5">Automatically assign IDs (e.g., EMP-001) when creating users.</p>
                                </div>
                            </div>

                            {empSettings.autoGenerate && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pl-8">
                                    <div>
                                        <label className="label">Prefix</label>
                                        <input
                                            type="text"
                                            className="input-field font-mono"
                                            placeholder="EMP-"
                                            value={empSettings.prefix}
                                            onChange={e => setEmpSettings({ ...empSettings, prefix: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Next Sequence</label>
                                        <input
                                            type="number"
                                            className="input-field font-mono"
                                            value={empSettings.sequence}
                                            onChange={e => setEmpSettings({ ...empSettings, sequence: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Digit Padding</label>
                                        <input
                                            type="number"
                                            className="input-field font-mono"
                                            value={empSettings.padding}
                                            max={10}
                                            onChange={e => setEmpSettings({ ...empSettings, padding: e.target.value })}
                                        />
                                    </div>

                                    <div className="md:col-span-3">
                                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center justify-between">
                                            <span className="text-sm text-blue-700 font-medium">Preview Next ID:</span>
                                            <span className="text-lg font-mono font-bold text-blue-800 bg-white px-3 py-1 rounded shadow-sm">
                                                {empSettings.prefix}{(parseInt(empSettings.sequence) || 1).toString().padStart(parseInt(empSettings.padding) || 4, '0')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 border-t border-slate-100">
                                <button onClick={saveEmpSettings} className="btn-primary bg-blue-600 hover:bg-blue-700">
                                    Save Configuration
                                </button>
                            </div>
                        </div>

                    </div>
                )}

                {/* Roles Settings Section */}
                {activeTab === 'roles' && (
                    <div className="space-y-6 animation-fade-in">
                        {/* New Role Form */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold mb-4 text-slate-700">Create New Job Role</h2>
                            <form onSubmit={handleCreateRole} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Role Title (Designation)</label>
                                    <input type="text" className="input-field" placeholder="e.g. CEO, Senior Developer" required
                                        value={newRole.title} onChange={e => setNewRole({ ...newRole, title: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">Department</label>
                                    <input type="text" className="input-field" placeholder="e.g. Engineering, HR"
                                        value={newRole.department} onChange={e => setNewRole({ ...newRole, department: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">Rank / Level</label>
                                    <input type="number" className="input-field" placeholder="Higher = More Senior"
                                        value={newRole.level} onChange={e => setNewRole({ ...newRole, level: Number(e.target.value) })} />
                                    <p className="text-xs text-slate-500 mt-1">Used for sorting in Org Chart (0 = lowest).</p>
                                </div>
                                <div>
                                    <label className="label">Description</label>
                                    <input type="text" className="input-field" placeholder="Optional description"
                                        value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} />
                                </div>
                                <div className="md:col-span-2 pt-2">
                                    <button type="submit" className="btn-primary">Add Role</button>
                                </div>
                            </form>
                        </div>

                        {/* Roles List */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 font-semibold">Title</th>
                                        <th className="p-4 font-semibold">Department</th>
                                        <th className="p-4 font-semibold">Rank</th>
                                        <th className="p-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {roles.map(role => (
                                        <tr key={role.id} className="hover:bg-slate-50">
                                            <td className="p-4 font-medium text-slate-800">{role.title}</td>
                                            <td className="p-4">{role.department || '-'}</td>
                                            <td className="p-4">{role.level}</td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => handleDeleteRole(role.id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {roles.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-slate-500">No custom roles defined yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Security Settings Section */}
                {activeTab === 'security' && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animation-fade-in">
                        <h2 className="text-lg font-bold mb-6 text-slate-700 flex items-center gap-2">
                            <span className="text-red-500">🔒</span> Security Settings
                        </h2>

                        <form onSubmit={handleChangePass} className="space-y-4 max-w-md">
                            <div>
                                <label className="label">Current Password</label>
                                <input type="password" className="input-field" value={pass.current} onChange={e => setPass({ ...pass, current: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">New Password</label>
                                    <input type="password" className="input-field" value={pass.new} onChange={e => setPass({ ...pass, new: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="label">Confirm New Password</label>
                                    <input type="password" className="input-field" value={pass.confirm} onChange={e => setPass({ ...pass, confirm: e.target.value })} required />
                                </div>
                            </div>

                            <div className="pt-4">
                                <button type="submit" className="px-6 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-semibold shadow-sm transition-all active:scale-95">
                                    Update Password
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Danger Zone / Logout */}
                {activeTab === 'danger' && (
                    <div className="bg-red-50 p-6 rounded-xl border border-red-100 animation-fade-in">
                        <h2 className="text-lg font-bold mb-4 text-red-700 flex items-center gap-2">
                            Danger Zone
                        </h2>
                        <p className="text-sm text-red-600 mb-6">
                            Once you sign out, you will need to log in again to access your account.
                        </p>
                        <button onClick={handleLogoutConfirm} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition-colors shadow-sm">
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
