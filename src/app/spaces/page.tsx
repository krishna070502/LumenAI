'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Folder, Trash2, Edit3, Loader2, Search, LayoutGrid, Clock, Star } from 'lucide-react';
import { toast } from 'sonner';

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
        fetchSpaces();
    }, []);

    const fetchSpaces = async () => {
        try {
            const res = await fetch('/api/spaces');
            if (res.ok) {
                const data = await res.json();
                setSpaces(data.spaces || []);
            }
        } catch (error) {
            console.error('Error fetching spaces:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSpace = async () => {
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

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden bg-[#050505] text-white relative">
            {/* Subtle Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-600/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-indigo-600/5 blur-[120px] rounded-full" />
                <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            {/* Clean Top Navigation Bar */}
            <header className="h-20 shrink-0 border-b border-white/5 bg-black/20 backdrop-blur-xl flex items-center justify-between px-8 z-20">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Folder size={18} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-medium tracking-tight" style={{ fontFamily: 'PP Editorial, serif' }}>
                            Spaces
                        </h1>
                    </div>

                    <div className="h-6 w-px bg-white/10 hidden md:block" />

                    <nav className="hidden lg:flex items-center gap-1">
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-white text-xs font-medium transition-all">
                            All Projects
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 text-xs font-medium transition-all">
                            Recent
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 text-xs font-medium transition-all">
                            Favorites
                        </button>
                    </nav>
                </div>

                <div className="flex items-center gap-4 flex-1 max-w-xl justify-end">
                    <div className="w-full relative group max-w-xs">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-500 transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search projects..."
                            className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-purple-600/30 focus:bg-white/10 transition-all placeholder-white/20"
                        />
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-xs font-bold shadow-md hover:bg-white/90 active:scale-95 transition-all"
                    >
                        <Plus size={14} />
                        New Space
                    </button>
                </div>
            </header>

            {/* Professional Wide-Screen Content */}
            <main className="flex-1 overflow-y-auto no-scrollbar z-10 relative">
                <div className="max-w-[1600px] mx-auto p-8 pb-32">
                    <div className="flex items-end justify-between mb-8 px-1">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Workspace</span>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-xl font-medium text-white/80">Active Projects</h2>
                                <span className="text-white/20 text-xs">{spaces.length} total</span>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="h-[40vh] flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-500/50" />
                        </div>
                    ) : filteredSpaces.length === 0 ? (
                        <div className="h-[50vh] flex flex-col items-center justify-center text-center max-w-md mx-auto">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 shadow-inner">
                                <Folder size={32} className="text-white/10" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-white/80">No workspaces yet</h3>
                            <p className="text-white/30 text-sm leading-relaxed mb-8">
                                Initialize a focused environment to organize your conversations and documents.
                            </p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                            >
                                <Plus size={18} />
                                Create Space
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                            {filteredSpaces.map((space) => (
                                <div
                                    key={space.id}
                                    onClick={() => router.push(`/space/${space.id}`)}
                                    className="group relative h-64 rounded-[32px] border border-white/5 bg-[#0D0D0D] hover:bg-[#121212] hover:border-purple-500/20 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
                                >
                                    <div className="p-8 flex flex-col h-full relative z-10">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-3xl border border-white/5 group-hover:border-purple-500/20 transition-all duration-300">
                                                {space.icon}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteSpace(space.id);
                                                }}
                                                className="w-10 h-10 rounded-xl text-white/5 hover:text-red-500/70 flex items-center justify-center transition-all duration-300"
                                            >
                                                <Trash2 size={16} className="opacity-0 group-hover:opacity-100" />
                                            </button>
                                        </div>

                                        <div className="mt-auto">
                                            <h3 className="text-xl font-semibold text-white/90 mb-1.5 group-hover:text-white transition-colors tracking-tight">
                                                {space.name}
                                            </h3>
                                            <p className="text-sm text-white/30 group-hover:text-white/50 line-clamp-2 leading-relaxed transition-colors">
                                                {space.description || "Establish a dedicated mission for this workspace."}
                                            </p>
                                        </div>

                                        <div className="mt-6 flex items-center justify-between pt-5 border-t border-white/5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 group-hover:scale-110 transition-transform" />
                                                <span className="text-[9px] font-bold text-white/10 group-hover:text-white/20 uppercase tracking-widest transition-colors">Workspace</span>
                                            </div>
                                            <Edit3 size={14} className="text-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Refined Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-[#0D0D0D] rounded-[40px] p-10 w-full max-w-2xl border border-white/5 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/10">
                                    <Plus className="text-purple-500" size={24} />
                                </div>
                                <h2 className="text-2xl font-semibold text-white tracking-tight">New Workspace</h2>
                            </div>
                            <button
                                onClick={() => { setShowCreateModal(false); resetForm(); }}
                                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20 hover:text-white transition-all"
                            >
                                <Plus size={18} className="rotate-45" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2.5">
                                    <label className="block text-[10px] font-bold text-white/20 uppercase tracking-widest px-1">Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Project Alpha..."
                                        className="w-full px-5 py-3.5 rounded-2xl border border-white/5 bg-white/5 text-white placeholder-white/10 focus:outline-none focus:ring-1 focus:ring-purple-600/30 transition-all font-medium"
                                    />
                                </div>

                                <div className="space-y-2.5">
                                    <label className="block text-[10px] font-bold text-white/20 uppercase tracking-widest px-1">Icon</label>
                                    <div className="grid grid-cols-6 gap-2">
                                        {icons.map((i) => (
                                            <button
                                                key={i}
                                                onClick={() => setIcon(i)}
                                                className={`h-11 rounded-xl flex items-center justify-center text-xl transition-all ${icon === i
                                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                                                    : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white'
                                                    }`}
                                            >
                                                {i}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2.5">
                                    <label className="block text-[10px] font-bold text-white/20 uppercase tracking-widest px-1">Description</label>
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Summary..."
                                        className="w-full px-5 py-3.5 rounded-2xl border border-white/5 bg-white/5 text-white placeholder-white/10 focus:outline-none focus:ring-1 focus:ring-purple-600/30 transition-all font-medium"
                                    />
                                </div>

                                <div className="space-y-2.5">
                                    <label className="block text-[10px] font-bold text-white/20 uppercase tracking-widest px-1">AI Context</label>
                                    <textarea
                                        value={systemPrompt}
                                        onChange={(e) => setSystemPrompt(e.target.value)}
                                        placeholder="Specific instructions..."
                                        rows={4}
                                        className="w-full px-5 py-4 rounded-[24px] border border-white/5 bg-white/5 text-white placeholder-white/10 focus:outline-none focus:ring-1 focus:ring-purple-600/30 transition-all font-medium resize-none text-sm leading-relaxed"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleCreateSpace}
                            disabled={creating}
                            className="w-full mt-10 py-4 rounded-2xl bg-white text-black font-bold text-sm tracking-tight hover:bg-white/90 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                        >
                            {creating ? <Loader2 size={20} className="animate-spin" /> : <Plus size={18} />}
                            Initialize Workspace
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpacesPage;
