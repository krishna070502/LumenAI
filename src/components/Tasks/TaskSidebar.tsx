'use client';

import { ListTodo, Calendar, Clock, Plus, Folder, CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Project {
    id: string;
    name: string;
    color: string;
    icon: string;
}

interface TaskSidebarProps {
    projects: Project[];
    selectedProjectId: string | null;
    onSelectProject: (id: string | null) => void;
    onAddProject: () => void;
    view: 'all' | 'today' | 'upcoming';
    onViewChange: (view: 'all' | 'today' | 'upcoming') => void;
    statusFilter: 'all' | 'pending' | 'completed';
    onStatusFilterChange: (status: 'all' | 'pending' | 'completed') => void;
}

export default function TaskSidebar({
    projects,
    selectedProjectId,
    onSelectProject,
    onAddProject,
    view,
    onViewChange,
    statusFilter,
    onStatusFilterChange,
}: TaskSidebarProps) {
    const viewItems = [
        { id: 'all' as const, label: 'All Tasks', icon: ListTodo },
        { id: 'today' as const, label: 'Today', icon: Calendar },
        { id: 'upcoming' as const, label: 'Upcoming', icon: Clock },
    ];

    const statusItems = [
        { id: 'all' as const, label: 'All', icon: Circle },
        { id: 'pending' as const, label: 'Pending', icon: Circle },
        { id: 'completed' as const, label: 'Completed', icon: CheckCircle },
    ];

    return (
        <div className="w-64 h-full bg-light-secondary dark:bg-dark-secondary border-r border-light-200 dark:border-dark-200 flex flex-col">
            {/* Header */}
            <div className="px-6 py-6">
                <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
                    <ListTodo size={24} className="text-purple-500" />
                    Tasks
                </h2>
            </div>

            {/* Views */}
            <div className="px-3 mb-4">
                <div className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest px-3 mb-2">
                    Views
                </div>
                {viewItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            onViewChange(item.id);
                            onSelectProject(null);
                        }}
                        className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                            view === item.id && !selectedProjectId
                                ? 'bg-purple-600/10 text-purple-500 border border-purple-500/20'
                                : 'text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-dark-200'
                        )}
                    >
                        <item.icon size={18} />
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Status Filter */}
            <div className="px-3 mb-4">
                <div className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest px-3 mb-2">
                    Status
                </div>
                <div className="flex gap-1 px-2">
                    {statusItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onStatusFilterChange(item.id)}
                            className={cn(
                                'flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all',
                                statusFilter === item.id
                                    ? 'bg-purple-600/10 text-purple-500'
                                    : 'text-black/50 dark:text-white/50 hover:bg-light-200 dark:hover:bg-dark-200'
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Projects */}
            <div className="px-3 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between px-3 mb-2">
                    <span className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest">
                        Projects
                    </span>
                    <button
                        onClick={onAddProject}
                        className="p-1 hover:bg-light-200 dark:hover:bg-dark-200 rounded-md transition-colors"
                    >
                        <Plus size={14} className="text-black/40 dark:text-white/40" />
                    </button>
                </div>

                {projects.length === 0 ? (
                    <div className="text-center py-4 text-xs text-black/40 dark:text-white/40">
                        No projects yet
                    </div>
                ) : (
                    projects.map((project) => (
                        <button
                            key={project.id}
                            onClick={() => {
                                onSelectProject(project.id === selectedProjectId ? null : project.id);
                            }}
                            className={cn(
                                'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all',
                                selectedProjectId === project.id
                                    ? 'bg-purple-600/10 text-purple-500 border border-purple-500/20'
                                    : 'text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-dark-200'
                            )}
                        >
                            <span>{project.icon}</span>
                            <span className="truncate">{project.name}</span>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
