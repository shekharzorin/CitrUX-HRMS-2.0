import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [logo, setLogo] = useState('');
    const [companyName, setCompanyName] = useState('');
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // specific effect to redirect when auth state updates
    React.useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

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
        setLoadingMessage('Waking up server, please wait...');

        // Cold start timer
        const timer = setTimeout(() => {
            setLoadingMessage('First login may take up to 1 minute on free servers.');
        }, 8000);

        try {
            const data = await api.post<{ token: string; user: any }>('/auth/login', { email, password });
            login(data.token, data.user);
            // Navigation handled by useEffect
        } catch (err: any) {
            setError(err.message || 'Failed to connect to server');
        } finally {
            clearTimeout(timer);
            setIsLoading(false);
            setLoadingMessage('');
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
                        <label className="form-label">Email</label>
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
                        <label className="form-label">Password</label>
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
                    <div className="text-right mb-4">
                        <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                            Forgot Password?
                        </Link>
                    </div>
                    {error && <div className="text-error login-error">{error}</div>}
                    <button type="submit" className="btn-primary login-submit-btn" disabled={isLoading}>
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>
                    {isLoading && (
                        <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm text-center animate-pulse">
                            <div className="font-bold mb-1">Server is Waking Up 🚀</div>
                            <p>{loadingMessage}</p>
                            <div className="mt-2 w-full bg-blue-200 rounded-full h-1.5 dark:bg-blue-700">
                                <div className="bg-blue-600 h-1.5 rounded-full animate-progress w-full"></div>
                            </div>
                        </div>
                    )}
                </form>
            </div>
            {/* Optional: Add ThemeSettings here if desired, but user didn't explicitly ask for it on login */}
        </div>
    );
};

export default Login;
