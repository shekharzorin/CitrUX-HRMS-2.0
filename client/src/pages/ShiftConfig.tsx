import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const ShiftConfig: React.FC<{ embedded?: boolean }> = ({ embedded }) => {
    const { token: _token } = useAuth(); // Token unused by api service but kept for context
    const [shifts, setShifts] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        startTime: '09:00',
        endTime: '18:00',
        graceTime: 15
    });

    useEffect(() => {
        fetchShifts();
    }, []);

    const fetchShifts = async () => {
        try {
            const data = await api.get<any[]>('/shifts');
            setShifts(data || []);
        } catch (error) {
            console.error(error);
        }
    };

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
        <div className={embedded ? "" : "p-6"}>
            {!embedded && <h1 className="text-2xl font-bold mb-6 text-slate-800">Shift Configuration</h1>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-semibold mb-4">Create New Shift</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="shiftName" className="block text-sm font-medium text-slate-700 mb-1">Shift Name</label>
                            <input id="shiftName" type="text" className="input-field" placeholder="e.g. General Shift"
                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="startTime" className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                                <input id="startTime" type="time" className="input-field"
                                    value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} required />
                            </div>
                            <div>
                                <label htmlFor="endTime" className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                                <input id="endTime" type="time" className="input-field"
                                    value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} required />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="graceTime" className="block text-sm font-medium text-slate-700 mb-1">Grace Time (Minutes)</label>
                            <input id="graceTime" type="number" className="input-field"
                                value={formData.graceTime} onChange={e => setFormData({ ...formData, graceTime: parseInt(e.target.value) })} required />
                        </div>
                        <button type="submit" className="btn-primary w-full">Create Shift</button>
                    </form>
                </div>

                {/* List */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Existing Shifts</h2>
                    {shifts.map(shift => (
                        <div key={shift.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-slate-800">{shift.name}</h3>
                                <p className="text-sm text-slate-500">
                                    {shift.startTime} - {shift.endTime} (Grace: {shift.graceTime}m)
                                </p>
                            </div>
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Active</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ShiftConfig;
