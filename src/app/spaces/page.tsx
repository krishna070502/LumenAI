'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Folder, Trash2, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/useAuth';

interface Space {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    systemPrompt: string | null;
    createdAt: string;
}

const SpacesPage = () => {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading, login } = useAuth();
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('📁');
    const [systemPrompt, setSystemPrompt] = useState('');

    const icons = ['📁', '💼', '🎯', '💡', '🚀', '📚', '🔬', '🎨', '💻', '📝', '🏠', '🌟'];

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            setSpaces([]);
            setLoading(false);
            return;
        }
        fetchSpaces();
    }, [authLoading, isAuthenticated]);

    const fetchSpaces = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/spaces');
            if (res.ok) {
                const data = await res.json();
                setSpaces(data.spaces || []);
            } else if (res.status === 401) {
                setSpaces([]);
            }
        } catch (error) {
            console.error('Error fetching spaces:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        if (!isAuthenticated) {
            toast.error('Please sign in to create spaces');
            login();
            return;
        }
        setShowCreateModal(true);
    };

    const handleCreateSpace = async () => {
        if (!isAuthenticated) {
            toast.error('Please sign in to create spaces');
            login();
            return;
        }
        if (!name.trim()) {
            toast.error('Please enter a space name');
            return;
        }

        setCreating(true);
        try {
            const res = await fetch('/api/spaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, icon, systemPrompt }),
            });

            if (res.ok) {
                const data = await res.json();
                setSpaces([data.space, ...spaces]);
                setShowCreateModal(false);
                resetForm();
                toast.success('Space created!');
                router.push(`/space/${data.space.id}`);
            } else {
                toast.error('Failed to create space');
            }
        } catch (error) {
            toast.error('Error creating space');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteSpace = async (spaceId: string) => {
        if (!confirm('Delete this space and all its chats?')) return;

        try {
            const res = await fetch(`/api/spaces/${spaceId}`, { method: 'DELETE' });
            if (res.ok) {
                setSpaces(spaces.filter(s => s.id !== spaceId));
                toast.success('Space deleted');
            }
        } catch (error) {
            toast.error('Failed to delete space');
        }
    };

    const resetForm = () => {
        setName('');
        setDescription('');
        setIcon('📁');
        setSystemPrompt('');
    };

    const filteredSpaces = spaces.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    // Show loading spinner while auth state is being determined
    if (authLoading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-light-200 dark:border-dark-200 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    // Auth gate — show sign-in prompt for unauthenticated users
    if (!isAuthenticated) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-light-200 dark:bg-dark-200 flex items-center justify-center mb-4">
                    <Folder size={28} className="text-black/30 dark:text-white/30" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-black dark:text-white">Sign in to create spaces</h3>
                <p className="text-black/50 dark:text-white/50 text-sm mb-6 max-w-xs">
                    Spaces are personal workspaces tied to your account.
                </p>
                <button
                    onClick={login}
                    className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90 transition-all flex items-center gap-2"
                >
                    Sign In
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex flex-col">
            {/* Header */}
            <header className="shrink-0 border-b border-light-200 dark:border-dark-200 flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Folder size={20} className="text-black/70 dark:text-white/70" />
                        <h1 className="text-lg font-semibold text-black dark:text-white">
                            Spaces
                        </h1>
                    </div>

                    <nav className="hidden lg:flex items-center gap-1 ml-4">
                        <button className="px-3 py-1.5 rounded-lg bg-light-200 dark:bg-dark-200 text-black dark:text-white text-xs font-medium">
                            All Projects
                        </button>
                        <button className="px-3 py-1.5 rounded-lg text-black/50 dark:text-white/50 hover:bg-light-200 dark:hover:bg-dark-200 text-xs font-medium transition-colors">
                            Recent
                        </button>
                        <button className="px-3 py-1.5 rounded-lg text-black/50 dark:text-white/50 hover:bg-light-200 dark:hover:bg-dark-200 text-xs font-medium transition-colors">
                            Favorites
                        </button>
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative max-w-xs">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search projects..."
                            className="w-48 bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 rounded-lg py-2 pl-9 pr-3 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all placeholder-black/40 dark:placeholder-white/40"
                        />
                    </div>

                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90 active:scale-95 transition-all"
                    >
                        <Plus size={16} />
                        New Space
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-6 pb-32">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-6">
                        <span className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider">Workspace</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <h2 className="text-lg font-semibold text-black dark:text-white">Active Projects</h2>
                            <span className="text-black/40 dark:text-white/40 text-xs">{spaces.length} total</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="h-[40vh] flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-black/30 dark:text-white/30" />
                        </div>
                    ) : filteredSpaces.length === 0 ? (
                        <div className="h-[50vh] flex flex-col items-center justify-center text-center">
                            <div className="w-14 h-14 rounded-2xl bg-light-200 dark:bg-dark-200 flex items-center justify-center mb-4">
                                <Folder size={28} className="text-black/30 dark:text-white/30" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2 text-black dark:text-white">No workspaces yet</h3>
                            <p className="text-black/50 dark:text-white/50 text-sm mb-6 max-w-xs">
                                Create a focused environment to organize your conversations.
                            </p>
                            <button
                                onClick={openCreateModal}
                                className="px-5 py-2.5 bg-light-200 dark:bg-dark-200 hover:bg-light-300 dark:hover:bg-dark-300 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                            >
                                <Plus size={16} />
                                Create Space
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredSpaces.map((space) => (
                                <div
                                    key={space.id}
                                    onClick={() => router.push(`/space/${space.id}`)}
                                    className="group relative rounded-xl border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary hover:bg-light-200 dark:hover:bg-dark-200 transition-all cursor-pointer"
                                >
                                    <div className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="w-10 h-10 rounded-lg bg-light-200 dark:bg-dark-200 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                                                {space.icon}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteSpace(space.id);
                                                }}
                                                className="p-1.5 rounded-lg text-black/20 dark:text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <h3 className="text-sm font-semibold text-black dark:text-white mb-1">
                                            {space.name}
                                        </h3>
                                        <p className="text-xs text-black/50 dark:text-white/50 line-clamp-2">
                                            {space.description || "No description"}
                                        </p>

                                        <div className="mt-3 pt-3 border-t border-light-200 dark:border-dark-200 flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                            <span className="text-[10px] font-medium text-black/40 dark:text-white/40">Workspace</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-light-primary dark:bg-dark-primary rounded-xl p-5 w-full max-w-md border border-light-200 dark:border-dark-200 shadow-xl">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-semibold text-black dark:text-white">New Workspace</h2>
                            <button
                                onClick={() => { setShowCreateModal(false); resetForm(); }}
                                className="p-1.5 rounded-lg hover:bg-light-200 dark:hover:bg-dark-200 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-all"
                            >
                                <Plus size={16} className="rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1.5">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Project name..."
                                    className="w-full px-3 py-2.5 rounded-lg border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1.5">Icon</label>
                                <div className="grid grid-cols-6 gap-1.5">
                                    {icons.map((i) => (
                                        <button
                                            key={i}
                                            onClick={() => setIcon(i)}
                                            className={`h-9 rounded-lg flex items-center justify-center text-base transition-all ${icon === i
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-light-200 dark:bg-dark-200 hover:bg-light-300 dark:hover:bg-dark-300'
                                                }`}
                                        >
                                            {i}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1.5">Description</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief description..."
                                    className="w-full px-3 py-2.5 rounded-lg border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1.5">AI Context (Optional)</label>
                                <textarea
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    placeholder="Instructions for AI..."
                                    rows={2}
                                    className="w-full px-3 py-2.5 rounded-lg border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm resize-none"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleCreateSpace}
                            disabled={creating}
                            className="w-full mt-5 py-2.5 rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                        >
                            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            Create
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpacesPage;
