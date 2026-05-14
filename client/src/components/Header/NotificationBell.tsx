import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
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
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [recent, setRecent] = useState<Notification[]>([]);
    const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD'>('ALL');

    const bellRef = useRef<HTMLDivElement>(null);

    const fetchCount = useCallback(async () => {
        try {
            const data = await api.get<{ count: number }>('/notifications/unread-count');
            if (data) setUnreadCount(data.count);
        } catch { /* ignore */ }
    }, []);

    const fetchNotifications = useCallback(async () => {
        try {
            const data = await api.get<Notification[]>('/notifications');
            if (data) setRecent(data);
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        if (!user) return;
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [user, fetchCount]);

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
            await fetchNotifications();
        }
        setIsOpen(!isOpen);
    };

    const markAsRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`, {});
            setRecent(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) { console.error(e); }
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all', {});
            setRecent(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (e) { console.error(e); }
    };

    // Helper to group notifications
    const groupNotifications = (items: Notification[]) => {
        const filtered = activeTab === 'UNREAD' ? items.filter(n => !n.read) : items;
        const today: Notification[] = [];
        const yesterday: Notification[] = [];
        const earlier: Notification[] = [];

        const now = new Date();
        const yesterdayDate = new Date();
        yesterdayDate.setDate(now.getDate() - 1);

        filtered.forEach(n => {
            const date = new Date(n.createdAt);
            if (date.toDateString() === now.toDateString()) today.push(n);
            else if (date.toDateString() === yesterdayDate.toDateString()) yesterday.push(n);
            else earlier.push(n);
        });

        return { today, yesterday, earlier };
    };

    const getNotificationIcon = (type?: string) => {
        switch (type) {
            case 'TASK': return { name: 'approvals' as const, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' };
            case 'LEAVE': return { name: 'event' as const, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-500/10' };
            case 'EXPENSE': return { name: 'expenses' as const, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' };
            case 'SYSTEM': return { name: 'settings' as const, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' };
            default: return { name: 'notifications' as const, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]/5 dark:bg-[var(--primary)]/10' };
        }
    };

    const groups = groupNotifications(recent);

    return (
        <div className="notification-bell-container" ref={bellRef}>
            <button
                onClick={toggleDropdown}
                className="header-icon-button relative group"
                title="Notifications"
            >
                <Icon name="notifications" size={22} className="group-hover:text-[var(--primary)] transition-colors" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--primary)] text-[9px] font-bold text-white border-[1.5px] border-white dark:border-slate-900 shadow-sm pointer-events-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown border-[var(--primary)]/10">
                    {/* Header with Tabs */}
                    <div className="dropdown-header flex flex-col p-0">
                        <div className="flex items-center justify-between px-4 py-4 bg-[var(--bg-surface)]">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="sm:hidden p-1 -ml-1 text-slate-500"
                                    title="Close Notifications"
                                >
                                    <Icon name="chevron_left" size={20} />
                                </button>
                                <h3 className="font-black text-lg text-slate-900 dark:text-white tracking-tight">Notifications</h3>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={markAllAsRead} className="p-2 text-slate-400 hover:text-[var(--primary)] transition-all hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg" title="Mark all as read">
                                    <Icon name="check_circle" size={18} />
                                </button>
                                <button 
                                    className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg"
                                    title="Notification Settings"
                                >
                                    <Icon name="settings" size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="flex px-2 bg-[var(--bg-surface)]">
                            <button 
                                onClick={() => setActiveTab('ALL')}
                                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'ALL' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                All
                            </button>
                            <button 
                                onClick={() => setActiveTab('UNREAD')}
                                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'UNREAD' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                Unread {unreadCount > 0 && (
                                    <span className="ml-1 bg-[var(--primary)] text-white px-1.5 py-0.5 rounded-full text-[9px]">{unreadCount}</span>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="notification-list custom-scrollbar bg-[var(--bg-surface)]">
                        {recent.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-200">
                                    <Icon name="notifications" size={32} />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900 dark:text-white">All caught up!</p>
                                    <p className="text-xs text-slate-400 mt-1">No new notifications for you.</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {['today', 'yesterday', 'earlier'].map((key) => {
                                    const items = groups[key as keyof typeof groups];
                                    if (items.length === 0) return null;
                                    return (
                                        <div key={key}>
                                            <div className="px-4 py-2 bg-slate-50/50 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]/30"></div>
                                                {key}
                                            </div>
                                            {items.map(n => {
                                                const icon = getNotificationIcon(n.type);
                                                return (
                                                    <div
                                                        key={n.id}
                                                        onClick={() => {
                                                            if (!n.read) markAsRead(n.id);
                                                            setIsOpen(false);
                                                        }}
                                                        className={`group p-4 border-b border-slate-50 dark:border-white/5 last:border-0 transition-all hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer relative ${!n.read ? 'bg-indigo-50/30 dark:bg-indigo-500/5' : ''}`}
                                                    >
                                                        {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--primary)]" />}
                                                        
                                                        <div className="flex gap-3">
                                                            <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${icon.bg} ${icon.color}`}>
                                                                <Icon name={icon.name} size={20} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start gap-2 mb-0.5">
                                                                    <p className={`text-sm leading-tight ${!n.read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-400'}`}>
                                                                        {n.message}
                                                                    </p>
                                                                    <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                                                                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-wider">
                                                                        {n.type || 'Activity'}
                                                                    </span>
                                                                    {n.link && (
                                                                        <Link to={n.link} className="text-[10px] font-black text-indigo-500 hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            View Details
                                                                        </Link>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                    
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-white/5">
                        <Link 
                            to="/notifications" 
                            onClick={() => setIsOpen(false)}
                            className="text-xs font-black text-slate-500 hover:text-[var(--primary)] transition-colors flex items-center justify-center gap-2"
                        >
                            View all incoming activity
                            <Icon name="chevron_right" size={14} />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};
