'use client';

import { useEffect, useState } from 'react';
import { Brain, Trash2, Loader2, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Memory {
    id: number;
    content: string;
    importance: number;
    createdAt: string;
    lastAccessedAt: string;
}

const MemorySection = () => {
    const [memories, setMemories] = useState<Memory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [memoryEnabled, setMemoryEnabled] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Load memory preference from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('memoryEnabled');
        setMemoryEnabled(saved !== 'false'); // Default to true
    }, []);

    // Fetch memories
    useEffect(() => {
        const fetchMemories = async () => {
            try {
                setIsLoading(true);
                const res = await fetch('/api/user-memories');
                if (!res.ok) throw new Error('Failed to fetch memories');
                const data = await res.json();
                setMemories(data.memories || []);
            } catch (error) {
                console.error('Error fetching memories:', error);
                toast.error('Failed to load memories');
            } finally {
                setIsLoading(false);
            }
        };

        fetchMemories();
    }, []);

    const handleToggleMemory = async () => {
        const newValue = !memoryEnabled;
        setMemoryEnabled(newValue);
        localStorage.setItem('memoryEnabled', String(newValue));

        // Also save to server-side preferences
        setIsSaving(true);
        try {
            await fetch('/api/user-preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    preferences: { memoryEnabled: newValue }
                }),
            });
            toast.success(newValue ? 'Memory enabled' : 'Memory disabled');
        } catch (error) {
            console.error('Error saving preference:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteMemory = async (id: number) => {
        setIsDeleting(id);
        try {
            const res = await fetch(`/api/user-memories?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete memory');
            setMemories((prev) => prev.filter((m) => m.id !== id));
            toast.success('Memory deleted');
        } catch (error) {
            console.error('Error deleting memory:', error);
            toast.error('Failed to delete memory');
        } finally {
            setIsDeleting(null);
        }
    };

    const handleDeleteAllMemories = async () => {
        if (!confirm('Are you sure you want to delete ALL your memories? This cannot be undone.')) {
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/user-memories?all=true', { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete memories');
            setMemories([]);
            toast.success('All memories deleted');
        } catch (error) {
            console.error('Error deleting memories:', error);
            toast.error('Failed to delete memories');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {/* Memory Toggle */}
            <div className="flex items-center justify-between p-4 bg-light-secondary dark:bg-dark-secondary rounded-lg">
                <div className="flex items-center space-x-3">
                    <Brain className="w-5 h-5 text-purple-500" />
                    <div>
                        <p className="text-sm font-medium text-black dark:text-white">
                            Personalization Memory
                        </p>
                        <p className="text-xs text-black/60 dark:text-white/60">
                            Allow the AI to remember information about you across conversations
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleToggleMemory}
                    disabled={isSaving}
                    className="flex items-center space-x-2 transition-colors"
                >
                    {memoryEnabled ? (
                        <ToggleRight className="w-10 h-10 text-purple-500" />
                    ) : (
                        <ToggleLeft className="w-10 h-10 text-black/30 dark:text-white/30" />
                    )}
                </button>
            </div>

            {/* Information Box */}
            <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700 dark:text-blue-300">
                    <p className="font-medium mb-1">How Memory Works</p>
                    <p>The AI learns facts about you from your conversations (like your name, preferences, and interests) and uses them to personalize future responses. You can delete any memory at any time.</p>
                </div>
            </div>

            {/* Memories List */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-black dark:text-white">
                        Your Memories ({memories.length})
                    </h3>
                    {memories.length > 0 && (
                        <button
                            onClick={handleDeleteAllMemories}
                            className="text-xs text-red-500 hover:text-red-600 flex items-center space-x-1"
                        >
                            <Trash2 size={12} />
                            <span>Delete All</span>
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                    </div>
                ) : memories.length === 0 ? (
                    <div className="text-center py-12 text-black/50 dark:text-white/50">
                        <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No memories yet</p>
                        <p className="text-xs mt-1">As you chat, the AI will learn about you</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {memories.map((memory) => (
                            <div
                                key={memory.id}
                                className="group flex items-start justify-between p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-black dark:text-white">
                                        {memory.content}
                                    </p>
                                    <p className="text-xs text-black/40 dark:text-white/40 mt-1">
                                        Learned on {formatDate(memory.createdAt)}
                                        {memory.importance > 3 && (
                                            <span className="ml-2 text-purple-500">★ Important</span>
                                        )}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDeleteMemory(memory.id)}
                                    disabled={isDeleting === memory.id}
                                    className={cn(
                                        'ml-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all',
                                        'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500'
                                    )}
                                >
                                    {isDeleting === memory.id ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={14} />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemorySection;
