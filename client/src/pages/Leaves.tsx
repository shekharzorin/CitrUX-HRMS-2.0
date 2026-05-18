import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { StatsCardPremium } from '../components/ui/DashboardElements';
import { Icon } from '../components/ui/Icons';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, isWithinInterval, parseISO, isAfter } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const getIconForLeave = (code: string) => {
    switch (code?.toLowerCase()) {
        case 'cl': return 'profile';
        case 'sl': return 'plus';
        case 'pl': return 'reviews';
        default: return 'event';
    }
};

const getLeaveVariant = (code: string) => {
    switch (code?.toLowerCase()) {
        case 'cl': return 'blue';
        case 'sl': return 'orange';
        case 'pl': return 'purple';
        default: return 'green';
    }
};

const Leaves: React.FC = () => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [balances, setBalances] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [teamRequests, setTeamRequests] = useState<any[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'team'>('calendar');
    const [currentDate, setCurrentDate] = useState(new Date());

    // Form State
    const [formData, setFormData] = useState({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        duration: 'FULL_DAY', // FULL_DAY, FIRST_HALF, SECOND_HALF
        reason: ''
    });

    // Search and Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const canViewTeam = ['MANAGER', 'ADMIN', 'HR', 'SUPER_ADMIN'].includes(user?.role || '');

    const fetchData = async () => {
        try {
            const promises = [
                api.get<any[]>('/leaves/balances'),
                api.get<any[]>('/leaves/my-requests'),
                api.get<any[]>('/leaves/types')
            ];

            if (canViewTeam) {
                promises.push(api.get<any[]>('/leaves/team-requests').catch(() => []));
            }

            const results = await Promise.all(promises);
            
            setBalances(results[0] || []);
            setRequests(results[1] || []);
            setLeaveTypes(results[2] || []);
            
            if (canViewTeam && results[3]) {
                setTeamRequests(results[3]);
            }
        } catch (error) {
            console.error(error);
            showToast('Failed to fetch leave data.', 'error');
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Client-side validation
        if (!formData.leaveTypeId) {
            showToast('Please select a leave type.', 'error');
            return;
        }
        if (formData.endDate < formData.startDate) {
            showToast('End date cannot be before start date.', 'error');
            return;
        }
        if (formData.duration !== 'FULL_DAY' && formData.startDate !== formData.endDate) {
            showToast('Half day leave must be for a single day.', 'error');
            return;
        }

        try {
            await api.post('/leaves/apply', formData);
            setShowModal(false);
            setFormData({ leaveTypeId: '', startDate: '', endDate: '', duration: 'FULL_DAY', reason: '' });
            fetchData();
            showToast('Leave applied successfully!', 'success');
        } catch (error: any) {
            console.error(error);
            showToast(error.message || 'Failed to apply leave', 'error');
        }
    };

    const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val !== 'FULL_DAY') {
            setFormData(prev => ({ ...prev, duration: val, endDate: prev.startDate }));
        } else {
            setFormData(prev => ({ ...prev, duration: val }));
        }
    };

    // Calendar Helpers
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = getDay(monthStart); // 0 = Sunday

    const getLeaveColor = (code: string) => {
        switch (code?.toLowerCase()) {
            case 'cl': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'sl': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'pl': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-amber-100 text-amber-700 border-amber-200';
        }
    };

    const getLeaveForDay = (day: Date) => {
        return requests.find(r => {
            if (r.status === 'REJECTED') return false;
            const start = parseISO(r.startDate);
            const end = parseISO(r.endDate);
            return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end);
        });
    };

    const upcomingLeaves = requests.filter(r => isAfter(parseISO(r.startDate), new Date()) && r.status !== 'REJECTED').slice(0, 3);
    const totalUsed = balances.reduce((sum, b) => sum + (b.used || 0), 0);
    const totalAvailable = balances.reduce((sum, b) => sum + (b.balance || 0), 0);

    return (
        <div className="space-y-8 pb-12">
            <PageHeader
                title="Leave Management"
                subtitle="Track your time off and plan your schedule."
                icon="leaves"
                gradient="gradient-emerald"
                actions={
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-6 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl backdrop-blur-md border border-white/30 transition-all flex items-center gap-2 shadow-lg"
                    >
                        <Icon name="plus" size={18} /> Apply Leave
                    </button>
                }
            />

            {/* Quick Actions for Leaves */}
            <div className="flex flex-col sm:flex-row gap-4 mb-2">
                <Button variant="outline" className="w-full sm:w-auto py-4 rounded-2xl" onClick={() => {
                    setFormData(f => ({ ...f, leaveTypeId: leaveTypes.find((t: any) => t.code === 'CL')?.id || '' }));
                    setShowModal(true);
                }}>
                    Apply Casual Leave
                </Button>
                <Button variant="outline" className="w-full sm:w-auto py-4 rounded-2xl" onClick={() => {
                    setFormData(f => ({ ...f, leaveTypeId: leaveTypes.find((t: any) => t.code === 'SL')?.id || '' }));
                    setShowModal(true);
                }}>
                    Apply Sick Leave
                </Button>
            </div>

            {/* Balances Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {balances.map((b) => (
                    <StatsCardPremium
                        key={b.id}
                        title={b.leaveType.name}
                        value={b.balance}
                        subtext={`${b.used || 0} days used`}
                        icon={getIconForLeave(b.leaveType.code)}
                        variant={getLeaveVariant(b.leaveType.code) as any}
                    />
                ))}
            </div>

            {/* Analytics & Upcoming Leaves */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                        <Icon name="analytics" size={20} className="text-blue-500" /> Leave Analytics
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-6">
                        <div className="flex-1 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border border-blue-100 dark:border-slate-600 flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 dark:text-slate-300 font-medium text-sm">Total Available</p>
                                <h4 className="text-3xl font-black text-slate-800 dark:text-white mt-1">{totalAvailable}</h4>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-md">
                                <Icon name="event" size={24} />
                            </div>
                        </div>
                        <div className="flex-1 p-6 rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-slate-800 dark:to-slate-700 border border-rose-100 dark:border-slate-600 flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 dark:text-slate-300 font-medium text-sm">Total Used</p>
                                <h4 className="text-3xl font-black text-slate-800 dark:text-white mt-1">{totalUsed}</h4>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-md">
                                <Icon name="schedule" size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
                    <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                        <Icon name="campaign" size={20} className="text-purple-500" /> Upcoming Leaves
                    </h3>
                    {upcomingLeaves.length > 0 ? (
                        <div className="space-y-3 flex-1">
                            {upcomingLeaves.map(r => (
                                <div key={r.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{r.leaveType.name}</div>
                                        <div className="text-xs text-slate-500">{format(parseISO(r.startDate), 'MMM d, yyyy')}</div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {r.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8">
                            <Icon name="event" size={32} className="opacity-20 mb-2" />
                            <p className="text-sm">No upcoming leaves.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">

                {/* Tabs */}
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`font-bold transition-all text-sm pb-2 border-b-2 ${viewMode === 'calendar' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Calendar View
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`font-bold transition-all text-sm pb-2 border-b-2 ${viewMode === 'list' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            My Requests
                        </button>
                        {canViewTeam && (
                            <button
                                onClick={() => setViewMode('team')}
                                className={`font-bold transition-all text-sm pb-2 border-b-2 ${viewMode === 'team' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                Team Leaves
                            </button>
                        )}
                    </div>
                </div>

                {viewMode === 'calendar' && (
                    <div className="animate-fade-in">
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold font-heading">{format(currentDate, 'MMMM yyyy')}</h2>
                            <div className="flex gap-2">
                                <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" aria-label="Previous Month" title="Previous Month">
                                    <Icon name="chevron_left" size={20} />
                                </button>
                                <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm font-bold bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200" aria-label="Go to Today" title="Go to Today">
                                    Today
                                </button>
                                <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" aria-label="Next Month" title="Next Month">
                                    <Icon name="chevron_right" size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                            {/* Days Header */}
                            <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                    <div key={d} className="py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                                        {d}
                                    </div>
                                ))}
                            </div>

                            {/* Days Cells */}
                            <div className="grid grid-cols-7 auto-rows-fr bg-white dark:bg-slate-900">
                                {/* Empty cells for start padding */}
                                {[...Array(startDay)].map((_, i) => (
                                    <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-slate-50 dark:border-slate-800/50"></div>
                                ))}

                                {monthDays.map(day => {
                                    const leave = getLeaveForDay(day);
                                    const isToday = isSameDay(day, new Date());
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                                    return (
                                        <div key={day.toString()} className={`min-h-[100px] border-b border-r border-slate-50 dark:border-slate-800/50 p-2 relative group hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors ${isWeekend ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}`}>
                                            <span className={`text-sm font-medium ${isToday ? 'bg-primary text-white w-7 h-7 flex items-center justify-center rounded-full shadow-md' : 'text-slate-500'}`}>
                                                {format(day, 'd')}
                                            </span>

                                            {leave && (
                                                <div
                                                    className={`mt-2 p-1.5 rounded-lg text-[10px] font-bold border truncate cursor-pointer ${getLeaveColor(leave.leaveType.code)}`}
                                                    title={`${leave.leaveType.name}: ${leave.reason}`}
                                                >
                                                    {leave.leaveType.code} - {leave.status} {leave.duration !== 'FULL_DAY' ? `(${leave.duration === 'FIRST_HALF' ? '1st Half' : '2nd Half'})` : ''}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 mt-6 text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-200"></div> <span>Casual Leave (CL)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-purple-100 border border-purple-200"></div> <span>Privilege Leave (PL)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-rose-100 border border-rose-200"></div> <span>Sick Leave (SL)</span>
                            </div>
                        </div>
                    </div>
                )}
                
                {viewMode === 'list' && (
                    <div className="animate-fade-in space-y-4">
                        {/* Search and Filter */}
                        <div className="flex flex-col md:flex-row gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Icon name="search" size={18} />
                                </div>
                                <input
                                    type="text"
                                    className="input-field pl-10 bg-white"
                                    placeholder="Search by reason..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="w-full md:w-64 border-none">
                                <select 
                                    className="input-field bg-white" 
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    title="Filter by Status"
                                >
                                    <option value="ALL">All Statuses</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="REJECTED">Rejected</option>
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                            <table className="table-premium w-full text-left">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Date Range</th>
                                        <th>Duration</th>
                                        <th>Days</th>
                                        <th>Reason</th>
                                        <th className="text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests
                                        .filter(r => statusFilter === 'ALL' || r.status === statusFilter)
                                        .filter(r => r.reason?.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map(r => (
                                        <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="p-4 font-bold text-slate-700 dark:text-slate-300">{r.leaveType.name}</td>
                                            <td className="p-4 text-sm">
                                                {format(parseISO(r.startDate), 'MMM d, yyyy')} - {format(parseISO(r.endDate), 'MMM d, yyyy')}
                                            </td>
                                            <td className="p-4 text-sm font-medium text-slate-600">
                                                {r.duration === 'FIRST_HALF' ? 'First Half' : r.duration === 'SECOND_HALF' ? 'Second Half' : 'Full Day'}
                                            </td>
                                            <td className="p-4 font-mono text-sm">{r.days}</td>
                                            <td className="p-4 text-sm text-slate-500 max-w-[200px] truncate" title={r.reason}>{r.reason}</td>
                                            <td className="p-4 text-right">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                                    r.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {requests.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-400">No leave requests found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {viewMode === 'team' && canViewTeam && (
                    <div className="animate-fade-in space-y-4">
                        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                            <table className="table-premium w-full text-left">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Leave Type</th>
                                        <th>Date Range</th>
                                        <th>Duration</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamRequests.map(r => (
                                        <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                                                {r.user?.profile?.firstName} {r.user?.profile?.lastName}
                                            </td>
                                            <td className="p-4 text-sm text-slate-600">{r.leaveType.name}</td>
                                            <td className="p-4 text-sm">
                                                {format(parseISO(r.startDate), 'MMM d, yyyy')} - {format(parseISO(r.endDate), 'MMM d, yyyy')}
                                            </td>
                                            <td className="p-4 text-sm text-slate-600">
                                                {r.duration === 'FIRST_HALF' ? 'First Half' : r.duration === 'SECOND_HALF' ? 'Second Half' : 'Full Day'}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                                    r.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {teamRequests.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-400">No team leaves found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Apply Leave Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowModal(false)}>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-up border border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                            <h2 className="text-xl font-bold font-heading">Apply for Leave</h2>
                            <button onClick={() => setShowModal(false)} aria-label="Close Modal" title="Close"><Icon name="close" size={24} className="text-slate-400 hover:text-slate-600" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Type</label>
                                    <select className="input-field" value={formData.leaveTypeId} onChange={e => setFormData({ ...formData, leaveTypeId: e.target.value })} required title="Leave Type">
                                        <option value="">Select Type...</option>
                                        {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Duration</label>
                                    <select className="input-field" value={formData.duration} onChange={handleDurationChange} required title="Leave Duration">
                                        <option value="FULL_DAY">Full Day</option>
                                        <option value="FIRST_HALF">First Half</option>
                                        <option value="SECOND_HALF">Second Half</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Start Date</label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={formData.startDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={e => {
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                startDate: e.target.value, 
                                                endDate: prev.duration !== 'FULL_DAY' ? e.target.value : prev.endDate 
                                            }))
                                        }}
                                        required
                                        title="Start Date"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">End Date</label>
                                    <input
                                        type="date"
                                        className="input-field disabled:opacity-50"
                                        value={formData.endDate}
                                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        required
                                        disabled={formData.duration !== 'FULL_DAY'}
                                        title="End Date"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Reason</label>
                                <textarea className="input-field" rows={3} value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} required title="Reason for leave" placeholder="Enter reason"></textarea>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button variant="ghost" onClick={() => setShowModal(false)} fullWidth>Cancel</Button>
                                <Button type="submit" fullWidth>Submit Request</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leaves;
