import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const OnboardingList: React.FC = () => {
    const { token } = useAuth();
    const [onboardings, setOnboardings] = useState<any[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        fetchOnboardings();
    }, []);

    const fetchOnboardings = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/onboarding/pending', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setOnboardings(await res.json());
        } catch (error) { console.error(error); }
    };

    const handleApprove = async (id: string) => {
        if (!window.confirm('Confirm approval? This will generate the employee profile.')) return;
        try {
            const res = await fetch(`http://localhost:5000/api/onboarding/${id}/approve`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Onboarding Approved');
                fetchOnboardings();
            }
        } catch (error) { console.error(error); }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Onboarding Approvals</h1>

            <div className="grid gap-4">
                {onboardings.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No pending approvals.</p>}

                {onboardings.map(o => (
                    <div key={o.id} className="glass-panel">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>
                                    {o.fullName || 'Unknown'} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({o.user?.email})</span>
                                </h3>
                                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Submitted: {o.submittedAt ? new Date(o.submittedAt).toLocaleDateString() : 'N/A'}</p>

                                <button onClick={() => setExpandedId(expandedId === o.id ? null : o.id)} style={{ color: 'var(--primary)', fontSize: '0.875rem', marginTop: '0.5rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
                                    {expandedId === o.id ? 'Hide Details' : 'View Full Application'}
                                </button>

                                {expandedId === o.id && (
                                    <div className="mt-4 space-y-4 text-sm pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="font-semibold">Personal</p>
                                                <p>DOB: {o.dateOfBirth}</p>
                                                <p>Mobile: {o.personalMobile}</p>
                                                <p>Addr: {o.currentAddress}</p>
                                            </div>
                                            <div>
                                                <p className="font-semibold">Professional</p>
                                                <p>Dept: {o.department}</p>
                                                <p>Role: {o.designation}</p>
                                            </div>
                                        </div>

                                        {o.experiences?.length > 0 && (
                                            <div>
                                                <p className="font-semibold">Experience</p>
                                                <ul className="list-disc pl-4" style={{ color: 'var(--text-muted)' }}>
                                                    {o.experiences.map((e: any, i: number) => (
                                                        <li key={i}>{e.designation} at {e.companyName} ({e.startDate ? e.startDate.split('T')[0] : ''} - {e.endDate ? e.endDate.split('T')[0] : 'Present'})</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {o.documents?.length > 0 && (
                                            <div>
                                                <p className="font-semibold">Documents</p>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {o.documents.map((d: any, i: number) => (
                                                        <a key={i} href={d.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', background: 'var(--bg-body)', color: 'var(--primary)', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                                                            📄 {d.type}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => handleApprove(o.id)} className="btn btn-success">
                                    Approve & Onboard
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OnboardingList;
