import React, { useState } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);

        try {
            const data = await api.post<{ message: string }>('/auth/forgot-password', { email });
            setMessage(data.message);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="card login-card">
                <div className="login-header">
                    <h2 className="login-title">Forgot Password</h2>
                    <p className="login-subtitle">Enter your email to receive a reset link.</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div>
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="input-field"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter your registered email"
                            disabled={isLoading}
                        />
                    </div>
                    {message && <div className="p-3 bg-green-50 text-green-700 rounded mb-4 text-sm">{message}</div>}
                    {error && <div className="text-error login-error">{error}</div>}

                    <button type="submit" className="btn-primary login-submit-btn" disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>

                    <div className="text-center mt-4 text-sm">
                        <Link to="/login" className="text-primary hover:underline">
                            Back to Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;
