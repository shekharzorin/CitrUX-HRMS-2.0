import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

interface AttendanceRecord {
    id: string;
    date: string;
    checkIn: string;
    checkOut?: string;
    hours?: number;
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
        };
    };
}

const Attendance: React.FC = () => {
    const { user } = useAuth(); // Token unused by api service but kept for context if needed
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const canViewAll = user?.role === 'ADMIN' || user?.role === 'HR';
    const isSuperAdmin = user?.role === 'ADMIN';

    useEffect(() => {
        fetchHistory();
    }, [user]);

    const fetchHistory = async () => {
        if (!user) return;
        try {
            const endpoint = canViewAll ? '/attendance/all' : '/attendance/my-history';
            const data = await api.get<AttendanceRecord[]>(endpoint);
            setHistory(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleClockIn = async () => {
        setMessage('');
        try {
            // Mock location for now
            await api.post('/attendance/punch-in', { location: 'Office' });
            setMessage('Clocked In successfully!');
            fetchHistory();
        } catch (error: any) {
            setMessage(error.message || 'Clock In failed');
        }
    };

    const handleClockOut = async () => {
        setMessage('');
        try {
            await api.post('/attendance/punch-out', {});
            setMessage('Clocked Out successfully!');
            fetchHistory();
        } catch (error: any) {
            setMessage(error.message || 'Clock Out failed');
        }
    };

    return (
        <div className="page-container">

            {/* Header removed as it is now in Layout.tsx */}
            {/* <div className="attendance-header">
                <h1>{canViewAll ? 'Attendance Overview' : 'Daily Attendance'}</h1>
            </div> */}


            {user && !isSuperAdmin && (
                <div className="glass-panel profile-summary-card">
                    <div className="profile-summary-content">
                        <div className="profile-details">
                            <h2 className="profile-name">
                                {user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}` : user.email}
                            </h2>
                            <p className="profile-role">
                                {user.profile?.designation || user.role} {user.profile?.department && ` • ${user.profile.department}`}
                            </p>
                        </div>
                        <div className="employee-id-section">
                            <div className="employee-id-label">Employee ID</div>
                            <div className="employee-id-badge">
                                {user.employeeId || 'NA'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!isSuperAdmin && (
                <div className="glass-panel action-panel">
                    <h2>Today's Action</h2>
                    <div className="action-buttons-container">
                        <button onClick={handleClockIn} className="btn-primary btn-clock-in">Clock In</button>
                        <button onClick={handleClockOut} className="btn-primary btn-clock-out">Clock Out</button>
                    </div>
                    {message && <p className="action-message">{message}</p>}
                </div>
            )}

            <div className="glass-panel records-panel">
                <h3>{canViewAll ? 'All Employee Records' : 'History'}</h3>
                {loading ? <p>Loading...</p> : (
                    <table className="attendance-table">
                        <thead>
                            <tr className="table-header-row">
                                {canViewAll && (
                                    <>
                                        <th className="table-header-cell">Employee</th>
                                        <th className="table-header-cell">Emp ID</th>
                                    </>
                                )}
                                <th className="table-header-cell">Date</th>
                                <th className="table-header-cell">Check In</th>
                                <th className="table-header-cell">Check Out</th>
                                <th className="table-header-cell">Hours</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(record => (
                                <tr key={record.id} className="table-row">
                                    {canViewAll && (
                                        <>
                                            <td className="table-cell">
                                                <div className="table-user-name">
                                                    {record.user?.profile?.firstName
                                                        ? `${record.user.profile.firstName} ${record.user.profile.lastName || ''}`
                                                        : record.user?.email}
                                                </div>
                                                <div className="table-user-role">
                                                    {record.user?.profile?.designation || record.user?.role}
                                                </div>
                                            </td>
                                            <td className="table-emp-id-cell">
                                                {record.user?.employeeId || 'NA'}
                                            </td>
                                        </>
                                    )}
                                    <td className="table-cell">{new Date(record.date).toLocaleDateString()}</td>
                                    <td className="table-cell">{record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-'}</td>
                                    <td className="table-cell">{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}</td>
                                    <td className="table-cell">{record.hours ? record.hours.toFixed(2) : '-'}</td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan={canViewAll ? 6 : 4} className="table-empty-message">
                                        No attendance records found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Attendance;
