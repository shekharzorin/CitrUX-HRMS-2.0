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

                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p><strong>Name:</strong> {o.firstName} {o.lastName}</p>
                                        <p><strong>Father's Name:</strong> {o.fatherName}</p>
                                        <p><strong>DOB:</strong> {o.dateOfBirth ? new Date(o.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                                        <p><strong>PAN:</strong> {o.panNumber}</p>
                                        <p><strong>Aadhaar:</strong> {o.aadhaarNumber}</p>
                                    </div>
                                    <div>
                                        <p><strong>Current Address:</strong> {o.currAddress}</p>
                                        <p><strong>Permanent Address:</strong> {o.permAddress}</p>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {o.aadhaarUrl && <a href={o.aadhaarUrl} target="_blank" className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 hover:underline">📄 Aadhaar</a>}
                                    {o.panUrl && <a href={o.panUrl} target="_blank" className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 hover:underline">📄 PAN</a>}
                                    {o.passbookUrl && <a href={o.passbookUrl} target="_blank" className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 hover:underline">📄 Passbook</a>}
                                    {o.offerLetterUrl && <a href={o.offerLetterUrl} target="_blank" className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 hover:underline">📄 Signed Offer</a>}
                                </div>

                                {o.bankDetails && (
                                    <div className="mt-4 bg-slate-50 p-3 rounded">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase">Bank Details</h4>
                                        <pre className="text-sm mt-1 overflow-auto whitespace-pre-wrap">{JSON.stringify(JSON.parse(o.bankDetails), null, 2)}</pre>
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
