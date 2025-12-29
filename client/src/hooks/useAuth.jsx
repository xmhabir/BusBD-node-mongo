import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [token]);

    const fetchUser = async () => {
        try {
            const response = await api.get('/auth/me');
            setUser(response.data.user);
        } catch (error) {
            console.error('Failed to fetch user:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = useCallback(async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { token: newToken, refreshToken, user: userData } = response.data;

        localStorage.setItem('token', newToken);
        localStorage.setItem('refreshToken', refreshToken);
        setToken(newToken);
        setUser(userData);

        return userData;
    }, []);

    const register = useCallback(async (userData) => {
        const response = await api.post('/auth/register', userData);
        const { token: newToken, refreshToken, user: newUser } = response.data;

        localStorage.setItem('token', newToken);
        localStorage.setItem('refreshToken', refreshToken);
        setToken(newToken);
        setUser(newUser);

        return newUser;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setToken(null);
        setUser(null);
    }, []);

    const isAdmin = user?.role === 'super-admin';
    const isOperatorAdmin = ['operator-admin', 'super-admin'].includes(user?.role);

    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            isAuthenticated: !!user,
            isAdmin,
            isOperatorAdmin,
            login,
            register,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
