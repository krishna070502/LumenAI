'use client';

import { useState } from 'react';
import { X, Folder } from 'lucide-react';

interface ProjectFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

const colorOptions = [
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Teal', value: '#14b8a6' },
];

const iconOptions = ['📁', '💼', '🏠', '📚', '🎯', '💡', '🚀', '⭐', '🔥', '💪', '🎨', '🛠️'];

export default function ProjectForm({ isOpen, onClose, onSave }: ProjectFormProps) {
    const [name, setName] = useState('');
    const [color, setColor] = useState('#8b5cf6');
    const [icon, setIcon] = useState('📁');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setSaving(true);
        try {
            await fetch('/api/tasks/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    color,
                    icon,
                }),
            });

            setName('');
            setColor('#8b5cf6');
            setIcon('📁');
            onSave();
        } catch (err) {
            console.error('Error creating project:', err);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md mx-4 bg-light-secondary dark:bg-dark-secondary rounded-2xl shadow-2xl border border-light-200 dark:border-dark-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-light-200 dark:border-dark-200">
                    <h2 className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
                        <Folder size={20} className="text-purple-500" />
                        New Group
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-light-200 dark:hover:bg-dark-200 rounded-lg transition-colors"
                    >
                        <X size={18} className="text-black/50 dark:text-white/50" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-black/70 dark:text-white/70 mb-2">
                            Group Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Work, Personal, Study..."
                            className="w-full px-4 py-3 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-xl text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 transition-colors"
                            autoFocus
                        />
                    </div>

                    {/* Icon Selection */}
                    <div>
                        <label className="block text-sm font-medium text-black/70 dark:text-white/70 mb-2">
                            Icon
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {iconOptions.map((iconOption) => (
                                <button
                                    key={iconOption}
                                    type="button"
                                    onClick={() => setIcon(iconOption)}
                                    className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg transition-all ${icon === iconOption
                                            ? 'bg-purple-600/20 ring-2 ring-purple-500'
                                            : 'bg-light-primary dark:bg-dark-primary hover:bg-light-200 dark:hover:bg-dark-200'
                                        }`}
                                >
                                    {iconOption}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Selection */}
                    <div>
                        <label className="block text-sm font-medium text-black/70 dark:text-white/70 mb-2">
                            Color
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {colorOptions.map((colorOption) => (
                                <button
                                    key={colorOption.value}
                                    type="button"
                                    onClick={() => setColor(colorOption.value)}
                                    className={`w-8 h-8 rounded-full transition-all ${color === colorOption.value
                                            ? 'ring-2 ring-offset-2 ring-offset-light-secondary dark:ring-offset-dark-secondary ring-purple-500'
                                            : 'hover:scale-110'
                                        }`}
                                    style={{ backgroundColor: colorOption.value }}
                                    title={colorOption.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="flex items-center gap-3 p-3 bg-light-primary dark:bg-dark-primary rounded-xl border border-light-200 dark:border-dark-200">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                            style={{ backgroundColor: `${color}20` }}
                        >
                            {icon}
                        </div>
                        <span className="text-black dark:text-white font-medium">
                            {name || 'Group Name'}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-dark-200 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || saving}
                            className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Creating...' : 'Create Group'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
