'use client';

import { NeonAuthUIProvider } from '@neondatabase/auth/react/ui';
import { createAuthClient } from '@neondatabase/auth';
import { useMemo } from 'react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const authClient = useMemo(() => {
        // Get the base URL from window.location for client-side
        const baseUrl = typeof window !== 'undefined'
            ? `${window.location.origin}/api/auth`
            : 'http://localhost:3000/api/auth';

        return createAuthClient(baseUrl);
    }, []);

    return (
        <NeonAuthUIProvider authClient={authClient} redirectTo="/">
            {children}
        </NeonAuthUIProvider>
    );
}
