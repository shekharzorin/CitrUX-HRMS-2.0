import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AttendanceRecord {
    id: string;
    date: string;
    checkIn: string;
    checkOut?: string;
    hours?: number;
}

const Attendance: React.FC = () => {
    const { token } = useAuth();
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/attendance/my-history', {
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

    const handlePunchIn = async () => {
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
                setMessage('Punched In successfully!');
                fetchHistory();
            } else {
                setMessage(data.message || 'Punch In failed');
            }
        } catch (error) {
            setMessage('Error connecting to server');
        }
    };

    const handlePunchOut = async () => {
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
                setMessage('Punched Out successfully!');
                fetchHistory();
            } else {
                setMessage(data.message || 'Punch Out failed');
            }
        } catch (error) {
            setMessage('Error connecting to server');
        }
    };

    return (
        <div className="page-container">
            <h1>Daily Attendance</h1>

            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                <h2>Today's Action</h2>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                    <button onClick={handlePunchIn} className="btn-primary" style={{ background: 'var(--secondary)' }}>Punch In</button>
                    <button onClick={handlePunchOut} className="btn-primary" style={{ background: '#f59e0b' }}>Punch Out</button>
                </div>
                {message && <p style={{ marginTop: '1rem', color: 'var(--primary-light)' }}>{message}</p>}
            </div>

            <div className="glass-panel" style={{ padding: '1rem' }}>
                <h3>History</h3>
                {loading ? <p>Loading...</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text)' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem' }}>Date</th>
                                <th style={{ padding: '1rem' }}>Check In</th>
                                <th style={{ padding: '1rem' }}>Check Out</th>
                                <th style={{ padding: '1rem' }}>Hours</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(record => (
                                <tr key={record.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem' }}>{new Date(record.date).toLocaleDateString()}</td>
                                    <td style={{ padding: '1rem' }}>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-'}</td>
                                    <td style={{ padding: '1rem' }}>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}</td>
                                    <td style={{ padding: '1rem' }}>{record.hours ? record.hours.toFixed(2) : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Attendance;
