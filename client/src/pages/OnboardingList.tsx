import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const OnboardingList: React.FC = () => {
    const { token } = useAuth();
    const [onboardings, setOnboardings] = useState<any[]>([]);

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
                {onboardings.length === 0 && <p className="text-slate-500">No pending approvals.</p>}

                {onboardings.map(o => (
                    <div key={o.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">
                                    {o.user?.profile?.firstName} <span className="text-slate-400 font-normal">({o.user?.email})</span>
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">Submitted: {new Date(o.submittedAt).toLocaleDateString()}</p>

                                {o.bankDetails && (
                                    <div className="mt-4 bg-slate-50 p-3 rounded">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase">Bank Details</h4>
                                        <pre className="text-sm mt-1 overflow-auto">{JSON.stringify(JSON.parse(o.bankDetails), null, 2)}</pre>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => handleApprove(o.id)} className="btn-primary bg-green-600 hover:bg-green-700">
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
