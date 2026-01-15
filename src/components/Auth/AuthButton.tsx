'use client';

import { useAuth } from '@/lib/auth/useAuth';
import { LogIn, LogOut, User } from 'lucide-react';

export default function AuthButton() {
    const { user, loading, isAuthenticated, login, logout } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center px-3 py-2">
                <div className="w-5 h-5 border-2 border-black/20 dark:border-white/20 border-t-black/70 dark:border-t-white/70 rounded-full animate-spin" />
            </div>
        );
    }

    if (isAuthenticated && user) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-light-secondary dark:bg-dark-secondary">
                    <User size={16} className="text-black/70 dark:text-white/70" />
                    <span className="text-sm text-black/70 dark:text-white/70 max-w-[100px] truncate">
                        {user.name || user.email}
                    </span>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-light-secondary dark:bg-dark-secondary hover:bg-light-300 dark:hover:bg-dark-300 transition-colors"
                >
                    <LogOut size={16} className="text-black/70 dark:text-white/70" />
                    <span className="text-sm text-black/70 dark:text-white/70">Logout</span>
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={login}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#24A0ED] hover:bg-[#1a8ad0] text-white transition-colors"
        >
            <LogIn size={16} />
            <span className="text-sm font-medium">Sign In</span>
        </button>
    );
}
