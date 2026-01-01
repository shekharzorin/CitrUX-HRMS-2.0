import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Notifications: React.FC = () => {
    const { token, user } = useAuth();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

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

    const sendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        setSending(true);
        try {
            const res = await fetch('http://localhost:5000/api/notifications/broadcast', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message })
            });
            if (res.ok) {
                alert('Announcement sent successfully!');
                setMessage('');
                fetchNotes(); // Refresh list to see it
            } else {
                alert('Failed to send announcement');
            }
        } catch (error) {
            console.error(error);
            alert('Error sending announcement');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Notifications</h1>

            {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                <div className="mb-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm">
                    <h2 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
                        📢 Send Announcement
                    </h2>
                    <form onSubmit={sendBroadcast} className="flex gap-2">
                        <input
                            type="text"
                            className="input-field flex-1 bg-white"
                            placeholder="Type a message to broadcast to all employees..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            disabled={sending}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {sending ? 'Sending...' : 'Broadcast'}
                        </button>
                    </form>
                </div>
            )}

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
