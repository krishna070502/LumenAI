'use client';

import { createContext, useContext, useCallback, useEffect, useState, ReactNode, createElement } from 'react';

export interface User {
    id: string;
    email: string;
    name?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: () => void;
    logout: () => Promise<void>;
    signup: () => void;
    refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialUser = null }: { children: ReactNode; initialUser?: User | null }) {
    const [user, setUser] = useState<User | null>(initialUser);
    // If an initialUser value was provided by the server, we know the status immediately and don't need to show loading
    const [loading, setLoading] = useState(initialUser === undefined);

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
        // If server didn't pass an initialUser (e.g., client-side mounting without hydrate or explicitly skipped), fetch it.
        // Otherwise, we can skip the initial fetch and let the app render immediately.
        if (initialUser === undefined) {
            fetchSession();
        } else {
            setLoading(false);
        }
    }, [fetchSession, initialUser]);

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

    return createElement(
        AuthContext.Provider,
        {
            value: {
                user,
                loading,
                isAuthenticated: !!user,
                login,
                logout,
                signup,
                refetch: fetchSession,
            }
        },
        children
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
