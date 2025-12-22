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
        <div className="page-container">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Timesheets</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your weekly tasks and hours.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="btn-secondary">
                        <span className="text-lg">📋</span> Copy Last Week
                    </button>
                    <button onClick={saveChanges} disabled={saving} className="btn-secondary" style={{ minWidth: '120px' }}>
                        {saving ? 'Saving...' : '💾 Save Draft'}
                    </button>
                    <button className="btn-primary">
                        🚀 Submit for Approval
                    </button>
                </div>
            </div>

            {/* Navigation & Stats */}
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Week Navigator */}
                    <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <button onClick={() => setCurrentDate(subWeeks(currentDate, 1))} className="p-2 hover:bg-white rounded-md transition-colors text-slate-500">
                            ◀
                        </button>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">📅</span>
                            <div>
                                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Current Week</div>
                                <div className="text-slate-900 font-bold whitespace-nowrap">
                                    {format(weekStart, 'dd MMM')} - {format(weekEnd, 'dd MMM yyyy')}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="p-2 hover:bg-white rounded-md transition-colors text-slate-500">
                            ▶
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 overflow-x-auto pb-2 md:pb-0">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-400 uppercase">Status</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold mt-1 border ${timesheet?.status === 'SUBMITTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                {timesheet?.status || 'Draft'}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-400 uppercase">Billable</span>
                            <span className="font-mono font-bold text-slate-700">00:00</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-400 uppercase">Non-Billable</span>
                            <span className="font-mono font-bold text-slate-700">{totals.total.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col pl-6 border-l border-slate-200">
                            <span className="text-xs font-bold text-slate-400 uppercase">Total Hours</span>
                            <span className="font-mono font-bold text-xl text-blue-600">{totals.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timesheet Grid */}
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className="text-sm font-medium">Loading your timesheet...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-4 w-[300px] text-xs font-bold text-slate-500 uppercase tracking-wider">Project / Task</th>
                                    {Array.from({ length: 7 }).map((_, i) => {
                                        const date = new Date(weekStart);
                                        date.setDate(weekStart.getDate() + i);
                                        return (
                                            <th key={i} className={`p-3 text-center w-[80px] text-xs font-bold text-slate-500 uppercase ${i > 4 ? 'bg-slate-100/50' : ''}`}>
                                                {format(date, 'EEE')} <br />
                                                <span className="text-slate-400 font-normal">{format(date, 'dd')}</span>
                                            </th>
                                        );
                                    })}
                                    <th className="p-3 text-center w-[80px] text-xs font-bold text-slate-700 uppercase bg-slate-100">Total</th>
                                    <th className="w-[50px]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {entries.map((entry, index) => (
                                    <tr key={index} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="p-3 align-top">
                                            <div className="flex flex-col gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Select Project..."
                                                    className="input-field text-xs"
                                                    style={{ padding: '0.4rem 0.75rem' }}
                                                    value={entry.project || ''}
                                                    onChange={e => handleChange(index, 'project', e.target.value)}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Task description..."
                                                    className="w-full bg-transparent border-0 border-b border-slate-200 focus:border-blue-500 focus:ring-0 text-sm px-1 py-1"
                                                    value={entry.taskName || ''}
                                                    onChange={e => handleChange(index, 'taskName', e.target.value)}
                                                />
                                            </div>
                                        </td>
                                        {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day, i) => (
                                            <td key={day} className={`p-2 align-middle text-center ${i > 4 ? 'bg-slate-50/30' : ''}`}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="24"
                                                    step="0.5"
                                                    className={`w-12 h-9 text-center rounded border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none font-mono text-sm
                                                        ${entry[day] > 0 ? 'bg-white font-bold text-slate-800' : 'bg-transparent text-slate-400'}
                                                    `}
                                                    value={entry[day] === 0 ? '' : entry[day]}
                                                    placeholder="-"
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={e => handleChange(index, day, e.target.value)}
                                                />
                                            </td>
                                        ))}
                                        <td className="p-3 align-middle text-center bg-slate-50/30">
                                            <span className="font-mono font-bold text-slate-700">{entry.total.toFixed(2)}</span>
                                        </td>
                                        <td className="p-2 text-center">
                                            <button
                                                onClick={() => handleDeleteRow(index)}
                                                className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {entries.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="py-12">
                                            <div className="flex flex-col items-center justify-center text-slate-400 opacity-70">
                                                <span className="text-4xl mb-3">📝</span>
                                                <p className="font-medium">No tasks tracked this week</p>
                                                <p className="text-sm">Add a task to start tracking time</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-50/80 border-t border-slate-200 font-bold text-slate-700 text-sm">
                                    <td className="p-4 text-right uppercase text-xs text-slate-500 tracking-wider">Weekly Total</td>
                                    <td className="p-2 text-center font-mono">{totals.mon.toFixed(2)}</td>
                                    <td className="p-2 text-center font-mono">{totals.tue.toFixed(2)}</td>
                                    <td className="p-2 text-center font-mono">{totals.wed.toFixed(2)}</td>
                                    <td className="p-2 text-center font-mono">{totals.thu.toFixed(2)}</td>
                                    <td className="p-2 text-center font-mono">{totals.fri.toFixed(2)}</td>
                                    <td className="p-2 text-center font-mono text-slate-500">{totals.sat.toFixed(2)}</td>
                                    <td className="p-2 text-center font-mono text-slate-500">{totals.sun.toFixed(2)}</td>
                                    <td className="p-2 text-center font-mono bg-blue-600 text-white shadow-sm">{totals.total.toFixed(2)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                    <button
                        onClick={handleAddRow}
                        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                        <span>+</span> Add New Task
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Timesheets;
