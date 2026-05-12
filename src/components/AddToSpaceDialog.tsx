'use client';

import { useState, useEffect } from 'react';
import { X, Folder, Loader2, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Space {
    id: string;
    name: string;
    icon: string;
}

interface AddToSpaceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    chatId: string;
    chatTitle: string;
    currentSpaceId?: string | null;
    onSuccess?: () => void;
}

const AddToSpaceDialog = ({
    isOpen,
    onClose,
    chatId,
    chatTitle,
    currentSpaceId,
    onSuccess,
}: AddToSpaceDialogProps) => {
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(currentSpaceId || null);

    useEffect(() => {
        if (isOpen) {
            fetchSpaces();
            setSelectedSpaceId(currentSpaceId || null);
        }
    }, [isOpen, currentSpaceId]);

    const fetchSpaces = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/spaces');
            if (res.ok) {
                const data = await res.json();
                setSpaces(data.spaces || []);
            }
        } catch (error) {
            console.error('Failed to fetch spaces:', error);
            toast.error('Failed to load spaces');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/chats/${chatId}/space`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ spaceId: selectedSpaceId }),
            });

            if (res.ok) {
                toast.success(selectedSpaceId ? 'Chat added to space' : 'Chat removed from space');
                onSuccess?.();
                onClose();
            } else {
                const data = await res.json();
                toast.error(data.message || 'Failed to update');
            }
        } catch (error) {
            console.error('Failed to update chat space:', error);
            toast.error('Failed to update chat space');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative w-full max-w-md mx-4 bg-light-primary dark:bg-dark-secondary rounded-xl shadow-2xl border border-light-200 dark:border-dark-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-light-200 dark:border-dark-200">
                    <h3 className="text-lg font-semibold text-black dark:text-white">
                        Add to Space
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
                    >
                        <X size={18} className="text-black/60 dark:text-white/60" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    <p className="text-sm text-black/60 dark:text-white/60 mb-4">
                        Select a space for &quot;{chatTitle}&quot;
                    </p>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 size={24} className="animate-spin text-purple-500" />
                        </div>
                    ) : spaces.length === 0 ? (
                        <div className="text-center py-8">
                            <Folder size={40} className="mx-auto mb-3 text-black/20 dark:text-white/20" />
                            <p className="text-sm text-black/60 dark:text-white/60 mb-4">
                                No spaces yet. Create one to organize your chats.
                            </p>
                            <a
                                href="/spaces"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Plus size={16} />
                                Create Space
                            </a>
                        </div>
                    ) : (
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                            {/* Option to remove from space */}
                            {currentSpaceId && (
                                <button
                                    onClick={() => setSelectedSpaceId(null)}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                                        selectedSpaceId === null
                                            ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700'
                                            : 'hover:bg-light-200 dark:hover:bg-dark-200'
                                    )}
                                >
                                    <span className="text-lg">🚫</span>
                                    <span className="flex-1 text-sm font-medium text-black dark:text-white">
                                        Remove from space
                                    </span>
                                    {selectedSpaceId === null && (
                                        <Check size={16} className="text-purple-600 dark:text-purple-400" />
                                    )}
                                </button>
                            )}

                            {/* Space options */}
                            {spaces.map((space) => (
                                <button
                                    key={space.id}
                                    onClick={() => setSelectedSpaceId(space.id)}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                                        selectedSpaceId === space.id
                                            ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700'
                                            : 'hover:bg-light-200 dark:hover:bg-dark-200'
                                    )}
                                >
                                    <span className="text-lg">{space.icon}</span>
                                    <span className="flex-1 text-sm font-medium text-black dark:text-white truncate">
                                        {space.name}
                                    </span>
                                    {selectedSpaceId === space.id && (
                                        <Check size={16} className="text-purple-600 dark:text-purple-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {spaces.length > 0 && (
                    <div className="flex items-center justify-end gap-3 p-4 border-t border-light-200 dark:border-dark-200">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-dark-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || selectedSpaceId === currentSpaceId}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            {saving && <Loader2 size={14} className="animate-spin" />}
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddToSpaceDialog;
