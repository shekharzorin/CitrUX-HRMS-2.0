import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const Verification: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const verify = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/certificates/verify/${id}`);
                const result = await response.json();
                if (response.ok && result.valid) {
                    setData(result.certificate);
                } else {
                    setError('Invalid Certificate');
                }
            } catch (err) {
                setError('Verification Failed');
            } finally {
                setLoading(false);
            }
        };
        verify();
    }, [id]);

    if (loading) return <div className="page-container">Verifying...</div>;
    if (error) return <div className="page-container"><h1 style={{ color: 'var(--error)' }}>{error}</h1></div>;

    return (
        <div className="page-container" style={{ textAlign: 'center', marginTop: '4rem' }}>
            <div className="glass-panel" style={{ padding: '3rem', maxWidth: '600px', margin: '0 auto', border: '2px solid var(--secondary)' }}>
                <h1 style={{ color: 'var(--secondary)' }}>Verified Certificate</h1>
                <div style={{ fontSize: '1.2rem', margin: '2rem 0' }}>
                    <p>This certifies that</p>
                    <h2 style={{ fontSize: '2rem', margin: '1rem 0' }}>{data.user?.profile?.firstName} {data.user?.profile?.lastName}</h2>
                    <p>has successfully completed</p>
                    <h3 style={{ color: 'var(--primary-light)' }}>{data.title}</h3>
                    <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#94a3b8' }}>Issued on: {new Date(data.issuedDate).toLocaleDateString()}</p>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ID: {data.verificationId}</p>
                </div>
            </div>
        </div>
    );
};

export default Verification;
