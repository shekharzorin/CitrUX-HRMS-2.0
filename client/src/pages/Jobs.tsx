import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Jobs: React.FC = () => {
    const { token, user } = useAuth();
    const [jobs, setJobs] = useState<any[]>([]);
    const [title, setTitle] = useState('');
    const [department, setDepartment] = useState('');
    const [description, setDescription] = useState('');
    const [showApply, setShowApply] = useState<string | null>(null);
    const [application, setApplication] = useState({ name: '', email: '', phone: '', resumeUrl: '' });

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/recruitment/jobs');
            if (res.ok) setJobs(await res.json());
        } catch (error) { console.error(error); }
    };

    const handlePostJob = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/recruitment/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ title, department, description })
            });
            if (res.ok) {
                fetchJobs();
                setTitle(''); setDepartment(''); setDescription('');
            }
        } catch (error) { console.error(error); }
    };

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/recruitment/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: showApply, applicantName: application.name, email: application.email, phone: application.phone, resumeUrl: application.resumeUrl })
            });
            if (res.ok) {
                alert('Application Submitted!');
                setShowApply(null);
                setApplication({ name: '', email: '', phone: '', resumeUrl: '' });
            }
        } catch (error) { console.error(error); }
    };

    return (
        <div className="p-6 space-y-8">
            <h1 className="text-2xl font-bold text-slate-800">Careers & Job Openings</h1>

            {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold mb-4">Post a New Job</h2>
                    <form onSubmit={handlePostJob} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="text" placeholder="Job Title" className="input-field" value={title} onChange={e => setTitle(e.target.value)} required />
                        <input type="text" placeholder="Department" className="input-field" value={department} onChange={e => setDepartment(e.target.value)} required />
                        <input type="text" placeholder="Description" className="input-field md:col-span-3" value={description} onChange={e => setDescription(e.target.value)} required />
                        <button type="submit" className="btn-primary md:col-span-1">Post Job</button>
                    </form>
                </div>
            )}

            <div className="grid gap-4">
                {jobs.map(job => (
                    <div key={job.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">{job.title}</h3>
                                <div className="text-sm text-slate-500 mb-2">{job.department}</div>
                                <p className="text-slate-600">{job.description}</p>
                            </div>
                            <button onClick={() => setShowApply(job.id)} className="btn-primary">Apply Now</button>
                        </div>

                        {showApply === job.id && (
                            <form onSubmit={handleApply} className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <h4 className="font-bold mb-2">Apply for {job.title}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <input type="text" placeholder="Full Name" className="input-field" value={application.name} onChange={e => setApplication({ ...application, name: e.target.value })} required />
                                    <input type="email" placeholder="Email" className="input-field" value={application.email} onChange={e => setApplication({ ...application, email: e.target.value })} required />
                                    <input type="text" placeholder="Phone" className="input-field" value={application.phone} onChange={e => setApplication({ ...application, phone: e.target.value })} required />
                                    <input type="text" placeholder="Resume URL (Link)" className="input-field" value={application.resumeUrl} onChange={e => setApplication({ ...application, resumeUrl: e.target.value })} />
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" className="btn-primary">Submit Application</button>
                                    <button type="button" onClick={() => setShowApply(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">Cancel</button>
                                </div>
                            </form>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Jobs;
