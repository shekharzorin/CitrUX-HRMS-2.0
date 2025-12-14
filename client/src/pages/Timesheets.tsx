import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfWeek, addWeeks, subWeeks, endOfWeek } from 'date-fns';

const Timesheets: React.FC = () => {
    const { token } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [timesheet, setTimesheet] = useState<any>(null);
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchTimesheet();
    }, [currentDate]);

    const fetchTimesheet = async () => {
        setLoading(true);
        try {
            const dateStr = currentDate.toISOString();
            const res = await fetch(`http://localhost:5000/api/timesheets/my?date=${dateStr}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTimesheet(data);
                setEntries(data.entries.length > 0 ? data.entries : []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRow = () => {
        setEntries([...entries, {
            id: null,
            taskName: '',
            project: '',
            mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0,
            total: 0
        }]);
    };

    const handleChange = (index: number, field: string, value: string | number) => {
        const newEntries = [...entries];
        const entry = { ...newEntries[index] };

        if (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(field)) {
            entry[field] = parseFloat(value as string) || 0;
            // Recalculate Total
            entry.total = (entry.mon || 0) + (entry.tue || 0) + (entry.wed || 0) + (entry.thu || 0) + (entry.fri || 0) + (entry.sat || 0) + (entry.sun || 0);
        } else {
            entry[field] = value;
        }

        newEntries[index] = entry;
        setEntries(newEntries);
    };

    const handleDeleteRow = async (index: number) => {
        const entry = entries[index];
        if (entry.id) {
            if (!confirm('Are you sure you want to delete this specific entry?')) return;
            try {
                await fetch(`http://localhost:5000/api/timesheets/entry/${entry.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (e) {
                console.error(e);
                alert('Failed to delete entry');
                return;
            }
        }
        const newEntries = entries.filter((_, i) => i !== index);
        setEntries(newEntries);
    };

    const saveChanges = async () => {
        if (!timesheet) return;
        setSaving(true);
        try {
            const res = await fetch('http://localhost:5000/api/timesheets/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    id: timesheet.id,
                    entries: entries
                })
            });

            if (res.ok) {
                const updated = await res.json();
                setTimesheet(updated);
                setEntries(updated.entries);
                alert('Timesheet Saved Successfully');
            } else {
                alert('Failed to save');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

    // Calculate Column Totals
    const totals = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0, total: 0 };
    entries.forEach(e => {
        totals.mon += e.mon || 0;
        totals.tue += e.tue || 0;
        totals.wed += e.wed || 0;
        totals.thu += e.thu || 0;
        totals.fri += e.fri || 0;
        totals.sat += e.sat || 0;
        totals.sun += e.sun || 0;
        totals.total += e.total || 0;
    });



    return (
        <div className="p-6 bg-slate-50 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* 1. Top Header: Title & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Timesheets</h1>
                        <p className="text-slate-500 text-sm mt-1">Manage your weekly tasks and hours.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium transition-all shadow-sm">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            Copy Last Week
                        </button>
                        <button onClick={saveChanges} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium transition-all shadow-sm disabled:opacity-50">
                            {saving ? 'Saving...' : 'Save Draft'}
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-all shadow-md shadow-blue-200">
                            Submit for Approval
                        </button>
                    </div>
                </div>

                {/* 2. Stats & Navigation Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex flex-col md:flex-row items-center justify-between">

                    {/* Week Navigator */}
                    <div className="flex items-center gap-2 p-2">
                        <button onClick={() => setCurrentDate(subWeeks(currentDate, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div className="flex items-center gap-3 px-2">
                            <div className="bg-blue-50 text-blue-700 p-2 rounded-lg">
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Current Week</div>
                                <div className="text-slate-800 font-bold text-sm md:text-base whitespace-nowrap">
                                    {format(weekStart, 'dd MMM')} - {format(weekEnd, 'dd MMM yyyy')}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="w-full md:w-px h-px md:h-12 bg-slate-100 my-2 md:my-0"></div>

                    {/* Stats */}
                    <div className="flex items-center gap-8 px-6 py-2 overflow-x-auto w-full md:w-auto">
                        <div className="flex flex-col">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Status</span>
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 border ${timesheet?.status === 'SUBMITTED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                                }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${timesheet?.status === 'SUBMITTED' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                {timesheet?.status || 'Draft'}
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Billable</span>
                            <span className="text-lg font-bold text-slate-700 font-mono">00:00</span>
                        </div>

                        <div className="flex flex-col">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Non-Billable</span>
                            <span className="text-lg font-bold text-slate-700 font-mono">{totals.total.toFixed(2)}</span>
                        </div>

                        <div className="flex flex-col pl-4 border-l border-slate-100">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Hours</span>
                            <span className="text-2xl font-bold text-blue-600 font-mono">{totals.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* 3. Timesheet Grid */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-slate-900/5">
                    {loading ? (
                        <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <span className="text-sm font-medium">Loading your timesheet...</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-200">
                                        <th className="p-4 w-[320px] text-xs font-semibold text-slate-500 uppercase tracking-wider">Project / Task</th>
                                        <th className="p-2 text-center w-[80px] text-xs font-semibold text-slate-500 uppercase">Mon <br /><span className="text-[10px] font-normal text-slate-400">{format(addWeeks(weekStart, 0), 'd')}</span></th>
                                        <th className="p-2 text-center w-[80px] text-xs font-semibold text-slate-500 uppercase">Tue <br /><span className="text-[10px] font-normal text-slate-400">{format(addWeeks(weekStart, 0), 'd')}</span></th>
                                        <th className="p-2 text-center w-[80px] text-xs font-semibold text-slate-500 uppercase">Wed <br /><span className="text-[10px] font-normal text-slate-400">{format(addWeeks(weekStart, 0), 'd')}</span></th>
                                        <th className="p-2 text-center w-[80px] text-xs font-semibold text-slate-500 uppercase">Thu <br /><span className="text-[10px] font-normal text-slate-400">{format(addWeeks(weekStart, 0), 'd')}</span></th>
                                        <th className="p-2 text-center w-[80px] text-xs font-semibold text-slate-500 uppercase">Fri <br /><span className="text-[10px] font-normal text-slate-400">{format(addWeeks(weekStart, 0), 'd')}</span></th>
                                        <th className="p-2 text-center w-[80px] text-xs font-semibold text-slate-500 uppercase bg-slate-100/50">Sat <br /><span className="text-[10px] font-normal text-slate-400">{format(addWeeks(weekStart, 0), 'd')}</span></th>
                                        <th className="p-2 text-center w-[80px] text-xs font-semibold text-slate-500 uppercase bg-slate-100/50">Sun <br /><span className="text-[10px] font-normal text-slate-400">{format(addWeeks(weekStart, 0), 'd')}</span></th>
                                        <th className="p-2 text-center w-[100px] text-xs font-bold text-slate-700 uppercase bg-slate-50">Total</th>
                                        <th className="p-2 w-[50px]"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {entries.map((entry, index) => (
                                        <tr key={index} className="group hover:bg-slate-50 transition-colors">
                                            <td className="p-3 align-top">
                                                <div className="flex flex-col gap-2">
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                                            <span className="text-slate-400 text-xs text-[10px]">🏢</span>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="Select Project / Client..."
                                                            className="w-full pl-7 pr-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all placeholder-slate-400"
                                                            value={entry.project || ''}
                                                            onChange={e => handleChange(index, 'project', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                                            <span className="text-slate-400 text-[10px]">📝</span>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="What are you working on?"
                                                            className="w-full pl-7 pr-3 py-1.5 text-sm font-medium text-slate-800 bg-transparent border-0 border-b border-slate-200 focus:border-blue-500 focus:ring-0 transition-colors placeholder-slate-400"
                                                            value={entry.taskName || ''}
                                                            onChange={e => handleChange(index, 'taskName', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
                                                <td key={day} className={`p-2 align-middle text-center ${['sat', 'sun'].includes(day) ? 'bg-slate-50/50' : ''}`}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="24"
                                                        step="0.5"
                                                        className={`w-12 h-9 text-center rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-mono text-sm transition-all
                                                            ${entry[day] > 0 ? 'bg-white text-slate-900 border-slate-300 shadow-sm' : 'bg-transparent text-slate-400 hover:bg-white hover:border-slate-300'}
                                                            ${entry[day] > 8 ? 'text-amber-600 font-bold bg-amber-50 border-amber-200' : ''}
                                                        `}
                                                        value={entry[day] === 0 ? '' : entry[day]}
                                                        placeholder="-"
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={e => handleChange(index, day, e.target.value)}
                                                    />
                                                </td>
                                            ))}
                                            <td className="p-3 align-middle text-center">
                                                <div className="w-16 mx-auto py-1.5 bg-slate-100 rounded-md font-mono font-bold text-slate-700 text-sm">
                                                    {entry.total.toFixed(2)}
                                                </div>
                                            </td>
                                            <td className="p-3 align-middle text-center">
                                                <button
                                                    onClick={() => handleDeleteRow(index)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                    title="Remove Task"
                                                >
                                                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Empty State */}
                                    {entries.length === 0 && (
                                        <tr>
                                            <td colSpan={10} className="py-16">
                                                <div className="flex flex-col items-center justify-center text-slate-400">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                                        <span className="text-3xl">📝</span>
                                                    </div>
                                                    <p className="text-lg font-medium text-slate-600">No tasks tracked this week</p>
                                                    <p className="text-sm">Start by adding a new task below</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50 border-t border-slate-200">
                                        <td className="p-4 text-right pr-6 text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Daily Total
                                        </td>
                                        <td className="p-3 text-center font-mono font-bold text-slate-700">{totals.mon.toFixed(2)}</td>
                                        <td className="p-3 text-center font-mono font-bold text-slate-700">{totals.tue.toFixed(2)}</td>
                                        <td className="p-3 text-center font-mono font-bold text-slate-700">{totals.wed.toFixed(2)}</td>
                                        <td className="p-3 text-center font-mono font-bold text-slate-700">{totals.thu.toFixed(2)}</td>
                                        <td className="p-3 text-center font-mono font-bold text-slate-700">{totals.fri.toFixed(2)}</td>
                                        <td className="p-3 text-center font-mono font-bold text-slate-500 bg-slate-100/50">{totals.sat.toFixed(2)}</td>
                                        <td className="p-3 text-center font-mono font-bold text-slate-500 bg-slate-100/50">{totals.sun.toFixed(2)}</td>
                                        <td className="p-3 text-center font-mono font-bold text-white bg-blue-600 rounded-b-lg md:rounded-none">{totals.total.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="p-3 bg-slate-50 border-t border-slate-200">
                        <button
                            onClick={handleAddRow}
                            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 font-medium hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all group"
                        >
                            <span className="w-6 h-6 rounded-full bg-slate-200 group-hover:bg-blue-200 text-slate-500 group-hover:text-blue-600 flex items-center justify-center text-lg leading-none pb-0.5 transition-colors">+</span>
                            Add New Task
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Timesheets;
