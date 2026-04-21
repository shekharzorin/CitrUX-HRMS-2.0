import React, { useState } from 'react';
import { api } from '../services/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const ResetPassword: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const uid = searchParams.get('uid');
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // If no token, maybe redirect or show error immediately?
    React.useEffect(() => {
        if (!token) {
            setError('Invalid or missing reset token.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!token || !uid) {
            setError('Invalid or missing reset link. Please request a new password reset.');
            return;
        }

        setIsLoading(true);

        try {
            const data = await api.post<{ message: string }>('/auth/reset-password', { token, uid, newPassword });
            setMessage(data.message);
            // Optional: Redirect to login after a delay
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="login-container">
                <div className="card login-card text-center">
                    <h2 className="login-title text-red-600">Invalid Link</h2>
                    <p className="login-subtitle">The reset link is missing a token.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container">
            <div className="card login-card">
                <div className="login-header">
                    <h2 className="login-title">Reset Password</h2>
                    <p className="login-subtitle">Enter your new password.</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div>
                        <label className="form-label">New Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="input-field password-input"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                placeholder="New password"
                                disabled={isLoading}
                                minLength={8}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="password-toggle-btn"
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Confirm Password</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            className="input-field"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Confirm new password"
                            disabled={isLoading}
                        />
                    </div>

                    {message && <div className="p-3 bg-green-50 text-green-700 rounded mb-4 text-sm">{message}. Redirecting...</div>}
                    {error && <div className="text-error login-error">{error}</div>}

                    <button type="submit" className="btn-primary login-submit-btn" disabled={isLoading}>
                        {isLoading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
