import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';

interface BreakRecord {
    id: string;
    startTime: string;
    endTime?: string;
    duration?: number;
}

interface AttendanceRecord {
    id: string;
    date: string;
    checkIn: string;
    checkOut?: string;
    hours?: number;
    status: string;
    breaks: BreakRecord[];
    user?: {
        id: string;
        email: string;
        role: string;
        employeeId?: string;
        profile?: {
            firstName: string;
            lastName: string;
            designation?: string;
            department?: string;
        };
    };
}

const Attendance: React.FC = () => {
    const { user } = useAuth();
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    // const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [clockedInToday, setClockedInToday] = useState<AttendanceRecord | null>(null);

    const canViewAll = user?.role === 'ADMIN' || user?.role === 'HR';
    const isSuperAdmin = user?.role === 'ADMIN';

    useEffect(() => {
        fetchHistory();
    }, [user]);

    const fetchHistory = async () => {
        if (!user) return;
        try {
            const endpoint = canViewAll ? '/attendance/all' : '/attendance/my-history';
            const data = await api.get<AttendanceRecord[]>(endpoint);
            setHistory(data);

            // Check if clocked in today (for non-admins)
            if (!isSuperAdmin) {
                const today = new Date().toISOString().split('T')[0];
                const todayRecord = data.find(r => r.date.startsWith(today));
                setClockedInToday(todayRecord || null);
            }
        } catch (error) {
            console.error(error);
        } finally {
            // setLoading(false);
        }
    };

    const handleClockIn = async () => {
        setMessage('');
        try {
            await api.post('/attendance/punch-in', { location: 'Office' });
            setMessage('Clocked In successfully!');
            fetchHistory();
        } catch (error: any) {
            setMessage(error.message || 'Clock In failed');
        }
    };

    const handleClockOut = async () => {
        setMessage('');
        try {
            await api.post('/attendance/punch-out', {});
            setClockedInToday(null);
            setMessage('Clocked Out successfully!');
            fetchHistory();
        } catch (error: any) {
            setMessage(error.message || 'Clock Out failed');
        }
    };

    const handleStartBreak = async () => {
        try {
            await api.post('/attendance/break/start', {});
            setMessage('Break started');
            fetchHistory();
        } catch (error: any) {
            setMessage(error.message || 'Failed to start break');
        }
    };

    const handleEndBreak = async () => {
        try {
            await api.post('/attendance/break/end', {});
            setMessage('Back from break');
            fetchHistory();
        } catch (error: any) {
            setMessage(error.message || 'Failed to end break');
        }
    };

    const onBreak = clockedInToday?.breaks?.some(b => !b.endTime);

    return (
        <div className="page-container">
            <div className="dashboard-grid-premium mb-10">
                {/* Punch In/Out Card */}
                {!isSuperAdmin && (
                    <div className="dashboard-section animate-fade-in">
                        <div className="section-header-premium">
                            <div className={`section-icon-badge glassy-icon-base ${onBreak ? 'glassy-orange' : 'glassy-green'}`}>
                                <Icon name="schedule" size={24} />
                            </div>
                            <div className="flex-1">
                                <h2 className="section-title-premium">Today's Shift</h2>
                                <p className="section-subtitle-premium">
                                    {clockedInToday
                                        ? `Punched in at ${new Date(clockedInToday.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                        : 'You haven\'t punched in yet'}
                                </p>
                            </div>
                            {clockedInToday && (
                                <div className="flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${onBreak ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        {onBreak ? 'On Break' : 'Working'}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-4 mt-6">
                            {!clockedInToday ? (
                                <button onClick={handleClockIn} className="btn-primary py-4 text-lg font-bold shadow-lg shadow-emerald-200 bg-emerald-600 hover:bg-emerald-700">
                                    Clock In Now
                                </button>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    {!onBreak ? (
                                        <button onClick={handleStartBreak} className="btn-secondary gap-2">
                                            <Icon name="pause" size={16} /> Take Break
                                        </button>
                                    ) : (
                                        <button onClick={handleEndBreak} className="btn-primary gap-2 bg-amber-500 hover:bg-amber-600">
                                            <Icon name="play" size={16} /> Resume
                                        </button>
                                    )}
                                    <button
                                        onClick={handleClockOut}
                                        className="btn-primary bg-slate-900 hover:bg-black"
                                        disabled={onBreak}
                                    >
                                        Clock Out
                                    </button>
                                </div>
                            )}
                            {message && (
                                <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold text-center animate-fade-in">
                                    {message}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Profile Summary Card */}
                {user && !isSuperAdmin && (
                    <div className="dashboard-section animate-fade-in delay-100">
                        <div className="section-header-premium">
                            <div className="section-icon-badge glassy-icon-base glassy-blue">
                                <Icon name="profile" size={24} />
                            </div>
                            <div className="flex-1">
                                <h2 className="section-title-premium">{user.profile?.firstName} {user.profile?.lastName}</h2>
                                <p className="section-subtitle-premium">{user.profile?.designation || user.role}</p>
                            </div>
                            <div className="status-badge">#{user.employeeId || 'NA'}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Department</div>
                                <div className="font-bold text-slate-800">{user.profile?.department || 'General'}</div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</div>
                                <div className="font-bold text-emerald-600 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Active
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="table-container-premium animate-fade-in delay-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                    <h3 className="font-bold text-slate-800 m-0">Attendance History</h3>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Showing Last 30 Days</div>
                </div>

                <div className="overflow-x-auto">
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Date</th>
                                {canViewAll && <th>Employee</th>}
                                <th>Clock In</th>
                                <th>Clock Out</th>
                                <th>Breaks</th>
                                <th>Work Hours</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length > 0 ? history.map(record => (
                                <tr key={record.id}>
                                    <td className="font-bold text-slate-700">
                                        {new Date(record.date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    {canViewAll && (
                                        <td>
                                            <div className="font-bold text-xs">{record.user?.profile?.firstName}</div>
                                            <div className="text-[10px] text-slate-400">{record.user?.employeeId}</div>
                                        </td>
                                    )}
                                    <td className="font-mono text-sm">
                                        {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </td>
                                    <td className="font-mono text-sm">
                                        {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </td>
                                    <td>
                                        <div className="flex gap-1 flex-wrap">
                                            {record.breaks?.length > 0 ? record.breaks.map((b, i) => (
                                                <span key={i} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500" title={`Duration: ${b.duration?.toFixed(0)}m`}>
                                                    B{i + 1}
                                                </span>
                                            )) : <span className="text-slate-300">-</span>}
                                        </div>
                                    </td>
                                    <td className="font-bold text-[var(--primary)]">
                                        {record.hours ? `${record.hours.toFixed(2)}h` : '-'}
                                    </td>
                                    <td>
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${record.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' :
                                            record.status === 'ABSENT' ? 'bg-red-100 text-red-700' :
                                                record.status === 'LEAVE' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-amber-100 text-amber-700'
                                            }`}>
                                            {record.status}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-400">
                                        No attendance records found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Attendance;
