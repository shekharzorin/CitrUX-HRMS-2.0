import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../ui/Icons';

interface Notification {
    id: string;
    message: string;
    read: boolean;
    createdAt: string;
    link?: string;
    type?: string;
}

export const NotificationBell = () => {
    const { token } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [recent, setRecent] = useState<Notification[]>([]);

    const bellRef = useRef<HTMLDivElement>(null);

    const fetchCount = useCallback(async () => {
        try {
            const res = await fetch('http://localhost:5000/api/notifications/unread-count', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.count);
            }
        } catch {
            // ignore
        }
    }, [token]);

    useEffect(() => {
        if (!token) return;
        const init = async () => { await fetchCount(); };
        init();
        const interval = setInterval(fetchCount, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [token, fetchCount]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = async () => {
        if (!isOpen) {
            // Fetch recent
            try {
                const res = await fetch('http://localhost:5000/api/notifications', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setRecent(data.slice(0, 5)); // Top 5
                }
            } catch (e) { console.error(e); }
        }
        setIsOpen(!isOpen);
    };

    const markAsRead = async (id: string) => {
        try {
            await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update local state deeply
            setRecent(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) { console.error(e); }
    };

    return (
        <div className="notification-bell-container" ref={bellRef}>
            <button
                onClick={toggleDropdown}
                className="header-icon-button relative group"
                title="Notifications"
            >
                <Icon name="notifications" size={22} className="group-hover:text-[var(--primary)] transition-colors" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white border-[1.5px] border-white dark:border-slate-900 shadow-sm pointer-events-none">
                        {unreadCount > 9 ? '' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="dropdown-header">
                        <h3 className="dropdown-title">Notifications</h3>
                        <Link to="/notifications" onClick={() => setIsOpen(false)} className="dropdown-view-all">
                            View All
                        </Link>
                    </div>
                    <div className="notification-list">
                        {recent.length === 0 ? (
                            <div className="notification-empty">No notifications</div>
                        ) : (
                            recent.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => {
                                        if (!n.read) markAsRead(n.id);
                                        setIsOpen(false);
                                    }}
                                    className={`notification-item ${!n.read ? 'notification-item-unread' : ''} cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5`}
                                >
                                    {n.link ? (
                                        <Link to={n.link} className="block">
                                            <div className="flex justify-between items-start gap-2">
                                                <p className="notification-message flex-1">{n.message}</p>
                                                {n.type === 'TASK' && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">ACTION</span>}
                                            </div>
                                            <span className="notification-time">{new Date(n.createdAt).toLocaleString()}</span>
                                        </Link>
                                    ) : (
                                        <>
                                            <p className="notification-message">{n.message}</p>
                                            <span className="notification-time">{new Date(n.createdAt).toLocaleString()}</span>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
