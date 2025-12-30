import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [logo, setLogo] = useState('');
    const [companyName, setCompanyName] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await api.get<any>('/settings/public');
                if (data['company_logo']) setLogo(data['company_logo']);
                if (data['company_name']) setCompanyName(data['company_name']);
            } catch (error) {
                console.error("Failed to fetch settings:", error);
            }
        };
        fetchSettings();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const data = await api.post<{ token: string; user: any }>('/auth/login', { email, password });
            login(data.token, data.user);
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Failed to connect to server');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="card login-card">
                <div className="login-header">
                    {logo ? (
                        <img src={logo} alt="Company Logo" className="login-logo" />
                    ) : (
                        <div className="login-logo-placeholder">C</div>
                    )}
                    <h2 className="login-title">{companyName || 'Welcome back'}</h2>
                    <p className="login-subtitle">Please enter your details to sign in.</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div>
                        <label className="login-label">Email</label>
                        <input
                            type="email"
                            className="input-field"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter your email"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="login-label">Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="input-field password-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Enter your password"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="password-toggle-btn"
                                title={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>
                    {error && <div className="text-error login-error">{error}</div>}
                    <button type="submit" className="btn-primary login-submit-btn" disabled={isLoading}>
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>
            </div>
            {/* Optional: Add ThemeSettings here if desired, but user didn't explicitly ask for it on login */}
        </div>
    );
};

export default Login;
