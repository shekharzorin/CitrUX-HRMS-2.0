import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Leaves: React.FC = () => {
    const { token, user } = useAuth();
    const [balances, setBalances] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        reason: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [balRes, reqRes, typeRes] = await Promise.all([
                fetch('http://localhost:5000/api/leaves/balances', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('http://localhost:5000/api/leaves/my-requests', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('http://localhost:5000/api/leaves/types', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            setBalances(await balRes.json());
            setRequests(await reqRes.json());
            setLeaveTypes(await typeRes.json());
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/leaves/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setShowModal(false);
                fetchData();
                alert('Leave applied successfully!');
            } else {
                const err = await res.json();
                alert(err.message);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.5rem' }}>My Leaves / Time Off</h1>
                    <p>View your balances and apply for leave.</p>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}>+ Apply Leave</button>
            </div>

            {/* Balances Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {balances.map(b => (
                    <div key={b.id} className="glass-panel" style={{ background: 'white', borderTop: `4px solid ${getColorForLeave(b.leaveType.code)}` }}>
                        <h3 style={{ fontSize: '1rem', color: '#6B7280', marginBottom: '0.5rem' }}>{b.leaveType.name}</h3>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>{b.balance}</div>
                        <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>Available Days</div>
                    </div>
                ))}
            </div>

            {/* Recent Requests */}
            <div className="glass-panel" style={{ background: 'white', padding: '0' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Leave History</h2>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#F9FAFB' }}>
                        <tr>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', color: '#6B7280' }}>Type</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', color: '#6B7280' }}>Duration</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', color: '#6B7280' }}>Days</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', color: '#6B7280' }}>Reason</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', color: '#6B7280' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.length > 0 ? requests.map(r => (
                            <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem' }}>{r.leaveType.name}</td>
                                <td style={{ padding: '1rem' }}>{new Date(r.startDate).toLocaleDateString()} - {new Date(r.endDate).toLocaleDateString()}</td>
                                <td style={{ padding: '1rem' }}>{r.days} Days</td>
                                <td style={{ padding: '1rem', color: '#6B7280' }}>{r.reason}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '999px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        background: r.status === 'APPROVED' ? '#ECFDF5' : r.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7',
                                        color: r.status === 'APPROVED' ? '#059669' : r.status === 'REJECTED' ? '#DC2626' : '#D97706'
                                    }}>
                                        {r.status}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>No leave history found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Apply Leave Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ background: 'white', width: '100%', maxWidth: '500px', padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Apply for Leave</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Leave Type</label>
                                <select
                                    className="input-field"
                                    value={formData.leaveTypeId}
                                    onChange={e => setFormData({ ...formData, leaveTypeId: e.target.value })}
                                    required
                                >
                                    <option value="">Select Type</option>
                                    {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Start Date</label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>End Date</label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Reason</label>
                                <textarea
                                    className="input-field"
                                    rows={3}
                                    value={formData.reason}
                                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                    required
                                ></textarea>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Submit Request</button>
                                <button type="button" className="btn-primary" style={{ flex: 1, background: '#F3F4F6', color: '#374151' }} onClick={() => setShowModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper for colors
const getColorForLeave = (code: string) => {
    switch (code) {
        case 'cl': return '#3B82F6'; // Blue
        case 'sl': return '#EF4444'; // Red
        case 'pl': return '#10B981'; // Green
        default: return '#6B7280'; // Gray
    }
};

export default Leaves;
