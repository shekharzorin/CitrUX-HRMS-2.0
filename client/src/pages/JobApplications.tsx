import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const JobApplications: React.FC = () => {
    const { token } = useAuth();
    const [apps, setApps] = useState<any[]>([]);

    const fetchApps = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/recruitment/applications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setApps(await res.json());
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        const init = async () => { await fetchApps(); };
        init();
    }, []);

    const handleStatus = async (id: string, status: string) => {
        try {
            const res = await fetch(`http://localhost:5000/api/recruitment/applications/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status })
            });
            if (res.ok) fetchApps();
        } catch (error) { console.error(error); }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Applicant Tracking System (ATS)</h1>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-4 text-sm font-semibold text-slate-600">Candidate</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Applied For</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Contact</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {apps.map(app => (
                            <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-4">
                                    <div className="font-bold text-slate-800">{app.applicantName}</div>
                                    {app.resumeUrl && <a href={app.resumeUrl} target="_blank" className="text-xs text-blue-600 hover:underline">View Resume</a>}
                                </td>
                                <td className="p-4">
                                    <div className="text-sm font-medium">{app.job?.title}</div>
                                    <div className="text-xs text-slate-500">{app.job?.department}</div>
                                </td>
                                <td className="p-4 text-sm text-slate-600">
                                    <div>{app.email}</div>
                                    <div>{app.phone}</div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold 
                                        ${app.status === 'NEW' ? 'bg-blue-100 text-blue-700' :
                                            app.status === 'HIRED' ? 'bg-green-100 text-green-700' :
                                                app.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {app.status}
                                    </span>
                                </td>
                                <td className="p-4 flex gap-2">
                                    {app.status !== 'HIRED' && app.status !== 'REJECTED' && (
                                        <>
                                            <button onClick={() => handleStatus(app.id, 'INTERVIEW')} className="text-xs bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded">Interview</button>
                                            <button onClick={() => handleStatus(app.id, 'HIRED')} className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded">Hire</button>
                                            <button onClick={() => handleStatus(app.id, 'REJECTED')} className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded">Reject</button>
                                        </>
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

export default JobApplications;
