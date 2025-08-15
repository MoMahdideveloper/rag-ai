import React, { createContext, useState, useContext, useEffect } from 'react';

interface AuthContextType {
    token: string | null;
    login: (token: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(() => window.localStorage.getItem('authToken'));

    const login = (newToken: string) => {
        setToken(newToken);
        window.localStorage.setItem('authToken', newToken);
    };

    const logout = () => {
        setToken(null);
        window.localStorage.removeItem('authToken');
    };

    const isAuthenticated = !!token;

    useEffect(() => {
        const storedToken = window.localStorage.getItem('authToken');
        if (storedToken) {
            setToken(storedToken);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ token, login, logout, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
