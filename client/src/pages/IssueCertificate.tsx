import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const IssueCertificate: React.FC = () => {
    useAuth(); // Token unused by api service but kept for context
    const [formData, setFormData] = useState({
        userId: '',
        title: '',
        type: 'Employment'
    });
    const [link, setLink] = useState('');
    const [qrCode, setQrCode] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = await api.post<{ verificationLink: string; qrCodeDataUrl: string }>('/certificates/issue', formData);
            if (data && data.verificationLink) {
                setLink(data.verificationLink);
                setQrCode(data.qrCodeDataUrl);
            } else {
                alert('Failed to issue certificate');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to issue certificate');
        }
    };

    return (
        <div className="page-container">
            <h1 className="mb-6">Issue Digital Certificate</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-panel p-8">
                    <h3 className="mb-6 font-bold text-lg">Certificate Details</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="userId" className="block text-sm font-medium mb-1">User ID / ID</label>
                            <input id="userId" name="userId" placeholder="Enter Employee UUID" className="input-field" onChange={handleChange} required />
                        </div>

                        <div>
                            <label htmlFor="title" className="block text-sm font-medium mb-1">Certificate Title</label>
                            <input id="title" name="title" placeholder="e.g. Internship Completion" className="input-field" onChange={handleChange} required />
                        </div>

                        <div>
                            <label htmlFor="type" className="block text-sm font-medium mb-1">Certificate Type</label>
                            <select id="type" name="type" className="input-field" onChange={handleChange}>
                                <option value="Employment">Employment</option>
                                <option value="Internship">Internship</option>
                                <option value="Excellence">Award of Excellence</option>
                                <option value="Training">Training Completion</option>
                            </select>
                        </div>
                        <button type="submit" className="btn-primary w-full py-4 mt-4 font-bold">Generate Digital Certificate</button>
                    </form>
                </div>

                <div className="flex flex-col gap-6">
                    {link ? (
                        <div className="glass-panel p-8 border-2 border-emerald-500/20 text-center animate-fade-in">
                            <div className="bg-emerald-500/10 text-emerald-600 px-4 py-2 rounded-full text-xs font-bold inline-block mb-4">
                                CERTIFICATE ISSUED SUCCESSFULLY
                            </div>
                            <div className="mb-6 flex justify-center">
                                {qrCode && <img src={qrCode} alt="Verification QR Code" className="w-48 h-48 border-4 border-white shadow-xl rounded-xl" />}
                            </div>
                            <p className="text-sm font-medium mb-2 text-[var(--text-muted)]">Verification Link</p>
                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[var(--primary)] break-all hover:underline">{link}</a>

                            <div className="mt-8 flex gap-3">
                                <button className="btn-secondary flex-1" onClick={() => { setLink(''); setQrCode(''); }}>Issue Another</button>
                                <button className="btn-primary flex-1" onClick={() => window.print()}>Print / Save</button>
                            </div>
                        </div>
                    ) : (
                        <div className="glass-panel p-8 flex flex-col items-center justify-center text-center py-20 grayscale opacity-50">
                            <div className="w-20 h-20 bg-[var(--bg-body)] rounded-full flex items-center justify-center mb-6">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 8h16" />
                                </svg>
                            </div>
                            <p className="text-[var(--text-muted)]">Preview will appear here after issuance</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IssueCertificate;
