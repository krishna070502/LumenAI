'use client';

import { useCallback, useEffect, useState } from 'react';

interface User {
    id: string;
    email: string;
    name?: string;
}

interface Session {
    user: User;
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchSession = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/get-session');
            if (res.ok) {
                const data = await res.json();
                if (data && data.session && data.user) {
                    setUser({
                        id: data.user.id,
                        email: data.user.email || '',
                        name: data.user.name,
                    });
                } else {
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Error fetching session:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    const login = useCallback(() => {
        // Redirect to the auth sign-in page
        window.location.href = '/auth/sign-in';
    }, []);

    const logout = useCallback(async () => {
        try {
            await fetch('/api/auth/sign-out', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });
            setUser(null);
            window.location.href = '/';
        } catch (error) {
            console.error('Error logging out:', error);
        }
    }, []);

    const signup = useCallback(() => {
        window.location.href = '/auth/sign-up';
    }, []);

    return {
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        signup,
        refetch: fetchSession,
    };
}
