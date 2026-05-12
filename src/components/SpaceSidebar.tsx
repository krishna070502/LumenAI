'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FileText, MessageSquare, Settings, ChevronLeft, Loader2, Plus } from 'lucide-react';
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
    const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);
    const [loadingChats, setLoadingChats] = useState(true);

    // Get current chat ID from pathname
    const pathSegments = pathname?.split('/').filter(Boolean) || [];
    const currentChatId = pathSegments.includes('c') ? pathSegments[pathSegments.indexOf('c') + 1] : null;

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

    // Fetch chat history on mount
    useEffect(() => {
        const fetchChatHistory = async () => {
            try {
                const res = await fetch(`/api/spaces/${spaceId}/chats`);
                if (res.ok) {
                    const data = await res.json();
                    setChatHistory(data.chats || []);
                }
            } catch (err) {
                console.error('Error fetching chat history:', err);
            } finally {
                setLoadingChats(false);
            }
        };

        if (spaceId) {
            fetchChatHistory();
        }
    }, [spaceId]);

    const navItems = [
        {
            label: 'Docs',
            href: `/space/${spaceId}/docs`,
            icon: FileText,
            active: pathname?.includes(`/space/${spaceId}/docs`)
        },
        {
            label: 'Settings',
            href: `/space/${spaceId}/settings`,
            icon: Settings,
            active: pathname?.includes(`/space/${spaceId}/settings`)
        },
    ];

    if (loading) {
        return (
            <div className="w-64 h-full bg-light-secondary dark:bg-dark-secondary border-r border-light-200 dark:border-dark-200 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
            </div>
        );
    }

    if (!space) return null;

    return (
        <div className="w-64 h-full bg-light-secondary dark:bg-dark-secondary border-r border-light-200 dark:border-dark-200 flex flex-col pt-6 overflow-hidden">
            {/* Space Branding */}
            <div className="px-5 mb-6 shrink-0">
                <Link
                    href="/spaces"
                    className="flex items-center gap-2 text-xs text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 transition mb-4 group"
                >
                    <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                    Back to Spaces
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center text-2xl border border-light-200 dark:border-dark-200 shadow-inner">
                        {space.icon}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-black dark:text-white font-semibold truncate leading-tight">
                            {space.name}
                        </h2>
                        <span className="text-[10px] text-purple-500 font-medium tracking-wider uppercase">
                            Workspace
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="px-3 space-y-1 shrink-0">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                            item.active
                                ? "bg-purple-600/10 text-purple-400 border border-purple-500/20"
                                : "text-black/60 dark:text-white/60 hover:bg-light-200 dark:hover:bg-dark-200 hover:text-black dark:hover:text-white"
                        )}
                    >
                        <item.icon size={18} className={cn(
                            "transition-colors",
                            item.active ? "text-purple-400" : "text-black/40 dark:text-white/40 group-hover:text-black/70 dark:group-hover:text-white/70"
                        )} />
                        <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                ))}
            </nav>

            {/* Divider */}
            <div className="mx-5 my-4 border-t border-light-200 dark:border-dark-200" />

            {/* Chat History Section */}
            <div className="flex-1 overflow-y-auto px-3 no-scrollbar">
                <div className="px-3 mb-2">
                    <span className="text-[10px] text-black/30 dark:text-white/30 font-bold uppercase tracking-widest">
                        Recent Chats
                    </span>
                </div>

                {loadingChats ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 size={20} className="animate-spin text-black/40 dark:text-white/40" />
                    </div>
                ) : chatHistory.length === 0 ? (
                    <div className="text-center py-6 px-4">
                        <MessageSquare size={24} className="mx-auto mb-2 text-black/20 dark:text-white/20" />
                        <p className="text-xs text-black/40 dark:text-white/40">
                            No chats yet in this space
                        </p>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {chatHistory.map((chat) => (
                            <Link
                                key={chat.id}
                                href={`/space/${spaceId}/c/${chat.id}`}
                                className={cn(
                                    'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                    currentChatId === chat.id
                                        ? 'bg-light-200 dark:bg-dark-200 text-black dark:text-white'
                                        : 'text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-dark-200 hover:text-black dark:hover:text-white'
                                )}
                            >
                                <span className="truncate">{chat.title}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Section - New Chat */}
            <div className="p-4 border-t border-light-200 dark:border-dark-200 bg-light-primary/50 dark:bg-dark-primary/50 shrink-0">
                <Link
                    href={`/space/${spaceId}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg active:scale-[0.98]"
                >
                    <Plus size={16} />
                    New Chat
                </Link>
            </div>
        </div>
    );
};

export default SpaceSidebar;
