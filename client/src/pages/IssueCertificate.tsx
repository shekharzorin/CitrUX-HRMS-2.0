import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const IssueCertificate: React.FC = () => {
    const { token } = useAuth();
    const [formData, setFormData] = useState({
        userId: '',
        title: '',
        type: 'Employment'
    });
    const [link, setLink] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/api/certificates/issue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (response.ok) {
                setLink(data.verificationLink);
                alert('Certificate Issued!');
            } else {
                alert('Failed to issue certificate');
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="page-container">
            <h1>Issue Certificate</h1>
            <div className="glass-panel" style={{ padding: '2rem', maxWidth: '500px' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input name="userId" placeholder="User ID" className="input-field" onChange={handleChange} required />
                    <input name="title" placeholder="Certificate Title (e.g. Internship Completion)" className="input-field" onChange={handleChange} required />
                    <select name="type" className="input-field" onChange={handleChange}>
                        <option value="Employment">Employment</option>
                        <option value="Internship">Internship</option>
                    </select>
                    <button type="submit" className="btn-primary">Issue</button>
                </form>
                {link && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: '8px' }}>
                        <p>Verification Link:</p>
                        <a href={link} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all', color: 'var(--primary-light)' }}>{link}</a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IssueCertificate;
