import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface User {
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            // Optional: Check token validity with backend or decode JWT expiry
            // For now, let's assume valid but add a basic expiry check if possible, 
            // or rely on API 401s (which we need to handle globally, but this is a start)
            setToken(storedToken);
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user", e);
                localStorage.removeItem('user');
                setToken(null);
            }
        }
    }, []);

    // Add a global fetch interceptor/wrapper if we could, but that's complex to inject.
    // Instead we can expose a 'logoutIfInvalid' helper or relying on components to call logout.
    // A better approach for this codebase:
    useEffect(() => {
        if (token) {
            // Validate token loosely or strictly
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000;
            if (Date.now() >= exp) {
                console.log('Token expired, logging out');
                logout();
            }
        }
    }, [token]);

    const login = (token: string, user: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setToken(token);
        setUser(user);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    const updateUser = (updatedUser: User) => {
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated: !!token }}>
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
