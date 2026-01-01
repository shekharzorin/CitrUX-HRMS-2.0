import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfWeek, addWeeks, subWeeks, endOfWeek } from 'date-fns';
import { Icon } from '../components/ui/Icons';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';

const Timesheets: React.FC = () => {
    const { } = useAuth(); // kept for context if needed later, or remove completely if not used.
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
            const data = await api.get<any>(`/timesheets/my?date=${dateStr}`);
            if (data) {
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
                await api.delete(`/timesheets/entry/${entry.id}`);
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
            const updated = await api.post<any>('/timesheets/save', {
                id: timesheet.id,
                entries: entries
            });

            if (updated) {
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Weekly Timesheets</h1>
                    <p className="text-slate-500 font-medium mt-2">Log your progress and manage billable hours.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <Button variant="secondary" className="px-5 h-12 shadow-sm flex items-center gap-2">
                        <Icon name="copy" size={18} /> Copy Last Week
                    </Button>
                    <Button onClick={saveChanges} variant="secondary" className="px-5 h-12 shadow-sm flex items-center gap-2" isLoading={saving}>
                        <Icon name="save" size={18} /> Save Draft
                    </Button>
                    <Button className="px-7 h-12 shadow-lg shadow-purple-200 flex items-center gap-2">
                        <Icon name="send" size={18} /> Submit for Approval
                    </Button>
                </div>
            </div>

            {/* Navigation & Stats */}
            <div className="glass-panel p-8 mb-10 border border-slate-100/50">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                    {/* Week Navigator */}
                    <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200/50">
                        <button onClick={() => setCurrentDate(subWeeks(currentDate, 1))} className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl transition-all text-slate-400 hover:text-[var(--primary)] hover:shadow-sm" title="Previous Week">
                            <Icon name="chevron_left" size={20} />
                        </button>
                        <div className="flex items-center gap-4 px-2">
                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-[var(--primary)]">
                                <Icon name="holidays" size={24} />
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Time Period</div>
                                <div className="text-slate-900 font-bold whitespace-nowrap">
                                    {format(weekStart, 'dd MMM')} - {format(weekEnd, 'dd MMM yyyy')}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl transition-all text-slate-400 hover:text-[var(--primary)] hover:shadow-sm" title="Next Week">
                            <Icon name="chevron_right" size={20} />
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-10">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Timesheet Status</span>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter mt-2 border text-center ${timesheet?.status === 'SUBMITTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                {timesheet?.status || 'Draft Stage'}
                            </span>
                        </div>
                        <div className="flex flex-col h-10 justify-between items-center px-6 border-l border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billable Hours</span>
                            <span className="font-mono font-bold text-slate-800 tracking-tight">0.00</span>
                        </div>
                        <div className="flex flex-col h-10 justify-between items-center px-6 border-l border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Hours</span>
                            <span className="font-mono font-bold text-slate-800 tracking-tight">{totals.total.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col h-12 justify-between items-center pl-10 border-l-2 border-slate-200">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Weekly Effort</span>
                            <span className="font-mono font-black text-2xl text-[var(--primary)] tracking-tighter">{totals.total.toFixed(2)} hrs</span>
                        </div>
                    </div>
                </div>

                {/* Timesheet Grid */}
                <div className="glass-panel overflow-hidden border border-slate-100/50 mb-10">
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
                                                        className="input-field text-xs h-10"
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
                                                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                    title="Delete Row"
                                                >
                                                    <Icon name="delete" size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {entries.length === 0 && (
                                        <tr>
                                            <td colSpan={10} className="py-12">
                                                <div className="flex flex-col items-center justify-center text-slate-400 py-10">
                                                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6 text-slate-200">
                                                        <Icon name="file_text" size={48} />
                                                    </div>
                                                    <p className="font-bold text-slate-800">No tasks logged this week</p>
                                                    <p className="text-sm font-medium">Click the button below to start tracking your time.</p>
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
                    <div className="p-6 bg-slate-50/50">
                        <button
                            onClick={handleAddRow}
                            className="w-full py-5 border-2 border-dashed border-slate-200 rounded-[20px] flex items-center justify-center gap-3 text-slate-500 font-bold hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-white hover:shadow-md transition-all active:scale-[0.99]"
                        >
                            <Icon name="plus" size={20} /> Add New Task Row
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Timesheets;
