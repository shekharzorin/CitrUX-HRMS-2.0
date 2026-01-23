import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';

export interface User {
    id: string;
    employeeId?: string;
    email: string;
    role: string;
    profile?: any;
}


interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (user: User) => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    // Initialize state as null or safe empty values to avoid sync errors
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const login = (newToken: string, newUser: User) => {
        try {
            localStorage.setItem('token', newToken);
            localStorage.setItem('user', JSON.stringify(newUser));
            setToken(newToken);
            setUser(newUser);
        } catch (error) {
            console.error("Login failed: unable to save to localStorage", error);
        }
    };

    const logout = () => {
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        } catch (err) {
            console.error("Logout cleanup failed", err);
        }
        setToken(null);
        setUser(null);
    };

    const updateUser = (updatedUser: User) => {
        try {
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
        } catch (error) {
            console.error("Update user failed", error);
        }
    };

    // Initial Bootstrap
    useEffect(() => {
        const bootstrapAuth = async () => {
            try {
                // Safeguard localStorage access
                let storedToken = null;
                let storedUser = null;
                try {
                    storedToken = localStorage.getItem('token');
                    storedUser = localStorage.getItem('user');
                } catch (e) {
                    console.error("LocalStorage access denied", e);
                    setIsLoading(false);
                    return;
                }

                if (storedToken) {
                    // Safe Token Parsing
                    let payload: any = null;
                    try {
                        const parts = storedToken.split('.');
                        if (parts.length === 3) {
                            payload = JSON.parse(atob(parts[1]));
                        }
                    } catch (e) {
                        console.error("Invalid token format");
                        logout();
                        setIsLoading(false);
                        return;
                    }

                    if (!payload) {
                        logout();
                        setIsLoading(false);
                        return;
                    }

                    // Expiration Check
                    const exp = payload.exp * 1000;
                    if (Date.now() >= exp) {
                        console.log('Token expired');
                        logout();
                        setIsLoading(false);
                        return;
                    }

                    // Hydrate User
                    let hydratedUser: User | null = null;
                    if (storedUser) {
                        try {
                            hydratedUser = JSON.parse(storedUser);
                        } catch (e) {
                            console.warn("Corrupted user data in storage");
                            // Fallback to fetch below
                        }
                    }

                    // If hydration failed or no stored user, fetch from API
                    if (!hydratedUser) {
                        const userId = payload.id || payload.userId || payload.sub;
                        if (userId) {
                            try {
                                const fetchedUser = await api.get<User>(`/users/${userId}`);
                                if (fetchedUser) {
                                    hydratedUser = fetchedUser;
                                    // Update storage with fresh data
                                    try {
                                        localStorage.setItem('user', JSON.stringify(fetchedUser));
                                    } catch (e) { /* ignore write errors */ }
                                }
                            } catch (err) {
                                console.error("Failed to fetch user profile", err);
                            }
                        }
                    }

                    // Final Consistency Check
                    if (storedToken && hydratedUser) {
                        setToken(storedToken);
                        // Normalize Role
                        if (hydratedUser.role) {
                            hydratedUser.role = hydratedUser.role.toUpperCase();
                        }
                        setUser(hydratedUser);
                    } else {
                        // If we have a token but couldn't get a user, we must logout to prevent UI crash
                        console.error("Auth state inconsistent: Token exists but user missing");
                        logout();
                    }

                } else {
                    logout();
                }
            } catch (error) {
                console.error("Critical bootstrap error", error);
                logout();
            } finally {
                setIsLoading(false);
            }
        };

        bootstrapAuth();
    }, []);

    // Listen for global logout events
    useEffect(() => {
        const handleLogout = () => logout();
        window.addEventListener('auth:logout', handleLogout);
        return () => window.removeEventListener('auth:logout', handleLogout);
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated: !!token, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
