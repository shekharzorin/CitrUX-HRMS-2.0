import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const OnboardingForm: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState('PENDING');
    const [tasks, setTasks] = useState<any[]>([]); // Need an interface for Task if strict, but any[] fixes the immediate error
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', fatherName: '', dateOfBirth: '',
        currAddress: '', permAddress: '',
        aadhaarNumber: '', panNumber: '',
        bankName: '', accountNumber: '', ifsc: '',
        aadhaarUrl: '', panUrl: '', passbookUrl: '', offerLetterUrl: '',
        educationDocumentsUrl: '', experienceDocumentsUrl: ''
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

                // Pre-fill if exists
                let bank: any = {};
                if (data.bankDetails) {
                    try { bank = JSON.parse(data.bankDetails); } catch (e) { }
                }

                setFormData({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    fatherName: data.fatherName || '',
                    dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
                    currAddress: data.currAddress || '',
                    permAddress: data.permAddress || '',
                    aadhaarNumber: data.aadhaarNumber || '',
                    panNumber: data.panNumber || '',
                    bankName: bank.bankName || '',
                    accountNumber: bank.accountNumber || '',
                    ifsc: bank.ifsc || '',
                    aadhaarUrl: data.aadhaarUrl || '',
                    panUrl: data.panUrl || '',
                    passbookUrl: data.passbookUrl || '',
                    offerLetterUrl: data.offerLetterUrl || '',
                    educationDocumentsUrl: data.educationDocumentsUrl || '',
                    experienceDocumentsUrl: data.experienceDocumentsUrl || ''
                });
            }
        } catch (error) { console.error(error); }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const res = await fetch('http://localhost:5000/api/onboarding/upload', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: uploadData
            });
            if (res.ok) {
                const { url } = await res.json();
                setFormData(prev => ({ ...prev, [fieldName]: url }));
                // Mark associated task as complete if applicable
            } else {
                alert('Upload failed');
            }
        } catch (error) { console.error(error); }
    };

    const handleTaskToggle = async (taskId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'PENDING' ? 'COMPLETED' : 'PENDING';
            await fetch('http://localhost:5000/api/onboarding/task/status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ taskId, status: newStatus })
            });
            fetchStatus();
        } catch (error) { console.error(error); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                bankDetails: JSON.stringify({
                    bankName: formData.bankName,
                    accountNumber: formData.accountNumber,
                    ifsc: formData.ifsc
                })
            };

            const res = await fetch('http://localhost:5000/api/onboarding/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert('Onboarding Submitted Successfully!');
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
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Employee Onboarding Portal</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Task Checklist */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-semibold mb-4">Action Items</h2>
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

                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                        <h3 className="font-bold text-blue-800 mb-2">Employee Handbook</h3>
                        <p className="text-sm text-blue-600 mb-4">Please read the company policies carefully.</p>
                        <a href="/handbook.pdf" target="_blank" className="block text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
                            📖 Read Handbook
                        </a>
                    </div>
                </div>

                {/* Right: Detailed Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-8">

                        {/* 1. Personal Details */}
                        <section>
                            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Personal Details</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">First Name</label>
                                    <input type="text" className="input-field" required
                                        value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">Last Name</label>
                                    <input type="text" className="input-field" required
                                        value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">Father's Name</label>
                                    <input type="text" className="input-field" required
                                        value={formData.fatherName} onChange={e => setFormData({ ...formData, fatherName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">Date of Birth</label>
                                    <input type="date" className="input-field" required
                                        value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="label">Current Address</label>
                                    <textarea className="input-field" rows={2} required
                                        value={formData.currAddress} onChange={e => setFormData({ ...formData, currAddress: e.target.value })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="label">Permanent Address</label>
                                    <textarea className="input-field" rows={2} required
                                        value={formData.permAddress} onChange={e => setFormData({ ...formData, permAddress: e.target.value })} />
                                </div>
                            </div>
                        </section>

                        {/* 2. Identity & Documents */}
                        <section>
                            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Identity & Documents</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="label">Aadhaar Number</label>
                                    <input type="text" className="input-field mb-2" required
                                        value={formData.aadhaarNumber} onChange={e => setFormData({ ...formData, aadhaarNumber: e.target.value })} />
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Upload Aadhaar (PDF/JPG)</label>
                                    <input type="file" className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        onChange={(e) => handleFileUpload(e, 'aadhaarUrl')} />
                                    {formData.aadhaarUrl && <span className="text-xs text-green-600 ml-2">✓ Uploaded</span>}
                                </div>
                                <div>
                                    <label className="label">PAN Number</label>
                                    <input type="text" className="input-field mb-2" required
                                        value={formData.panNumber} onChange={e => setFormData({ ...formData, panNumber: e.target.value })} />
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Upload PAN (PDF/JPG)</label>
                                    <input type="file" className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        onChange={(e) => handleFileUpload(e, 'panUrl')} />
                                    {formData.panUrl && <span className="text-xs text-green-600 ml-2">✓ Uploaded</span>}
                                </div>
                            </div>
                        </section>

                        {/* 3. Bank Details */}
                        <section>
                            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Bank Details</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="label">Bank Name</label>
                                    <input type="text" className="input-field" required
                                        value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">Account Number</label>
                                    <input type="text" className="input-field" required
                                        value={formData.accountNumber} onChange={e => setFormData({ ...formData, accountNumber: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">IFSC Code</label>
                                    <input type="text" className="input-field" required
                                        value={formData.ifsc} onChange={e => setFormData({ ...formData, ifsc: e.target.value })} />
                                </div>
                                <div className="md:col-span-3 mt-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Upload Passbook / Cancelled Cheque</label>
                                    <input type="file" className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        onChange={(e) => handleFileUpload(e, 'passbookUrl')} />
                                    {formData.passbookUrl && <span className="text-xs text-green-600 ml-2">✓ Uploaded</span>}
                                </div>
                            </div>
                        </section>

                        {/* 4. Education & Experience */}
                        <section>
                            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Education & Experience</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="label">Educational Documents</label>
                                    <p className="text-xs text-slate-500 mb-2">Upload consolidated marksheets or degree certificates (PDF).</p>
                                    <input type="file" className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        onChange={(e) => handleFileUpload(e, 'educationDocumentsUrl')} />
                                    {formData.educationDocumentsUrl && <span className="text-xs text-green-600 ml-2">✓ Uploaded</span>}
                                </div>
                                <div>
                                    <label className="label">Experience Documents</label>
                                    <p className="text-xs text-slate-500 mb-2">Upload relieving letters or experience certificates (PDF).</p>
                                    <input type="file" className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        onChange={(e) => handleFileUpload(e, 'experienceDocumentsUrl')} />
                                    {formData.experienceDocumentsUrl && <span className="text-xs text-green-600 ml-2">✓ Uploaded</span>}
                                </div>
                            </div>
                        </section>

                        {/* 5. Offer Letter */}
                        <section>
                            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Offer Acceptance</h2>
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-sm text-slate-600">Please download, sign, and upload your offer letter.</div>
                                    <a href="/offer_letter_template.pdf" download className="text-blue-600 text-sm font-semibold hover:underline">⬇ Download Template</a>
                                </div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Upload Signed Offer Letter</label>
                                <input type="file" className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    onChange={(e) => handleFileUpload(e, 'offerLetterUrl')} />
                                {formData.offerLetterUrl && <span className="text-xs text-green-600 ml-2">✓ Uploaded</span>}
                            </div>
                        </section>

                        <div className="pt-6 border-t">
                            <button type="submit" className="btn-primary w-full py-3 text-lg" disabled={status === 'SUBMITTED'}>
                                {status === 'SUBMITTED' ? 'Submitted (Waiting for Approval)' : 'Submit Onboarding Information'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default OnboardingForm;
