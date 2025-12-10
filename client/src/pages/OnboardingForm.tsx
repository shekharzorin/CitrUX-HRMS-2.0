import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const OnboardingForm: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState('PENDING');
    const [tasks, setTasks] = useState<any[]>([]);
    const [bankData, setBankData] = useState({
        accountNumber: '',
        ifsc: '',
        bankName: ''
    });

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/onboarding/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStatus(data.status);
                setTasks(data.tasks || []);
                if (data.bankDetails) setBankData(JSON.parse(data.bankDetails));
            }
        } catch (error) { console.error(error); }
    };

    const handleTaskToggle = async (taskId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'PENDING' ? 'COMPLETED' : 'PENDING';
            const res = await fetch('http://localhost:5000/api/onboarding/task/status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ taskId, status: newStatus })
            });
            if (res.ok) fetchStatus();
        } catch (error) { console.error(error); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/onboarding/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ bankDetails: JSON.stringify(bankData) })
            });
            if (res.ok) {
                alert('Onboarding Submitted');
                fetchStatus();
            }
        } catch (error) { console.error(error); }
    };

    if (status === 'APPROVED') {
        return (
            <div className="p-6 text-center">
                <div className="bg-green-100 text-green-700 p-8 rounded-xl inline-block">
                    <h1 className="text-2xl font-bold mb-2">🎉 Onboarding Complete!</h1>
                    <p>You are officially onboarded. Welcome to the team!</p>
                    <button onClick={() => navigate('/')} className="mt-4 btn-primary">Go to Dashboard</button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Employee Onboarding</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Task Checklist */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-semibold mb-4">Your Checklist</h2>
                    <div className="space-y-3">
                        {tasks.map(t => (
                            <div key={t.id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all
                                ${t.status === 'COMPLETED' ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                                onClick={() => handleTaskToggle(t.id, t.status)}>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3
                                    ${t.status === 'COMPLETED' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`}>
                                    {t.status === 'COMPLETED' && '✓'}
                                </div>
                                <span className={t.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-700'}>
                                    {t.title}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Submission Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-semibold mb-4">Final Submission</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                            <input type="text" className="input-field"
                                value={bankData.bankName} onChange={e => setBankData({ ...bankData, bankName: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                            <input type="text" className="input-field"
                                value={bankData.accountNumber} onChange={e => setBankData({ ...bankData, accountNumber: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code</label>
                            <input type="text" className="input-field"
                                value={bankData.ifsc} onChange={e => setBankData({ ...bankData, ifsc: e.target.value })} />
                        </div>

                        <div className="pt-4">
                            <button type="submit" className="btn-primary w-full" disabled={status === 'SUBMITTED'}>
                                {status === 'SUBMITTED' ? 'Submitted (Waiting Approval)' : 'Submit Details'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default OnboardingForm;
