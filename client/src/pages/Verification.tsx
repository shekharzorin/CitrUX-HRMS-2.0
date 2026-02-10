import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';

const Verification: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const verify = async () => {
            try {
                const result = await api.get<any>(`/certificates/verify/${id}`);
                if (result && result.valid) {
                    setData(result.certificate);
                } else {
                    setError('Invalid Certificate');
                }
            } catch {
                setError('Verification Failed');
            } finally {
                setLoading(false);
            }
        };
        verify();
    }, [id]);

    if (loading) return <div className="page-container">Verifying...</div>;
    if (error) return <div className="page-container"><h1 className="error-text">{error}</h1></div>;

    return (
        <div className="page-container verification-page">
            <div className="glass-panel certificate-card">
                <h1 className="certificate-heading">Verified Certificate</h1>
                <div className="certificate-body">
                    <p>This certifies that</p>
                    <h2 className="certificate-name">{data.user?.profile?.firstName} {data.user?.profile?.lastName}</h2>
                    <p>has successfully completed</p>
                    <h3 className="certificate-course">{data.title}</h3>
                    <p className="certificate-date">Issued on: {new Date(data.issuedDate).toLocaleDateString()}</p>
                    <p className="certificate-id">ID: {data.verificationId}</p>
                </div>
            </div>
        </div>
    );
};

export default Verification;
