import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const OnboardingForm: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [resumeUrl, setResumeUrl] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [ifsc, setIfsc] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/api/onboarding/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    documents: { resume: resumeUrl },
                    bankDetails: { bankName, accountNumber, ifsc }
                })
            });

            if (response.ok) {
                alert('Onboarding Submitted Successfully');
                navigate('/');
            } else {
                const data = await response.json();
                alert(data.message || 'Submission failed');
            }
        } catch (error) {
            console.error(error);
            alert('Error connecting to server');
        }
    };

    return (
        <div className="page-container">
            <h1>Onboarding Submission</h1>
            <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3>Documents</h3>
                    <div>
                        <label>Resume URL (Google Drive/Dropbox link)</label>
                        <input
                            className="input-field"
                            value={resumeUrl}
                            onChange={(e) => setResumeUrl(e.target.value)}
                            required
                        />
                    </div>

                    <h3>Bank Details</h3>
                    <div>
                        <label>Bank Name</label>
                        <input
                            className="input-field"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label>Account Number</label>
                        <input
                            className="input-field"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label>IFSC Code</label>
                        <input
                            className="input-field"
                            value={ifsc}
                            onChange={(e) => setIfsc(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Submit Details</button>
                </form>
            </div>
        </div>
    );
};

export default OnboardingForm;
