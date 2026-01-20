'use client';

import { AuthView } from '@neondatabase/auth/react/ui';
import { AuthProvider } from '@/components/Auth/AuthProvider';
import { use } from 'react';

export default function AuthPage({
    params,
}: {
    params: Promise<{ path: string[] }>;
}) {
    const { path } = use(params);
    const authPath = path?.[0] || 'sign-in';

    return (
        <AuthProvider>
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
        </AuthProvider>
    );
}
