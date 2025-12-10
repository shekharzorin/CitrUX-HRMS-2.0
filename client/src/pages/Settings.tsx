import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Settings: React.FC = () => {
    const { token, logout } = useAuth();
    const [pass, setPass] = useState({ current: '', new: '', confirm: '' });

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

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Account Settings</h1>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-xl">
                <h2 className="text-lg font-bold mb-4 text-red-600">Security</h2>
                <form onSubmit={handleChangePass} className="space-y-4">
                    <div>
                        <label className="label">Current Password</label>
                        <input type="password" className="input-field" value={pass.current} onChange={e => setPass({ ...pass, current: e.target.value })} required />
                    </div>
                    <div>
                        <label className="label">New Password</label>
                        <input type="password" className="input-field" value={pass.new} onChange={e => setPass({ ...pass, new: e.target.value })} required />
                    </div>
                    <div>
                        <label className="label">Confirm New Password</label>
                        <input type="password" className="input-field" value={pass.confirm} onChange={e => setPass({ ...pass, confirm: e.target.value })} required />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-bold w-full">Change Password</button>
                </form>
            </div>

            <div className="mt-8">
                <button onClick={logout} className="px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-bold">
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default Settings;
