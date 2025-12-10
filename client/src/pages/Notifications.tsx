import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Notifications: React.FC = () => {
    const { token } = useAuth();
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setNotifications(await res.json());
        } catch (error) { console.error(error); }
    };

    const markRead = async (id: string) => {
        try {
            const res = await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) fetchNotes();
        } catch (error) { console.error(error); }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Notifications</h1>

            <div className="space-y-4">
                {notifications.length === 0 && (
                    <div className="text-center p-8 bg-slate-50 rounded-xl text-slate-500">
                        No notifications yet.
                    </div>
                )}
                {notifications.map(n => (
                    <div key={n.id} className={`p-4 rounded-xl shadow-sm border ${n.read ? 'bg-white border-slate-200 opacity-60' : 'bg-blue-50 border-blue-200'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className={`text-slate-800 ${n.read ? '' : 'font-bold'}`}>{n.message}</p>
                                <div className="text-xs text-slate-400 mt-2">{new Date(n.createdAt).toLocaleString()}</div>
                            </div>
                            {!n.read && (
                                <button onClick={() => markRead(n.id)} className="text-xs text-blue-600 hover:text-blue-800 font-bold">
                                    Mark Read
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Notifications;
