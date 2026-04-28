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
            // silent: true — Login shows its own inline error, no need for a global toast
            const data = await api.post<{ token: string; user: any }>('/auth/login', { email, password }, { silent: true });
            login(data.token, data.user);
            // Navigation handled by useEffect
        } catch (err: any) {
            const raw: string = err.message || '';
            // Show the server message if it's meaningful, otherwise map to friendly strings
            if (raw.includes('temporarily unavailable') || raw.includes('Unable to connect') || raw.includes('503')) {
                setError('Our servers are waking up — please wait a moment and try again.');
            } else if (raw.includes('deactivated')) {
                setError('Your account has been deactivated. Please contact HR.');
            } else if (raw.includes('Invalid credentials') || raw.includes('401')) {
                setError('Incorrect email or password. Please try again.');
            } else if (raw === 'Failed to fetch' || err.name === 'TypeError') {
                setError('Cannot reach the server. Please check your internet connection.');
            } else {
                setError(raw || 'Something went wrong. Please try again.');
            }
        } finally {
            clearTimeout(timer);
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    return (
        <div className="min-h-screen flex text-slate-900 bg-slate-50 dark:bg-slate-900">
            {/* Left Box - Brand & Identity */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-900 p-12 items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nNjAwJz48Zz48cGF0aCBmaWxsPSdibGFjaycgb3BhY2l0eT0nLjEnIGQ9J00yMDBfMjAwQzMwMF8xMDAsNDAwXzEwMCw1MDBfMjAwUzYwMF80MDAsNTAwXzUwMFMzMDBfNjAwLDIwMF81MDBTMTAwXzMwMCwyMDBfMjAwWicvPjwvZz48L3N2Zz4=')] bg-no-repeat bg-cover opacity-30 mix-blend-overlay animate-pulse"></div>
                <div className="relative z-10 w-full max-w-md text-white text-center">
                    <div className="flex justify-center mb-8">
                        {logo ? (
                            <img src={logo} alt="Citrux Logo" className="h-16 w-auto" />
                        ) : (
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/30 text-4xl font-black">
                                {companyName ? companyName.charAt(0) : 'C'}
                            </div>
                        )}
                    </div>
                    <h1 className="text-4xl font-extrabold mb-6 tracking-tight leading-tight">
                        Transform your <br/> HR  Experience.
                    </h1>
                    <p className="text-indigo-100 text-lg font-medium leading-relaxed">
                        Citrux HRMS provides the tools to manage your entire workforce efficiently. Simplify attendance, payroll, and recruitment with one unified platform.
                    </p>
                </div>
            </div>

            {/* Right Box - Login Form */}
            <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24">
                <div className="max-w-sm w-full mx-auto">
                    <div className="mb-10 lg:hidden flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">C</div>
                        <h2 className="text-2xl font-bold dark:text-white">Citrux</h2>
                    </div>
                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">Welcome back</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Please enter your details to sign in.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                            <input
                                type="email"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="name@company.com"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                                <Link to="/forgot-password" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                                    Forgot Password?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none pr-12"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="Enter your password"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 py-2 px-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                >
                                    {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">{error}</div>}

                        <button 
                            type="submit" 
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all focus:ring-4 focus:ring-indigo-500/50 disabled:opacity-70 disabled:cursor-not-allowed" 
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                        
                        {isLoading && (
                            <div className="mt-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-xl text-sm text-center">
                                <div className="font-bold mb-1 text-indigo-900 dark:text-indigo-200">Server is Waking Up 🚀</div>
                                <p className="text-indigo-700 dark:text-indigo-300/80 mb-3">{loadingMessage}</p>
                                <div className="w-full bg-indigo-200 dark:bg-indigo-900/50 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-indigo-500 h-full w-full rounded-full animate-[progress_2s_ease-in-out_infinite]"></div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
