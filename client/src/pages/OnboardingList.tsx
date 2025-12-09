import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const OnboardingList: React.FC = () => {
    const { token } = useAuth();
    const [requests, setRequests] = useState<any[]>([]);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/onboarding/pending', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setRequests(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleApprove = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            const response = await fetch(`http://localhost:5000/api/onboarding/${id}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            if (response.ok) {
                fetchRequests();
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="page-container">
            <h1>Pending Onboarding Requests</h1>
            <div className="glass-panel" style={{ padding: '1rem' }}>
                {requests.length === 0 ? <p>No pending requests</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text)' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem' }}>User</th>
                                <th style={{ padding: '1rem' }}>Email</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                                <th style={{ padding: '1rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map(req => (
                                <tr key={req.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem' }}>{req.user?.profile?.firstName} {req.user?.profile?.lastName}</td>
                                    <td style={{ padding: '1rem' }}>{req.user?.email}</td>
                                    <td style={{ padding: '1rem' }}>{req.status}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <button onClick={() => handleApprove(req.id, 'APPROVED')} className="btn-primary" style={{ marginRight: '0.5rem', background: 'var(--secondary)' }}>Approve</button>
                                        <button onClick={() => handleApprove(req.id, 'REJECTED')} className="btn-primary" style={{ background: 'var(--error)' }}>Reject</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default OnboardingList;
