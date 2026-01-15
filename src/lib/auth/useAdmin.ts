'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';

export function useAdmin() {
    const { user, loading: authLoading } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    const checkAdminStatus = useCallback(async () => {
        if (!user) {
            setIsAdmin(false);
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/admin-status');
            if (res.ok) {
                const data = await res.json();
                setIsAdmin(data.isAdmin);
            } else {
                setIsAdmin(false);
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
            setIsAdmin(false);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading) {
            checkAdminStatus();
        }
    }, [authLoading, checkAdminStatus]);

    return {
        isAdmin,
        loading: authLoading || loading,
    };
}
