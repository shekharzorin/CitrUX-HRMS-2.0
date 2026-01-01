import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../ui/Icons';

export const NotificationBell = () => {
    const { token } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [recent, setRecent] = useState<any[]>([]);

    const bellRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!token) return;
        fetchCount();
        const interval = setInterval(fetchCount, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [token]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchCount = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/notifications/unread-count', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.count);
            }
        } catch (e) {
            // console.error(e); 
        }
    };

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
                className="header-icon-button"
                title="Notifications"
            >
                <Icon name="notifications" size={22} />
                {unreadCount > 0 && (
                    <span className="notification-badge">
                        {unreadCount > 9 ? '9+' : unreadCount}
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
                                    onClick={() => !n.read && markAsRead(n.id)}
                                    className={`notification-item ${!n.read ? 'notification-item-unread' : ''}`}
                                >
                                    <p className="notification-message">{n.message}</p>
                                    <span className="notification-time">{new Date(n.createdAt).toLocaleString()}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
