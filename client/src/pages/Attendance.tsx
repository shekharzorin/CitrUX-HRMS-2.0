import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { resolveImageUrl } from '../utils/image';

// Hooks
import { useAttendanceWidget } from '../hooks/useAttendanceWidget';

// Sub-components
import { AttendanceTable } from '../components/attendance/AttendanceTable';
import { FiltersBar } from '../components/attendance/FiltersBar';

const Attendance: React.FC = () => {
    const { user } = useAuth();
    
    // Core Logic Hook
    const { 
        state, 
        activeRecord, 
        actionLoading, 
        liveWorkTime, 
        liveBreakTime, 
        punchIn, 
        punchOut, 
        startBreak, 
        endBreak,
        refresh,
        formatDuration
    } = useAttendanceWidget();

    // History & Filtering
    const [history, setHistory] = useState<any[]>([]);
    const [filteredHistory, setFilteredHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const progressRef = useRef<HTMLDivElement>(null);

    // Sync Progress Bar Imperatively to avoid inline style warnings
    useEffect(() => {
        if (progressRef.current) {
            const progress = Math.min(100, (activeRecord?.hours || 0) / 8 * 100);
            progressRef.current.style.width = `${progress}%`;
        }
    }, [activeRecord?.hours]);

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const data = await api.get<any[]>('/attendance/my-history');
            setHistory(data);
        } catch (e) { console.error(e); }
        finally { setHistoryLoading(false); }
    }, []);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    // Filter Logic
    useEffect(() => {
        let results = [...history];
        if (searchQuery) {
            results = results.filter(r => r.date.includes(searchQuery));
        }
        if (statusFilter !== 'ALL') {
            results = results.filter(r => r.status === statusFilter);
        }
        if (dateRange.start) results = results.filter(r => r.date >= dateRange.start);
        if (dateRange.end) results = results.filter(r => r.date <= dateRange.end);
        setFilteredHistory(results);
    }, [history, searchQuery, statusFilter, dateRange]);

    // Metrics (Calculated from history)
    const monthlyStats = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recent = history.filter(r => new Date(r.date) >= thirtyDaysAgo);
        const totalSec = recent.reduce((acc, r) => acc + (r.hours * 3600 || 0), 0);
        return formatDuration(totalSec);
    }, [history, formatDuration]);

    return (
        <div className="page-container space-y-8 pb-12 bg-slate-50/50 min-h-screen">
            
            {/* 1. WORK CONTROL PANEL (Main Component) */}
            <div className="card-premium p-0 overflow-hidden border-none shadow-2xl shadow-indigo-500/10">
                <div className="bg-white dark:bg-slate-900 p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                    
                    {/* LEFT: Status */}
                    <div className="flex items-center gap-6 min-w-[200px]">
                        <div className={`w-4 h-4 rounded-full animate-pulse shadow-[0_0_15px_rgba(0,0,0,0.1)] ${
                            state === 'WORKING' ? 'bg-emerald-500 shadow-emerald-500/50' : 
                            state === 'ON_BREAK' ? 'bg-amber-500 shadow-amber-500/50' : 
                            'bg-slate-300'
                        }`}></div>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Status</div>
                            <div className="text-xl font-black text-slate-800">
                                {state === 'WORKING' ? 'Working' : state === 'ON_BREAK' ? 'On Break' : 'Not Clocked In'}
                            </div>
                        </div>
                    </div>

                    {/* CENTER: Timer Engine */}
                    <div className="flex-1 text-center">
                        <div className="inline-flex flex-col items-center">
                            <div className="text-6xl font-black font-mono tracking-tighter text-slate-900 tabular-nums">
                                {state === 'ON_BREAK' ? liveBreakTime : liveWorkTime}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <Icon name="schedule" size={14} className="text-indigo-500" />
                                <span className="text-xs font-bold text-slate-500">
                                    {state === 'WORKING' && activeRecord?.checkIn && `Started at ${new Date(activeRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                    {state === 'ON_BREAK' && `Paused since ${new Date(activeRecord.breaks.find((b: any) => !b.endTime).startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                    {state === 'IDLE' && 'Ready to start your day'}
                                </span>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-64 h-1.5 bg-slate-100 rounded-full mt-6 overflow-hidden">
                                <div 
                                    ref={progressRef}
                                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-1000"
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Actions */}
                    <div className="flex flex-col items-center md:items-end gap-3 min-w-[200px]">
                        {state === 'IDLE' || state === 'CLOCKED_OUT' ? (
                            <Button 
                                variant="primary" 
                                size="lg" 
                                className="px-10 h-14 rounded-2xl text-lg font-black !bg-emerald-600 hover:!bg-emerald-700 shadow-xl shadow-emerald-200"
                                onClick={punchIn}
                                isLoading={actionLoading}
                            >
                                Clock In Now
                            </Button>
                        ) : state === 'WORKING' ? (
                            <>
                                <Button 
                                    variant="primary" 
                                    size="lg" 
                                    className="px-10 h-14 rounded-2xl text-lg font-black !bg-amber-500 hover:!bg-amber-600 shadow-xl shadow-amber-200"
                                    onClick={startBreak}
                                    isLoading={actionLoading}
                                >
                                    Take Break
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="text-slate-400 hover:text-rose-600 font-bold"
                                    onClick={punchOut}
                                    isLoading={actionLoading}
                                >
                                    Clock Out
                                </Button>
                            </>
                        ) : (
                            <Button 
                                variant="primary" 
                                size="lg" 
                                className="px-10 h-14 rounded-2xl text-lg font-black !bg-blue-600 hover:!bg-blue-700 shadow-xl shadow-blue-200"
                                onClick={endBreak}
                                isLoading={actionLoading}
                            >
                                Resume Work
                            </Button>
                        )}
                    </div>
                </div>

                {/* Break History (Visible when on break) */}
                {state === 'ON_BREAK' && activeRecord?.breaks && (
                    <div className="bg-amber-50/50 border-t border-amber-100 p-6 animate-slide-down">
                        <div className="max-w-md mx-auto">
                            <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-3 text-center">Break History Today</div>
                            <div className="space-y-2">
                                {activeRecord.breaks.map((b: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-amber-100 text-xs font-bold">
                                        <div className="text-slate-500">Break #{i + 1}</div>
                                        <div className="text-slate-900">
                                            {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} → 
                                            {b.endTime ? new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                                        </div>
                                        <div className="text-amber-600">
                                            {b.endTime ? `${Math.round((new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000)}m` : 'In Progress'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. METRICS (Minimal) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard 
                    label="Today's Work" 
                    value={liveWorkTime} 
                    icon="schedule" 
                    color="emerald" 
                />
                <MetricCard 
                    label="Monthly Hours" 
                    value={monthlyStats} 
                    icon="analytics" 
                    color="indigo" 
                />
                <MetricCard 
                    label="Break Time Today" 
                    value={liveBreakTime} 
                    icon="pause" 
                    color="amber" 
                />
            </div>

            {/* 3. PROFILE & HISTORY SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                
                {/* Profile Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm sticky top-24">
                        <div className="flex flex-col items-center text-center">
                            <Avatar 
                                src={resolveImageUrl(user?.profile?.profilePhoto)} 
                                name={`${user?.profile?.firstName} ${user?.profile?.lastName}`} 
                                size="96px"
                                className="border-4 border-slate-50 shadow-lg mb-4"
                            />
                            <h3 className="font-black text-slate-900 text-lg">{user?.profile?.firstName} {user?.profile?.lastName}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{user?.profile?.designation}</p>
                            
                            <div className="w-full h-px bg-slate-50 my-6"></div>
                            
                            <div className="w-full space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-bold">Shift</span>
                                    <span className="text-slate-700 font-black">{user?.shift?.name || 'General'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-bold">Timing</span>
                                    <span className="text-slate-700 font-black">{user?.shift?.startTime} - {user?.shift?.endTime}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attendance History Table */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-slate-800">Attendance History</h2>
                        <Button variant="ghost" className="text-indigo-600 font-black" onClick={refresh}>
                            <Icon name="refresh" size={18} className="mr-2" /> Sync Records
                        </Button>
                    </div>

                    <FiltersBar 
                        onSearch={setSearchQuery}
                        onStatusFilter={setStatusFilter}
                        onDateRangeChange={(start, end) => setDateRange({ start, end })}
                        onReset={() => {
                            setSearchQuery('');
                            setStatusFilter('ALL');
                            setDateRange({ start: '', end: '' });
                        }}
                        canViewAll={user?.role === 'ADMIN' || user?.role === 'HR'}
                    />

                    <AttendanceTable 
                        records={filteredHistory}
                        isLoading={historyLoading}
                    />
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, icon, color }: { label: string, value: string, icon: any, color: string }) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6">
        <div className={`p-4 rounded-2xl ${
            color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 
            color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : 
            'bg-amber-50 text-amber-600'
        }`}>
            <Icon name={icon} size={24} />
        </div>
        <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</div>
            <div className="text-2xl font-black text-slate-800 font-mono">{value}</div>
        </div>
    </div>
);

export default Attendance;
