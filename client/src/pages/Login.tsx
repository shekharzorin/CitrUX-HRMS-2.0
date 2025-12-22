import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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
                const res = await fetch('http://localhost:5000/api/settings');
                if (res.ok) {
                    const data = await res.json();
                    if (data['company_logo']) setLogo(data['company_logo']);
                    if (data['company_name']) setCompanyName(data['company_name']);
                }
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
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                login(data.token, data.user);
                navigate('/');
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-body)'
        }}>
            <div className="card" style={{
                padding: '3rem',
                width: '100%',
                maxWidth: '400px',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    {logo ? (
                        <img src={logo} alt="Company Logo" style={{ width: '64px', height: '64px', objectFit: 'contain', margin: '0 auto 1rem' }} />
                    ) : (
                        <div style={{ width: '48px', height: '48px', background: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.5rem', margin: '0 auto 1rem' }}>C</div>
                    )}
                    <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)', margin: 0 }}>{companyName || 'Welcome back'}</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Please enter your details to sign in.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 500 }}>Email</label>
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
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 500 }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                className="input-field"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Enter your password"
                                disabled={isLoading}
                                style={{ paddingRight: '2.5rem' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>
                    {error && <div className="text-error" style={{ textAlign: 'center' }}>{error}</div>}
                    <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', width: '100%' }} disabled={isLoading}>
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>
            </div>
            {/* Optional: Add ThemeSettings here if desired, but user didn't explicitly ask for it on login */}
        </div>
    );
};

export default Login;
