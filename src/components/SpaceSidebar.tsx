'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { FileText, MessageSquare, Settings, ChevronLeft, Loader2, Plus, History, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Space {
    id: string;
    name: string;
    icon: string;
}

interface ChatItem {
    id: string;
    title: string;
    createdAt: string;
    chatMode: 'chat' | 'research';
}

const SpaceSidebar = () => {
    const params = useParams();
    const pathname = usePathname();
    const router = useRouter();
    const spaceId = params.spaceId as string;
    const [space, setSpace] = useState<Space | null>(null);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const historyButtonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchSpace = async () => {
            try {
                const res = await fetch(`/api/spaces/${spaceId}`);
                if (res.ok) {
                    const data = await res.json();
                    setSpace(data.space);
                }
            } catch (err) {
                console.error('Error fetching space for sidebar:', err);
            } finally {
                setLoading(false);
            }
        };

        if (spaceId) {
            fetchSpace();
        }
    }, [spaceId]);

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target as Node) &&
                historyButtonRef.current &&
                !historyButtonRef.current.contains(event.target as Node)
            ) {
                setShowHistory(false);
            }
        };

        if (showHistory) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showHistory]);

    const fetchChatHistory = async () => {
        if (loadingHistory) return;
        setLoadingHistory(true);
        try {
            const res = await fetch(`/api/spaces/${spaceId}/chats`);
            if (res.ok) {
                const data = await res.json();
                setChatHistory(data.chats || []);
            }
        } catch (err) {
            console.error('Error fetching chat history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const toggleHistory = () => {
        if (!showHistory) {
            fetchChatHistory();
        }
        setShowHistory(!showHistory);
    };

    const handleChatSelect = (chatId: string) => {
        setShowHistory(false);
        router.push(`/space/${spaceId}/c/${chatId}`);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const navItems = [
        {
            label: 'Chat',
            href: `/space/${spaceId}`,
            icon: MessageSquare,
            active: pathname === `/space/${spaceId}` || pathname?.includes(`/space/${spaceId}/c/`)
        },
        {
            label: 'Docs',
            href: `/space/${spaceId}/docs`,
            icon: FileText,
            active: pathname?.includes(`/space/${spaceId}/docs`)
        },
    ];

    if (loading) {
        return (
            <div className="w-64 h-full bg-[#151515] border-r border-white/10 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
            </div>
        );
    }

    if (!space) return null;

    return (
        <div className="w-64 h-full bg-[#151515] border-r border-white/5 lg:border-white/10 flex flex-col pt-6 overflow-hidden relative">
            {/* Space Branding */}
            <div className="px-5 mb-8">
                <Link
                    href="/spaces"
                    className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition mb-4 group"
                >
                    <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                    Back to Spaces
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center text-2xl border border-white/10 shadow-inner">
                        {space.icon}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-white font-semibold truncate leading-tight">
                            {space.name}
                        </h2>
                        <span className="text-[10px] text-purple-500 font-medium tracking-wider uppercase">
                            Workspace
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
                <div className="px-3 mb-2">
                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                        Main
                    </span>
                </div>
                {navItems.map((item) => (
                    <div key={item.label} className="relative flex items-center gap-1">
                        <Link
                            href={item.href}
                            className={cn(
                                "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                                item.active
                                    ? "bg-purple-600/10 text-purple-400 border border-purple-500/20"
                                    : "text-white/60 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <item.icon size={18} className={cn(
                                "transition-colors",
                                item.active ? "text-purple-400" : "text-white/40 group-hover:text-white/70"
                            )} />
                            <span className="text-sm font-medium">{item.label}</span>
                            {item.active && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                            )}
                        </Link>
                        {/* History button for Chat */}
                        {item.label === 'Chat' && (
                            <button
                                ref={historyButtonRef}
                                onClick={toggleHistory}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    showHistory
                                        ? "bg-purple-600/20 text-purple-400"
                                        : "text-white/40 hover:bg-white/5 hover:text-white/70"
                                )}
                                title="Chat History"
                            >
                                <History size={16} />
                            </button>
                        )}
                    </div>
                ))}

                <div className="pt-6 px-3 mb-2">
                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                        Actions
                    </span>
                </div>
                <Link
                    href={`/space/${spaceId}/settings`}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                        pathname?.includes(`/space/${spaceId}/settings`)
                            ? "bg-purple-600/10 text-purple-400 border border-purple-500/20"
                            : "text-white/60 hover:bg-white/5 hover:text-white"
                    )}
                >
                    <Settings size={18} className={cn(
                        "transition-colors",
                        pathname?.includes(`/space/${spaceId}/settings`) ? "text-purple-400" : "text-white/40 group-hover:text-white/70"
                    )} />
                    <span className="text-sm font-medium">Settings</span>
                    {pathname?.includes(`/space/${spaceId}/settings`) && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                    )}
                </Link>
            </nav>

            {/* Bottom Section */}
            <div className="p-4 border-t border-white/5 bg-black/20">
                <Link
                    href={`/space/${spaceId}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg active:scale-[0.98]"
                >
                    <Plus size={16} />
                    New Chat
                </Link>
            </div>

            {/* Floating Chat History Popover - using fixed positioning to escape overflow:hidden */}
            {showHistory && (
                <div
                    ref={popoverRef}
                    style={{
                        position: 'fixed',
                        left: '270px',
                        top: '130px',
                    }}
                    className="w-72 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 z-[100] overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20">
                        <div className="flex items-center gap-2">
                            <History size={14} className="text-purple-400" />
                            <span className="text-sm font-medium text-white">Chat History</span>
                        </div>
                        <button
                            onClick={() => setShowHistory(false)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="max-h-80 overflow-y-auto no-scrollbar">
                        {loadingHistory ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                            </div>
                        ) : chatHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                <MessageSquare size={24} className="text-white/20 mb-2" />
                                <p className="text-sm text-white/40">No chat history yet</p>
                                <p className="text-xs text-white/30 mt-1">Start a conversation to see it here</p>
                            </div>
                        ) : (
                            <div className="p-2">
                                {chatHistory.map((chat) => (
                                    <button
                                        key={chat.id}
                                        onClick={() => handleChatSelect(chat.id)}
                                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/5 transition group"
                                    >
                                        <p className="text-sm text-white/80 truncate group-hover:text-white transition">
                                            {chat.title}
                                        </p>
                                        <p className="text-[11px] text-white/30 mt-0.5">
                                            {formatDate(chat.createdAt)}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpaceSidebar;


