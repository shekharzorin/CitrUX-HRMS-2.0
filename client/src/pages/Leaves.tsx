import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { StatsCardPremium } from '../components/ui/DashboardElements';
import { Icon } from '../components/ui/Icons';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, isWithinInterval, parseISO } from 'date-fns';

// Helper for classes


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
    const [balances, setBalances] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [currentDate, setCurrentDate] = useState(new Date());

    // Form State
    const [formData, setFormData] = useState({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        reason: ''
    });

    // Search and Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const fetchData = async () => {
        try {
            const [balData, reqData, typeData] = await Promise.all([
                api.get<any[]>('/leaves/balances'),
                api.get<any[]>('/leaves/my-requests'),
                api.get<any[]>('/leaves/types')
            ]);

            if (balData) setBalances(balData);
            if (reqData) setRequests(reqData);
            if (typeData) setLeaveTypes(typeData);
        } catch (error) {
            console.error(error);
            showToast('Failed to fetch leave data.', 'error');
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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

        try {
            await api.post('/leaves/apply', formData);
            setShowModal(false);
            setFormData({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
            fetchData();
            showToast('Leave applied successfully!', 'success');
        } catch (error: any) {
            console.error(error);
            showToast(error.message || 'Failed to apply leave', 'error');
        }
    };

    // Calendar Helpers
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = getDay(monthStart); // 0 = Sunday

    // Map leave types to colors
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

    return (
        <div className="space-y-8 pb-12">
            <PageHeader
                title="Leave Management"
                subtitle="Track your time off and plan your schedule."
                icon="leaves"
                gradient="gradient-purple"
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

            {/* Content Area */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">

                {/* Tabs */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg">My Schedule</h3>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                        >
                            Calendar
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                        >
                            List View
                        </button>
                    </div>
                </div>

                {viewMode === 'calendar' ? (
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
                                                    {leave.leaveType.code} - {leave.status}
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
                ) : (
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
                                            <td className="p-4 font-mono text-sm">{r.days}</td>
                                            <td className="p-4 text-sm text-slate-500 max-w-[200px] truncate">{r.reason}</td>
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
                                            <td colSpan={5} className="p-8 text-center text-slate-400">No leave requests found.</td>
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
                            <div>
                                <label className="form-label">Type</label>
                                <select className="input-field" value={formData.leaveTypeId} onChange={e => setFormData({ ...formData, leaveTypeId: e.target.value })} required title="Leave Type">
                                    <option value="">Select Type...</option>
                                    {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Start</label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={formData.startDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value, endDate: '' })}
                                        required
                                        title="Start Date"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">End</label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={formData.endDate}
                                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        required
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

