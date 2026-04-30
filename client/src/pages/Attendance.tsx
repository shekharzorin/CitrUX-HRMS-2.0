import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';

// New Components
import { AttendanceHeader } from '../components/attendance/AttendanceHeader';
import { WorkStatusCard } from '../components/attendance/WorkStatusCard';
import { MetricsCard } from '../components/attendance/MetricsCard';
import { EmployeeCard } from '../components/attendance/EmployeeCard';
import { AttendanceTable } from '../components/attendance/AttendanceTable';
import { FiltersBar } from '../components/attendance/FiltersBar';

// Custom Hook
import { useTimer } from '../hooks/useTimer';

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
            avatar?: string;
        };
    };
}

const Attendance: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    
    // State
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    const [filteredHistory, setFilteredHistory] = useState<AttendanceRecord[]>([]);
    const [clockedInToday, setClockedInToday] = useState<AttendanceRecord | null>(null);
    const [missedPunchRecord, setMissedPunchRecord] = useState<AttendanceRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Pagination & Filtering
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Modals
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjustForm, setAdjustForm] = useState({ 
        date: new Date().toISOString().split('T')[0], 
        checkIn: '', 
        checkOut: '', 
        reason: '' 
    });

    const canViewAll = user?.role === 'ADMIN' || user?.role === 'HR' || user?.role === 'SUPER_ADMIN';
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    // Timer Hook
    const onBreak = clockedInToday?.breaks?.some(b => !b.endTime) || false;
    const { elapsedTime, currentTime } = useTimer(
        clockedInToday?.checkIn, 
        clockedInToday?.breaks || []
    );

    // Helpers
    const getLocalToday = () => {
        const d = new Date();
        return d.toISOString().split('T')[0];
    };

    const fetchHistory = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const endpoint = canViewAll ? '/attendance/all' : '/attendance/my-history';
            const data = await api.get<AttendanceRecord[]>(endpoint, { silent: true });
            
            // Sort by date descending
            const sortedData = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setHistory(sortedData);

            // Check for current status (only if not super admin)
            if (!isSuperAdmin) {
                const today = getLocalToday();
                const todayRecord = data.find(r => r.date.startsWith(today));
                setClockedInToday(todayRecord || null);

                // Check for missed punch out from previous days
                const incompleteRecord = data.find(r => !r.date.startsWith(today) && r.checkIn && !r.checkOut);
                if (incompleteRecord) {
                    setMissedPunchRecord(incompleteRecord);
                }
            }
        } catch (error) {
            console.error('Failed to fetch attendance history:', error);
            showToast('Failed to load history', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [user, canViewAll, isSuperAdmin, showToast]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Filter Logic
    useEffect(() => {
        let results = [...history];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            results = results.filter(r => 
                r.user?.profile?.firstName.toLowerCase().includes(query) ||
                r.user?.profile?.lastName.toLowerCase().includes(query) ||
                r.user?.employeeId?.toLowerCase().includes(query)
            );
        }

        if (statusFilter !== 'ALL') {
            results = results.filter(r => r.status === statusFilter);
        }

        if (dateRange.start) {
            results = results.filter(r => r.date >= dateRange.start);
        }

        if (dateRange.end) {
            results = results.filter(r => r.date <= dateRange.end);
        }

        setFilteredHistory(results);
        setCurrentPage(1); // Reset to first page on filter change
    }, [history, searchQuery, statusFilter, dateRange]);

    // Pagination Calculations
    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
    const currentRecords = filteredHistory.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Handlers
    const handleClockIn = async () => {
        try {
            await api.post('/attendance/punch-in', { location: 'Office', workDate: getLocalToday() });
            showToast('Clocked in successfully!', 'success');
            fetchHistory();
        } catch (error: any) {
            showToast(error.message || 'Clock In failed', 'error');
        }
    };

    const handleClockOut = async () => {
        try {
            await api.post('/attendance/punch-out', {});
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

    const handleRequestAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!adjustForm.checkIn || !adjustForm.checkOut) {
                showToast("Please provide times", "error");
                return;
            }
            const start = new Date(`${adjustForm.date}T${adjustForm.checkIn}:00`);
            const end = new Date(`${adjustForm.date}T${adjustForm.checkOut}:00`);

            await api.post('/attendance/adjust', {
                date: adjustForm.date,
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

    const handleFixMissedPunch = (record: AttendanceRecord) => {
        setAdjustForm({
            date: record.date.split('T')[0],
            checkIn: '09:00',
            checkOut: '18:00',
            reason: 'Auto-correction for missed clock-out'
        });
        setShowAdjustModal(true);
        setMissedPunchRecord(null);
    };

    // Metrics Data
    const monthlyHours = history.reduce((acc, curr) => acc + (curr.hours || 0), 0);
    const avgHours = history.length > 0 ? (monthlyHours / history.length) : 0;
    const todayWork = clockedInToday?.hours || 0;
    const breakTimeToday = clockedInToday?.breaks?.reduce((acc, b) => acc + (b.duration || 0), 0) || 0;

    return (
        <div className="page-container space-y-8 pb-12">
            {/* Header */}
            <AttendanceHeader 
                isSuperAdmin={isSuperAdmin} 
                onRequestAdjustment={() => setShowAdjustModal(true)} 
            />

            {/* Top Control Section */}
            {!isSuperAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Status Card (Main Focus) */}
                    <div className="lg:col-span-4 h-full">
                        <WorkStatusCard 
                            clockedInToday={clockedInToday}
                            onBreak={onBreak}
                            currentTime={currentTime}
                            elapsedTime={elapsedTime}
                            handleClockIn={handleClockIn}
                            handleClockOut={handleClockOut}
                            handleStartBreak={handleStartBreak}
                            handleEndBreak={handleEndBreak}
                        />
                    </div>

                    {/* Metrics & Profile */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <MetricsCard 
                                title="Today's Work"
                                value={`${todayWork.toFixed(1)}h`}
                                subtitle="Live tracking"
                                icon="schedule"
                                color="indigo"
                            />
                            <MetricsCard 
                                title="Monthly Hours"
                                value={`${monthlyHours.toFixed(1)}h`}
                                subtitle="Last 30 days"
                                icon="analytics"
                                trend={`${avgHours.toFixed(1)}h/day`}
                                trendUp={avgHours >= 8}
                                color="purple"
                            />
                            <MetricsCard 
                                title="Break Today"
                                value={`${breakTimeToday}m`}
                                subtitle="Total pause time"
                                icon="pause"
                                color="amber"
                            />
                        </div>
                        
                        <div className="flex-1">
                            <EmployeeCard user={user} isSuperAdmin={isSuperAdmin} />
                        </div>
                    </div>
                </div>
            )}

            {/* Missed Punch Alert */}
            {missedPunchRecord && !isSuperAdmin && (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in shadow-sm">
                    <div className="flex items-center gap-4 text-center md:text-left">
                        <div className="p-3 bg-white text-rose-500 rounded-2xl shadow-sm border border-rose-100">
                            <Icon name="alert" size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-rose-900 leading-tight">Missed Clock Out Detected</h3>
                            <p className="text-sm text-rose-600 font-medium">
                                You didn't clock out on {new Date(missedPunchRecord.date).toLocaleDateString([], { day: 'numeric', month: 'long' })}.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={() => handleFixMissedPunch(missedPunchRecord)}
                            className="flex-1 md:px-6 py-2.5 bg-white text-rose-600 font-bold rounded-xl border border-rose-100 hover:bg-rose-50 transition-all text-sm shadow-sm"
                        >
                            Quick Fix (9h)
                        </button>
                        <button
                            className="flex-1 md:px-6 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all text-sm shadow-lg shadow-rose-200"
                            onClick={() => window.open(`mailto:hr@citrux.com?subject=Attendance Correction Request - ${user?.employeeId}`)}
                        >
                            Contact HR
                        </button>
                    </div>
                </div>
            )}

            {/* History Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                        Attendance History
                    </h2>
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
                    canViewAll={canViewAll}
                />

                <AttendanceTable 
                    records={currentRecords}
                    canViewAll={canViewAll}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    isLoading={isLoading}
                />
            </div>

            {/* Adjustment Modal */}
            {showAdjustModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-black text-lg text-slate-800">Request Adjustment</h3>
                            <button onClick={() => setShowAdjustModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors">
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleRequestAdjustment} className="p-6 space-y-5">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Select Date</label>
                                <input 
                                    type="date" 
                                    required 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                    value={adjustForm.date} 
                                    onChange={e => setAdjustForm({ ...adjustForm, date: e.target.value })} 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Correct In</label>
                                    <input 
                                        type="time" 
                                        required 
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                        value={adjustForm.checkIn} 
                                        onChange={e => setAdjustForm({ ...adjustForm, checkIn: e.target.value })} 
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Correct Out</label>
                                    <input 
                                        type="time" 
                                        required 
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                        value={adjustForm.checkOut} 
                                        onChange={e => setAdjustForm({ ...adjustForm, checkOut: e.target.value })} 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Reason for change</label>
                                <textarea 
                                    required 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" 
                                    rows={3} 
                                    placeholder="Briefly explain why you need this correction..."
                                    value={adjustForm.reason} 
                                    onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })} 
                                />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setShowAdjustModal(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all">Submit Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Attendance;
