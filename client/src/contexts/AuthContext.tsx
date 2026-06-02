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
    company?: {
        name: string;
        logoUrl?: string;
        faviconUrl?: string;
        slogan?: string;
    };
    /** RBAC v2: the user's effective permission strings (from login / /auth/me). */
    permissions?: string[];
    /** Feature flags enabled for this user's company (from login / /auth/me). */
    features?: Record<string, boolean>;
}


interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (user: User) => void;
    hasPermission: (permission: string) => boolean;
    hasFeature: (flag: string) => boolean;
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
            // Normalize role
            if (newUser.role) newUser.role = newUser.role.toUpperCase();
            
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
            if (updatedUser.role) updatedUser.role = updatedUser.role.toUpperCase();
            // Preserve permissions if the update payload doesn't include them
            // (e.g. a self profile-save via PUT /users/:id returns no permissions).
            if (!updatedUser.permissions && user?.permissions) {
                updatedUser.permissions = user.permissions;
            }
            if (!updatedUser.features && user?.features) {
                updatedUser.features = user.features;
            }
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
        } catch (error) {
            console.error("Update user failed", error);
        }
    };

    // Capability check used to gate UI. SUPER_ADMIN implicitly has everything.
    const hasPermission = (permission: string): boolean => {
        if (!user) return false;
        if (user.role === 'SUPER_ADMIN') return true;
        return user.permissions?.includes(permission) ?? false;
    };

    // Feature-flag check used to gate modules/nav (safe default: off).
    const hasFeature = (flag: string): boolean => user?.features?.[flag] ?? false;

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

                    // JWT is signed with { userId, role, companyId } — always use userId
                    const userId = payload.userId ?? payload.id ?? payload.sub;
                    if (userId) {
                        try {
                            // Use /auth/me so we always get the freshest data regardless of userId field name.
                            // silent: true — bootstrap failures must not show a global toast.
                            const fetchedUser = await api.get<User>('/auth/me');
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
                            // If we have a cached user keep them logged in (optimistic)
                            // Only force logout if there's no cached data at all
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
        <AuthContext.Provider value={{ user, token, login, logout, updateUser, hasPermission, hasFeature, isAuthenticated: !!token, isLoading }}>
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
