import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const ShiftConfig: React.FC<{ embedded?: boolean }> = ({ embedded }) => {
    useAuth(); // Token unused by api service but kept for context
    const [shifts, setShifts] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        startTime: '09:00',
        endTime: '18:00',
        graceTime: 15
    });

    const fetchShifts = async () => {
        try {
            const data = await api.get<any[]>('/shifts');
            setShifts(data || []);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        const init = async () => { await fetchShifts(); };
        init();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/shifts', formData);
            fetchShifts();
            alert('Shift Created');
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className={embedded ? "animate-fade-in" : "p-6 animate-fade-in"}>
            {!embedded && <h1 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">Shift Configuration</h1>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Form */}
                <div className="glass-panel p-6 md:p-8">
                    <h2 className="text-lg font-bold mb-6 text-slate-800 dark:text-white">Create New Shift</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="shiftName" className="form-label">Shift Name</label>
                            <input id="shiftName" type="text" className="input-field" placeholder="e.g. General Shift"
                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="startTime" className="form-label">Start Time</label>
                                <input id="startTime" type="time" className="input-field"
                                    value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} required />
                            </div>
                            <div>
                                <label htmlFor="endTime" className="form-label">End Time</label>
                                <input id="endTime" type="time" className="input-field"
                                    value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} required />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="graceTime" className="form-label">Grace Time (Minutes)</label>
                            <input id="graceTime" type="number" className="input-field"
                                value={formData.graceTime} onChange={e => setFormData({ ...formData, graceTime: parseInt(e.target.value) })} required />
                        </div>
                        <button type="submit" className="btn btn-primary w-full">Create Shift</button>
                    </form>
                </div>

                {/* List */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Existing Shifts</h2>
                    {shifts.map(shift => (
                        <div key={shift.id} className="glass-panel p-4 flex justify-between items-center group hover:border-[var(--primary)] transition-colors">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white">{shift.name}</h3>
                                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
                                    {shift.startTime} - {shift.endTime} <span className="text-slate-300 dark:text-slate-600">|</span> Grace: {shift.graceTime}m
                                </p>
                            </div>
                            <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded">Active</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ShiftConfig;
