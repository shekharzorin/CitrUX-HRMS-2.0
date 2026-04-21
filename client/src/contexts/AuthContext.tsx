import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';

export interface User {
    id: string;
    employeeId?: string;
    email: string;
    role: string;
    profile?: any;
    shift?: {
        startTime: string;
        endTime: string;
        name: string;
    };
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
                } catch {
                    // console.error("LocalStorage access denied", e);
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
                    } catch {
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

                    // Hydrate User (Optimistic Cache)
                    let hydratedUser: User | null = null;
                    if (storedUser) {
                        try {
                            hydratedUser = JSON.parse(storedUser);
                            // Optimistically set to prevent UI blocking
                            setToken(storedToken);
                            if (hydratedUser!.role) hydratedUser!.role = hydratedUser!.role.toUpperCase();
                            setUser(hydratedUser);
                        } catch {
                            console.warn("Corrupted user data in storage");
                        }
                    }

                    // Always fetch latest from API if possible
                    const userId = payload.id || payload.userId || payload.sub;
                    if (userId) {
                        try {
                            const fetchedUser = await api.get<User>(`/users/${userId}`);
                            if (fetchedUser) {
                                hydratedUser = fetchedUser;
                                try {
                                    localStorage.setItem('user', JSON.stringify(fetchedUser));
                                } catch { /* ignore */ }
                                
                                setToken(storedToken);
                                if (hydratedUser.role) hydratedUser.role = hydratedUser.role.toUpperCase();
                                setUser(hydratedUser);
                            }
                        } catch (err) {
                            console.error("Failed to fetch fresh user profile", err);
                            // If we don't have a cached user and fetch fails, we can't proceed
                            if (!hydratedUser) {
                                console.error("No cached user and fetch failed. Logging out.");
                                logout();
                            }
                        }
                    }

                    // Final Consistency Check
                    if (!storedToken || !hydratedUser) {
                        console.error("Auth state inconsistent: Token exists but user missing entirely");
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
