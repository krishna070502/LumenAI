'use client';

import { AuthView } from '@neondatabase/auth/react/ui';
import { NeonAuthUIProvider } from '@neondatabase/auth/react/ui';
import { createAuthClient } from '@neondatabase/auth';
import { use, useMemo, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function AuthPage({
    params,
}: {
    params: Promise<{ path: string[] }>;
}) {
    const { path } = use(params);
    const authPath = path?.[0] || 'sign-in';
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';
    const router = useRouter();
    const [showForm, setShowForm] = useState(false);

    const authClient = useMemo(() => {
        const baseUrl = typeof window !== 'undefined'
            ? `${window.location.origin}/api/auth`
            : 'http://localhost:3000/api/auth';
        return createAuthClient(baseUrl);
    }, []);

    // One-time check on mount - if already authenticated, redirect
    useEffect(() => {
        let mounted = true;

        const checkSession = async () => {
            try {
                const res = await fetch('/api/auth/get-session');
                if (res.ok && mounted) {
                    const data = await res.json();
                    if (data?.session && data?.user) {
                        // Already authenticated, redirect immediately
                        window.location.href = callbackUrl;
                        return;
                    }
                }
            } catch (error) {
                console.error('Error checking session:', error);
            }
            if (mounted) {
                setShowForm(true);
            }
        };

        checkSession();

        return () => { mounted = false; };
    }, [callbackUrl]);

    // Show loading while checking initial session
    if (!showForm) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-light-primary dark:bg-dark-primary">
                <div className="text-black dark:text-white">Loading...</div>
            </div>
        );
    }

    return (
        <NeonAuthUIProvider authClient={authClient} redirectTo={callbackUrl}>
            <div className="min-h-screen flex items-center justify-center bg-light-primary dark:bg-dark-primary">
                <div className="w-full max-w-md p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-black dark:text-white">
                            LumenAI
                        </h1>
                        <p className="text-sm text-black/60 dark:text-white/60 mt-2">
                            {authPath === 'sign-up' ? 'Create your account' : 'Welcome back'}
                        </p>
                    </div>
                    <AuthView path={authPath} />
                </div>
            </div>
        </NeonAuthUIProvider>
    );
}



