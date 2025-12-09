import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Payslips: React.FC = () => {
    const { token, user } = useAuth();
    const [payslips, setPayslips] = useState<any[]>([]);
    const [uploadData, setUploadData] = useState({
        userId: '',
        month: '',
        year: new Date().getFullYear().toString(),
        gross: '',
        net: ''
    });
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        fetchPayslips();
    }, []);

    const fetchPayslips = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/payslips/my-payslips', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setPayslips(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append('userId', uploadData.userId);
        formData.append('month', uploadData.month);
        formData.append('year', uploadData.year);
        formData.append('gross', uploadData.gross);
        formData.append('net', uploadData.net);
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:5000/api/payslips/upload', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }, // FormData doesn't need Content-Type header manually set
                body: formData
            });
            if (response.ok) {
                alert('Payslip uploaded');
                setUploadData({ ...uploadData, userId: '', month: '', gross: '', net: '' });
                setFile(null);
            } else {
                alert('Upload failed');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUploadData({ ...uploadData, [e.target.name]: e.target.value });
    };

    return (
        <div className="page-container">
            <h1>My Payslips</h1>
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem' }}>
                {payslips.length === 0 ? <p>No payslips found</p> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                        {payslips.map(p => (
                            <div key={p.id} style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px' }}>
                                <p><strong>{p.month}/{p.year}</strong></p>
                                <p>Net: ${p.net}</p>
                                <a href={`http://localhost:5000/${p.url}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-light)' }}>Download PDF</a>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
                    <h2>Upload Payslip (HR Only)</h2>
                    <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
                        <input name="userId" placeholder="User ID" className="input-field" onChange={handleChange} required />
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <input name="month" placeholder="Month (1-12)" className="input-field" type="number" onChange={handleChange} required />
                            <input name="year" placeholder="Year" className="input-field" type="number" value={uploadData.year} onChange={handleChange} required />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <input name="gross" placeholder="Gross Salary" className="input-field" type="number" onChange={handleChange} required />
                            <input name="net" placeholder="Net Salary" className="input-field" type="number" onChange={handleChange} required />
                        </div>
                        <input type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} required />
                        <button type="submit" className="btn-primary">Upload</button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Payslips;
