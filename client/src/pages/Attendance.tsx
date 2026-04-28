import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';
import { PageHeader } from '../components/ui/PageHeader';

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
    const { showToast } = useToast();
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    const [clockedInToday, setClockedInToday] = useState<AttendanceRecord | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [elapsedTime, setElapsedTime] = useState('00:00:00');
    const [missedPunchRecord, setMissedPunchRecord] = useState<AttendanceRecord | null>(null);

    const canViewAll = user?.role === 'ADMIN' || user?.role === 'HR' || user?.role === 'SUPER_ADMIN';
    const isSuperAdmin = user?.role === 'SUPER_ADMIN'; // Only actual SUPER_ADMIN skips punch-in UI

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        let interval: any;
        if (clockedInToday && clockedInToday.checkIn) {
            interval = setInterval(() => {
                const start = new Date(clockedInToday.checkIn).getTime();
                const now = new Date().getTime();
                const diff = now - start;

                // Subtract break durations if needed, but for now just show elapsed since start
                // or simplistic elapsed time.
                // Improve: subtract closed breaks duration.

                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                setElapsedTime(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                );
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [clockedInToday]);

    // Helper for local YYYY-MM-DD
    const getLocalToday = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const fetchHistory = async () => {
        if (!user) return;
        try {
            const endpoint = canViewAll ? '/attendance/all' : '/attendance/my-history';
            const data = await api.get<AttendanceRecord[]>(endpoint, { silent: true });
            setHistory(data);

            // Check if clocked in today (for non-admins)
            if (!isSuperAdmin) {
                const today = getLocalToday();
                // We compare the date string from backend (YYYY-MM-DD...) with our local today string
                const todayRecord = data.find(r => r.date.startsWith(today));
                setClockedInToday(todayRecord || null);

                // Check for missed punch out using simplified logic
                // Any record that is NOT today's record, and has no Checkout.
                const incompleteRecord = data.find(r => !r.date.startsWith(today) && r.checkIn && !r.checkOut);
                if (incompleteRecord) {
                    setMissedPunchRecord(incompleteRecord);
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [user]);

    const handleClockIn = async () => {
        try {
            const today = getLocalToday();
            await api.post('/attendance/punch-in', { location: 'Office', workDate: today });
            showToast('Clocked in successfully!', 'success');
            fetchHistory();
        } catch (error: any) {
            showToast(error.message || 'Clock In failed', 'error');
        }
    };

    const handleClockOut = async () => {
        try {
            await api.post('/attendance/punch-out', {});
            setClockedInToday(null);
            showToast('Clocked out successfully!', 'success');
            fetchHistory();
        } catch (error: any) {
            showToast(error.message || 'Clock Out failed', 'error');
        }
    };

    const handleStartBreak = async () => {
        try {
            await api.post('/attendance/break/start', {});
            showToast('Break started', 'info');
            fetchHistory();
        } catch (error: any) {
            showToast(error.message || 'Failed to start break', 'error');
        }
    };

    const handleEndBreak = async () => {
        try {
            await api.post('/attendance/break/end', {});
            showToast('Break ended', 'info');
            fetchHistory();
        } catch (error: any) {
            showToast(error.message || 'Failed to end break', 'error');
        }
    };

    const handleFixMissedPunch = (_recordId: string) => {
        // No backend endpoint for auto-fix — open adjustment modal pre-filled
        if (!missedPunchRecord) return;
        setAdjustForm({
            date: missedPunchRecord.date.split('T')[0],
            checkIn: '',
            checkOut: '',
            reason: 'Missed clock-out correction'
        });
        setMissedPunchRecord(null);
        setShowAdjustModal(true);
    };

    const onBreak = clockedInToday?.breaks?.some(b => !b.endTime);

    const safeTime = (dateStr: string | undefined) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch { return '-'; }
    };

    const safeDate = (dateStr: string | undefined) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
        } catch { return 'Invalid Date'; }
    };

    // State for Adjustment Request
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjustForm, setAdjustForm] = useState({ date: getLocalToday(), checkIn: '', checkOut: '', reason: '' });

    const handleRequestAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Combine date + time
            // We assume local processing
            if (!adjustForm.checkIn || !adjustForm.checkOut) {
                showToast("Please provide times", "error");
                return;
            }
            const dateStr = adjustForm.date; // YYYY-MM-DD
            const inTimeStr = adjustForm.checkIn; // HH:mm
            const outTimeStr = adjustForm.checkOut; // HH:mm

            // Construct full ISO strings approx
            const start = new Date(`${dateStr}T${inTimeStr}:00`);
            const end = new Date(`${dateStr}T${outTimeStr}:00`);

            await api.post('/attendance/adjust', {
                date: dateStr,
                clockIn: start.toISOString(),
                clockOut: end.toISOString(),
                reason: adjustForm.reason
            });
            showToast('Adjustment Requested Successfully', 'success');
            setShowAdjustModal(false);
            setAdjustForm({ date: getLocalToday(), checkIn: '', checkOut: '', reason: '' });
        } catch (error: any) {
            showToast(error.message || 'Request failed', 'error');
        }
    };

    return (
        <div className="page-container space-y-8">
            <div className="flex justify-between items-start">
                <PageHeader
                    title="My Attendance"
                    subtitle="Track your daily work hours, breaks, and monthly attendance history."
                    icon="attendance"
                />
                {!isSuperAdmin && (
                    <button
                        onClick={() => setShowAdjustModal(true)}
                        className="btn-outline flex items-center gap-2"
                    >
                        <Icon name="edit" size={16} /> Request Adjustment
                    </button>
                )}
            </div>

            {/* Adjustment Modal */}
            {showAdjustModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">Request Attendance Adjustment</h3>
                            <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-600" aria-label="Close Modal">
                                <Icon name="close" size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleRequestAdjustment} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Values to Correct</label>
                                <p className="text-xs text-slate-400 mb-2">Select the date and the correct check-in/out times.</p>

                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <label className="label" htmlFor="adjustDate">Date</label>
                                        <input id="adjustDate" type="date" required className="input-field" value={adjustForm.date} onChange={e => setAdjustForm({ ...adjustForm, date: e.target.value })} aria-label="Adjustment Date" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="label" htmlFor="adjustCheckIn">Check In</label>
                                            <input id="adjustCheckIn" type="time" required className="input-field" value={adjustForm.checkIn} onChange={e => setAdjustForm({ ...adjustForm, checkIn: e.target.value })} aria-label="Correct Check In Time" />
                                        </div>
                                        <div>
                                            <label className="label" htmlFor="adjustCheckOut">Check Out</label>
                                            <input id="adjustCheckOut" type="time" required className="input-field" value={adjustForm.checkOut} onChange={e => setAdjustForm({ ...adjustForm, checkOut: e.target.value })} aria-label="Correct Check Out Time" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="label" htmlFor="adjustReason">Reason for Adjustment</label>
                                <textarea id="adjustReason" required className="input-field" rows={3} placeholder="Forgot to punch out / System error..." value={adjustForm.reason} onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })} aria-label="Reason for Adjustment"></textarea>
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setShowAdjustModal(false)} className="btn-ghost flex-1">Cancel</button>
                                <button type="submit" className="btn-primary flex-1">Submit Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Missed Punch Alert */}
            {missedPunchRecord && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between animate-fade-in shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full text-red-600 shadow-sm">
                            <Icon name="alert" size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-red-800">Missed Clock Out Detected</h3>
                            <p className="text-sm text-red-600">
                                You forgot to clock out on {safeDate(missedPunchRecord.date)}.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleFixMissedPunch(missedPunchRecord.id)}
                            className="px-4 py-2 bg-white text-red-600 font-bold rounded-lg border border-red-100 hover:bg-red-50 transition-colors text-sm shadow-sm"
                        >
                            Auto-Fix (Set 9h)
                        </button>
                        <button
                            className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors text-sm shadow-lg shadow-red-500/20"
                            onClick={() => window.location.href = `mailto:hr@citrux.com?subject=Correction%20Request%20${missedPunchRecord.id}`}
                        >
                            Report to HR
                        </button>
                    </div>
                </div>
            )}

            <div className="dashboard-grid-premium mb-10">
                {/* Punch In/Out Card */}
                {!isSuperAdmin && (
                    <div className="dashboard-section animate-fade-in relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Icon name="schedule" size={120} />
                        </div>

                        <div className="section-header-premium relative z-10">
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="section-title-premium text-lg">Today's Shift</h2>
                                        <p className="text-sm text-slate-500 font-medium mt-1">{safeDate(new Date().toISOString())}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-black text-slate-800 tracking-tight font-heading">
                                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Current Time</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {clockedInToday && (
                            <div className="my-6 text-center relative z-10">
                                <div className="inline-block p-4 rounded-2xl bg-indigo-50 dark:bg-slate-800 border-2 border-indigo-100 dark:border-slate-700">
                                    <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-wider">
                                        {elapsedTime}
                                    </div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 dark:text-indigo-500 mt-1">
                                        Work Duration
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-4 mt-6 relative z-10">
                            {!clockedInToday ? (
                                <button onClick={handleClockIn} className="btn-success py-4 text-lg font-bold shadow-lg w-full flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]">
                                    <Icon name="login" size={24} /> Clock In Now
                                </button>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    {!onBreak ? (
                                        <button onClick={handleStartBreak} className="btn-secondary gap-2 py-3">
                                            <Icon name="pause" size={18} /> Take Break
                                        </button>
                                    ) : (
                                        <button onClick={handleEndBreak} className="btn-warning gap-2 py-3">
                                            <Icon name="play" size={18} /> Resume
                                        </button>
                                    )}
                                    <button
                                        onClick={handleClockOut}
                                        className="btn-danger gap-2 py-3"
                                        disabled={onBreak}
                                    >
                                        <Icon name="logout" size={18} /> Clock Out
                                    </button>
                                </div>
                            )}

                            {clockedInToday && (
                                <div className="flex items-center justify-center gap-2 mt-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${onBreak ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}></span>
                                    <span className="text-xs font-bold text-slate-500 uppercase">
                                        {onBreak ? 'On Break' : 'Currently Working'}
                                    </span>
                                    <span className="text-xs text-slate-400 mx-2">•</span>
                                    <span className="text-xs text-slate-500">
                                        Started at <span className="font-mono font-bold text-slate-700">{safeTime(clockedInToday.checkIn)}</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Profile Summary Card */}
                {user && !isSuperAdmin && (
                    <div className="dashboard-section animate-fade-in delay-100 flex flex-col justify-between">
                        <div>
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
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Hours</div>
                                    <div className="font-bold text-2xl text-slate-800">
                                        {history.reduce((acc, curr) => acc + (curr.hours || 0), 0).toFixed(1)}h
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1">This Month</div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Avg. Hours</div>
                                    <div className="font-bold text-2xl text-emerald-600">
                                        {history.length > 0 ? (history.reduce((acc, curr) => acc + (curr.hours || 0), 0) / history.length).toFixed(1) : '0'}h
                                    </div>
                                    <div className="text-[10px] text-emerald-600/70 mt-1">Per Day</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                <Icon name="info" size={16} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-indigo-900">Shift Policy</p>
                                <p className="text-[10px] text-indigo-700 leading-tight mt-0.5">
                                    Standard shift duration is 9 hours. Overtime is calculated for any work duration exceeding this limit.
                                </p>
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
                                <th>Overtime</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length > 0 ? history.map(record => (
                                <tr key={record.id}>
                                    <td className="font-bold text-slate-700">
                                        {safeDate(record.date)}
                                    </td>
                                    {canViewAll && (
                                        <td>
                                            <div className="font-bold text-xs">{record.user?.profile?.firstName}</div>
                                            <div className="text-[10px] text-slate-400">{record.user?.employeeId}</div>
                                        </td>
                                    )}
                                    <td className="font-mono text-sm">
                                        {safeTime(record.checkIn)}
                                    </td>
                                    <td className="font-mono text-sm">
                                        {safeTime(record.checkOut)}
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
                                    <td className={`font-bold ${record.hours && record.hours > 9 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                        {record.hours && record.hours > 9 ? `+${(record.hours - 9).toFixed(2)}h` : '-'}
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
