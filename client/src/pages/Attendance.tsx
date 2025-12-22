import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

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
        profile?: {
            firstName: string;
            lastName: string;
            designation?: string;
            department?: string;
        };
    };
}

const Attendance: React.FC = () => {
    const { token, user } = useAuth();
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
            const endpoint = canViewAll ? 'http://localhost:5000/api/attendance/all' : 'http://localhost:5000/api/attendance/my-history';
            const response = await fetch(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
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
            const response = await fetch('http://localhost:5000/api/attendance/punch-in', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ location: 'Office' })
            });
            const data = await response.json();
            if (response.ok) {
                setMessage('Clocked In successfully!');
                fetchHistory();
            } else {
                setMessage(data.message || 'Clock In failed');
            }
        } catch (error) {
            setMessage('Error connecting to server');
        }
    };

    const handleClockOut = async () => {
        setMessage('');
        try {
            const response = await fetch('http://localhost:5000/api/attendance/punch-out', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({})
            });
            const data = await response.json();
            if (response.ok) {
                setMessage('Clocked Out successfully!');
                fetchHistory();
            } else {
                setMessage(data.message || 'Clock Out failed');
            }
        } catch (error) {
            setMessage('Error connecting to server');
        }
    };

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>{canViewAll ? 'Attendance Overview' : 'Daily Attendance'}</h1>
            </div>

            {user && !isSuperAdmin && (
                <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '250px' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                                {user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}` : user.email}
                            </h2>
                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                                {user.profile?.designation || user.role} {user.profile?.department && ` • ${user.profile.department}`}
                            </p>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: '200px' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Employee ID</div>
                            <div style={{ fontFamily: 'monospace', fontSize: '1rem', background: 'var(--bg-body)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', color: 'var(--text-main)', minWidth: '120px', textAlign: 'center' }}>
                                {user.employeeId || 'NA'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!isSuperAdmin && (
                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                    <h2>Today's Action</h2>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                        <button onClick={handleClockIn} className="btn-primary" style={{ background: 'var(--success)', boxShadow: 'none' }}>Clock In</button>
                        <button onClick={handleClockOut} className="btn-primary" style={{ background: 'var(--warning)', boxShadow: 'none' }}>Clock Out</button>
                    </div>
                    {message && <p style={{ marginTop: '1rem', color: 'var(--text-main)' }}>{message}</p>}
                </div>
            )}

            <div className="glass-panel" style={{ padding: '1rem' }}>
                <h3>{canViewAll ? 'All Employee Records' : 'History'}</h3>
                {loading ? <p>Loading...</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-main)' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                {canViewAll && (
                                    <>
                                        <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Employee</th>
                                        <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Emp ID</th>
                                    </>
                                )}
                                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Date</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Check In</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Check Out</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Hours</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(record => (
                                <tr key={record.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    {canViewAll && (
                                        <>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: 500 }}>
                                                    {record.user?.profile?.firstName
                                                        ? `${record.user.profile.firstName} ${record.user.profile.lastName || ''}`
                                                        : record.user?.email}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {record.user?.profile?.designation || record.user?.role}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                                {record.user?.employeeId || 'NA'}
                                            </td>
                                        </>
                                    )}
                                    <td style={{ padding: '1rem' }}>{new Date(record.date).toLocaleDateString()}</td>
                                    <td style={{ padding: '1rem' }}>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-'}</td>
                                    <td style={{ padding: '1rem' }}>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}</td>
                                    <td style={{ padding: '1rem' }}>{record.hours ? record.hours.toFixed(2) : '-'}</td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan={canViewAll ? 6 : 4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
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
