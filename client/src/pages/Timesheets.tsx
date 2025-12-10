import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Timesheets: React.FC = () => {
    const { token } = useAuth();
    const [attendance, setAttendance] = useState<any[]>([]);

    useEffect(() => {
        fetchAttendance();
    }, []);

    const fetchAttendance = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/attendance', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setAttendance(await res.json());
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">My Timesheet</h1>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Check In</th>
                            <th className="p-4">Check Out</th>
                            <th className="p-4">Work Hours</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Late?</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {attendance.map((record) => (
                            <tr key={record.id} className="hover:bg-slate-50">
                                <td className="p-4 font-medium text-slate-800">
                                    {new Date(record.date).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-slate-600">
                                    {record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-'}
                                </td>
                                <td className="p-4 text-slate-600">
                                    {record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}
                                </td>
                                <td className="p-4 text-slate-600 font-mono">
                                    {record.hours ? `${record.hours.toFixed(2)} hrs` : '-'}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                        ${record.status === 'PRESENT' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {record.status}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {record.isLate && (
                                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">Late</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Timesheets;
