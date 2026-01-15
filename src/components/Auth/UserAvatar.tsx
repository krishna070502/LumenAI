'use client';

import { useAuth } from '@/lib/auth/useAuth';
import { LogIn, LogOut, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function UserAvatar() {
    const { user, isAuthenticated, logout, login, loading } = useAuth();
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (loading) {
        return (
            <div className="w-10 h-10 rounded-full bg-light-200 dark:bg-dark-200 flex items-center justify-center border border-light-300 dark:border-dark-300">
                <div className="w-4 h-4 border-2 border-black/20 dark:border-white/20 border-t-black/70 dark:border-t-white/70 rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return (
            <button
                onClick={login}
                className="w-10 h-10 rounded-full bg-light-200 dark:bg-dark-200 flex items-center justify-center text-black/70 dark:text-white/70 hover:opacity-70 transition duration-200 border border-light-300 dark:border-dark-300"
                title="Sign In"
            >
                <LogIn size={20} />
            </button>
        );
    }

    const initial = (user.name || user.email || '?')[0].toUpperCase();

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-10 h-10 rounded-full bg-light-200 dark:bg-dark-200 flex items-center justify-center text-black/70 dark:text-white/70 hover:opacity-70 transition duration-200 overflow-hidden border border-light-300 dark:border-dark-300 font-medium"
            >
                {initial}
            </button>
            {showMenu && (
                <div className="absolute left-full ml-2 bottom-0 w-48 rounded-lg bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 shadow-lg p-1 z-50">
                    <div className="px-3 py-2 border-b border-light-200 dark:border-dark-200">
                        <p className="text-sm font-medium text-black dark:text-white truncate">
                            {user.name || 'User'}
                        </p>
                        <p className="text-xs text-black/60 dark:text-white/60 truncate">
                            {user.email}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            logout();
                            setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-light-200 dark:hover:bg-dark-200 rounded-md transition duration-200"
                    >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                </div>
            )}
        </div>
    );
}
