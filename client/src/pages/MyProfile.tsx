import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const MyProfile: React.FC = () => {
    const { token, user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [form, setForm] = useState({ phone: '', address: '', emergencyContact: '' });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/profile', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
                if (data.profile) {
                    setForm({
                        phone: data.profile.phone || '',
                        address: data.profile.address || '',
                        emergencyContact: data.profile.emergencyContact || ''
                    });
                }
            }
        } catch (error) { console.error(error); }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                alert('Profile Updated');
                setIsEditing(false);
                fetchProfile();
            }
        } catch (error) { console.error(error); }
    };

    if (!profile) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-6 max-w-4xl">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">My Profile</h1>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-3xl">
                        👤
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{profile.profile?.firstName} {profile.profile?.lastName}</h2>
                        <div className="text-slate-500">{profile.profile?.designation} • {profile.profile?.department}</div>
                        <div className="text-sm text-slate-400">Joined: {new Date(profile.profile?.joiningDate).toLocaleDateString()}</div>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-700">Contact Details</h3>
                    <button onClick={() => setIsEditing(!isEditing)} className="text-blue-600 font-bold hover:underline">
                        {isEditing ? 'Cancel Edit' : 'Edit Details'}
                    </button>
                </div>

                {isEditing ? (
                    <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="label">Phone Number</label>
                            <input type="text" className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Emergency Contact</label>
                            <input type="text" className="input-field" value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="label">Address</label>
                            <textarea className="input-field" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={3} />
                        </div>
                        <button type="submit" className="btn-primary md:col-span-2">Save Changes</button>
                    </form>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <div className="text-slate-500 mb-1">Email</div>
                            <div className="font-bold">{profile.email}</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <div className="text-slate-500 mb-1">Phone</div>
                            <div className="font-bold">{profile.profile?.phone || 'Not set'}</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <div className="text-slate-500 mb-1">Emergency Contact</div>
                            <div className="font-bold">{profile.profile?.emergencyContact || 'Not set'}</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg md:col-span-2">
                            <div className="text-slate-500 mb-1">Address</div>
                            <div className="font-bold">{profile.profile?.address || 'Not set'}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyProfile;
