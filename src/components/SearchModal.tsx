'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, SquarePen, MessageCircle, Folder, Loader2, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/useAuth';

interface Chat {
    id: string;
    title: string;
    createdAt: string;
    spaceId?: string | null;
}

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNewChat: () => void;
}

const SearchModal = ({ isOpen, onClose, onNewChat }: SearchModalProps) => {
    const { isAuthenticated, loading: authLoading, login } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [allChats, setAllChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch all chats when modal opens (including space chats)
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            if (isAuthenticated) {
                fetchAllChats();
            }
        } else {
            setSearchQuery('');
        }
    }, [isOpen, isAuthenticated]);

    const fetchAllChats = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/chats/all');
            if (res.ok) {
                const data = await res.json();
                setAllChats(data.chats || []);
            }
        } catch (err) {
            console.error('Error fetching chats:', err);
        } finally {
            setLoading(false);
        }
    };

    // Close on escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Filter chats by search
    const filteredChats = allChats.filter(chat =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group chats by date
    const groupChatsByDate = (chats: Chat[]) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const groups: { [key: string]: Chat[] } = {
            'Today': [],
            'Yesterday': [],
            'Previous 7 Days': [],
        };

        chats.forEach(chat => {
            const chatDate = new Date(chat.createdAt);
            if (chatDate.toDateString() === today.toDateString()) {
                groups['Today'].push(chat);
            } else if (chatDate.toDateString() === yesterday.toDateString()) {
                groups['Yesterday'].push(chat);
            } else if (chatDate > weekAgo) {
                groups['Previous 7 Days'].push(chat);
            }
        });

        return groups;
    };

    const chatGroups = groupChatsByDate(filteredChats);

    // Get chat link - regular chats go to /c/, space chats go to /space/[spaceId]/c/
    const getChatLink = (chat: Chat) => {
        if (chat.spaceId) {
            return `/space/${chat.spaceId}/c/${chat.id}`;
        }
        return `/c/${chat.id}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl mx-4 bg-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden border border-white/10">
                {!isAuthenticated ? (
                    /* Auth gate for unauthenticated users */
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mb-4">
                            <Search size={24} className="text-white/30" />
                        </div>
                        <h2 className="text-lg font-semibold text-white mb-2">
                            Sign in to search your chats
                        </h2>
                        <p className="text-sm text-white/40 max-w-sm mb-6">
                            Search through your past conversations and space chats once you sign in.
                        </p>
                        <button
                            onClick={() => {
                                login();
                                onClose();
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#24A0ED] hover:bg-[#1a8ad0] text-white text-sm font-medium transition-colors"
                        >
                            <LogIn size={18} />
                            <span>Sign In</span>
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Search Input */}
                        <div className="flex items-center px-4 py-3 border-b border-white/10">
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search chats..."
                                className="flex-1 bg-transparent text-white text-lg placeholder:text-white/40 focus:outline-none"
                            />
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                            >
                                <X size={18} className="text-white/50" />
                            </button>
                        </div>

                        {/* Results */}
                        <div className="max-h-[60vh] overflow-y-auto">
                            {/* New Chat Option - Always shown at top */}
                            <button
                                onClick={() => {
                                    onNewChat();
                                    onClose();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left border-b border-white/5"
                            >
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    <SquarePen size={16} className="text-blue-400" />
                                </div>
                                <span className="text-white font-medium">New chat</span>
                            </button>

                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 size={24} className="animate-spin text-white/40" />
                                </div>
                            ) : (
                                <>
                                    {/* Grouped Chats */}
                                    {Object.entries(chatGroups).map(([group, groupChats]) => {
                                        if (groupChats.length === 0) return null;
                                        return (
                                            <div key={group}>
                                                <div className="px-4 py-2 text-xs font-medium text-white/40 uppercase tracking-wider">
                                                    {group}
                                                </div>
                                                {groupChats.map((chat) => (
                                                    <Link
                                                        key={chat.id}
                                                        href={getChatLink(chat)}
                                                        onClick={onClose}
                                                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors"
                                                    >
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-full flex items-center justify-center",
                                                            chat.spaceId
                                                                ? "bg-purple-500/20 border border-purple-500/30"
                                                                : "border border-white/20"
                                                        )}>
                                                            {chat.spaceId ? (
                                                                <Folder size={14} className="text-purple-400" />
                                                            ) : (
                                                                <MessageCircle size={14} className="text-white/60" />
                                                            )}
                                                        </div>
                                                        <span className="text-white/90 truncate flex-1">{chat.title}</span>
                                                        {chat.spaceId && (
                                                            <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                                                                Space
                                                            </span>
                                                        )}
                                                    </Link>
                                                ))}
                                            </div>
                                        );
                                    })}

                                    {/* No results */}
                                    {filteredChats.length === 0 && searchQuery && (
                                        <div className="px-4 py-8 text-center text-white/40">
                                            No chats found for &quot;{searchQuery}&quot;
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SearchModal;
