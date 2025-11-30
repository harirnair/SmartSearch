import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            // In a real app, you'd verify the token with the backend here
            // For now, we'll just assume if there's a token, the user is logged in
            const storedEmail = localStorage.getItem('email');
            setUser({ email: storedEmail || 'User' });
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        setLoading(false);
    }, [token]);

    const login = async (email, password) => {
        try {
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);

            const response = await axios.post('http://localhost:8000/auth/token', formData);
            const { access_token } = response.data;

            setToken(access_token);
            localStorage.setItem('token', access_token);
            localStorage.setItem('email', email);
            setUser({ email });
            return true;
        } catch (error) {
            console.error("Login failed", error);
            return false;
        }
    };

    const register = async (email, password) => {
        try {
            const response = await axios.post('http://localhost:8000/auth/register', { email, password });
            const { access_token } = response.data;

            setToken(access_token);
            localStorage.setItem('token', access_token);
            localStorage.setItem('email', email);
            setUser({ email });
            return true;
        } catch (error) {
            console.error("Registration failed", error);
            return false;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
