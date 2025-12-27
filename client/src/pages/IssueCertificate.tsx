import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const IssueCertificate: React.FC = () => {
    const { } = useAuth(); // Token unused by api service but kept for context
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
            const data = await api.post<{ verificationLink: string }>('/certificates/issue', formData);
            if (data && data.verificationLink) {
                setLink(data.verificationLink);
                alert('Certificate Issued!');
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
            <h1>Issue Certificate</h1>
            <div className="glass-panel issue-card">
                <form onSubmit={handleSubmit} className="issue-form">
                    <label htmlFor="userId" className="sr-only">User ID</label>
                    <input id="userId" name="userId" placeholder="User ID" className="input-field" onChange={handleChange} required />

                    <label htmlFor="title" className="sr-only">Certificate Title</label>
                    <input id="title" name="title" placeholder="Certificate Title (e.g. Internship Completion)" className="input-field" onChange={handleChange} required />

                    <label htmlFor="type" className="sr-only">Certificate Type</label>
                    <select id="type" name="type" className="input-field" onChange={handleChange} title="Certificate Type">
                        <option value="Employment">Employment</option>
                        <option value="Internship">Internship</option>
                    </select>
                    <button type="submit" className="btn-primary">Issue</button>
                </form>
                {link && (
                    <div className="verification-container">
                        <p>Verification Link:</p>
                        <a href={link} target="_blank" rel="noopener noreferrer" className="verification-link">{link}</a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IssueCertificate;
