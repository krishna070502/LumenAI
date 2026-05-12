'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Flag, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
    id: string;
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'completed';
    dueDate?: string;
    projectId?: string;
    tags: string[];
}

interface Project {
    id: string;
    name: string;
    color: string;
    icon: string;
}

interface TaskFormProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    projects: Project[];
    defaultProjectId?: string | null;
    onSave: () => void;
}

export default function TaskForm({ isOpen, onClose, task, projects, defaultProjectId, onSave }: TaskFormProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [dueDate, setDueDate] = useState('');
    const [projectId, setProjectId] = useState('');
    const [saving, setSaving] = useState(false);

    // Populate form when editing
    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
            setPriority(task.priority);
            setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
            setProjectId(task.projectId || '');
        } else {
            setTitle('');
            setDescription('');
            setPriority('medium');
            setDueDate('');
            setProjectId(defaultProjectId || '');
        }
    }, [task, isOpen, defaultProjectId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setSaving(true);
        try {
            const url = task ? `/api/tasks/${task.id}` : '/api/tasks';
            const method = task ? 'PATCH' : 'POST';

            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim() || null,
                    priority,
                    dueDate: dueDate || null,
                    projectId: projectId || null,
                }),
            });

            onSave();
        } catch (err) {
            console.error('Error saving task:', err);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg mx-4 bg-light-secondary dark:bg-dark-secondary rounded-2xl shadow-2xl border border-light-200 dark:border-dark-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-light-200 dark:border-dark-200">
                    <h2 className="text-lg font-semibold text-black dark:text-white">
                        {task ? 'Edit Task' : 'New Task'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-light-200 dark:hover:bg-dark-200 rounded-lg transition-colors"
                    >
                        <X size={18} className="text-black/50 dark:text-white/50" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Title */}
                    <div>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Task title..."
                            className="w-full px-4 py-3 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-xl text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 transition-colors"
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add description..."
                            rows={3}
                            className="w-full px-4 py-3 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-xl text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                        />
                    </div>

                    {/* Options Row */}
                    <div className="flex flex-wrap gap-3">
                        {/* Due Date */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-light-primary dark:bg-dark-primary rounded-lg border border-light-200 dark:border-dark-200">
                            <Calendar size={16} className="text-black/40 dark:text-white/40" />
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="bg-transparent text-sm text-black dark:text-white focus:outline-none"
                            />
                        </div>

                        {/* Priority */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-light-primary dark:bg-dark-primary rounded-lg border border-light-200 dark:border-dark-200">
                            <Flag size={16} className="text-black/40 dark:text-white/40" />
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                                className="bg-transparent text-sm text-black dark:text-white focus:outline-none"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>

                        {/* Project */}
                        {projects.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-light-primary dark:bg-dark-primary rounded-lg border border-light-200 dark:border-dark-200">
                                <Folder size={16} className="text-black/40 dark:text-white/40" />
                                <select
                                    value={projectId}
                                    onChange={(e) => setProjectId(e.target.value)}
                                    className="bg-transparent text-sm text-black dark:text-white focus:outline-none"
                                >
                                    <option value="">No project</option>
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.icon} {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
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
                            disabled={!title.trim() || saving}
                            className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
