'use client';

import { useState, useEffect } from 'react';
import { Plus, Calendar, ListTodo, Clock, CheckCircle2, Circle, Trash2, Edit2, Flag, Loader2, CalendarDays, Columns, Search, X, FolderPlus, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import TaskForm from '../../components/Tasks/TaskForm';
import ProjectForm from '../../components/Tasks/ProjectForm';
import CalendarView from '../../components/Tasks/CalendarView';
import KanbanView from '../../components/Tasks/KanbanView';
import { useAuth } from '@/lib/auth/useAuth';
import { toast } from 'sonner';

interface Task {
    id: string;
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'completed';
    dueDate?: string;
    projectId?: string;
    tags: string[];
    createdAt: string;
    completedAt?: string;
}

interface Project {
    id: string;
    name: string;
    color: string;
    icon: string;
}

const priorityColors = {
    low: 'text-blue-400',
    medium: 'text-yellow-400',
    high: 'text-red-400',
};

type ViewMode = 'list' | 'calendar' | 'kanban';
type TimeFilter = 'all' | 'today' | 'upcoming';
type StatusFilter = 'all' | 'pending' | 'completed';

export default function TasksPage() {
    const { isAuthenticated, loading: authLoading, login } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null);

    // Fetch tasks and projects
    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            setTasks([]);
            setLoading(false);
            return;
        }
        fetchTasks();
    }, [authLoading, isAuthenticated, timeFilter, statusFilter, selectedProjectId]);

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            setProjects([]);
            return;
        }
        fetchProjects();
    }, [authLoading, isAuthenticated]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (timeFilter !== 'all') params.set('view', timeFilter);
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (selectedProjectId) params.set('projectId', selectedProjectId);

            const res = await fetch(`/api/tasks?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setTasks(data.tasks || []);
            } else if (res.status === 401) {
                setTasks([]);
            }
        } catch (err) {
            console.error('Error fetching tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/tasks/projects');
            if (res.ok) {
                const data = await res.json();
                setProjects(data.projects || []);
            } else if (res.status === 401) {
                setProjects([]);
            }
        } catch (err) {
            console.error('Error fetching projects:', err);
        }
    };

    const requireAuth = (message: string) => {
        if (authLoading) return false;
        if (!isAuthenticated) {
            toast.error(message);
            login();
            return false;
        }
        return true;
    };

    const openTaskForm = (taskToEdit?: Task | null) => {
        if (!requireAuth('Please sign in to manage tasks')) return;
        setEditingTask(taskToEdit || null);
        setIsFormOpen(true);
    };

    const openProjectForm = () => {
        if (!requireAuth('Please sign in to create groups')) return;
        setIsProjectFormOpen(true);
    };

    const toggleTaskStatus = async (task: Task) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        try {
            await fetch(`/api/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            fetchTasks();
        } catch (err) {
            console.error('Error updating task:', err);
        }
    };

    const updateTaskStatus = async (taskId: string, status: 'pending' | 'completed') => {
        try {
            await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            fetchTasks();
        } catch (err) {
            console.error('Error updating task:', err);
        }
    };

    const deleteTask = async (taskId: string) => {
        try {
            await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
            fetchTasks();
        } catch (err) {
            console.error('Error deleting task:', err);
        }
    };

    const formatDueDate = (dateStr?: string) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getProjectById = (projectId?: string) => {
        return projects.find(p => p.id === projectId);
    };

    // Filter tasks by search
    const filteredTasks = tasks.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Count tasks per project
    const getTaskCountForProject = (projectId: string) => {
        return tasks.filter(t => t.projectId === projectId).length;
    };

    const viewModes = [
        { id: 'list' as const, label: 'List', icon: ListTodo },
        { id: 'calendar' as const, label: 'Calendar', icon: CalendarDays },
        { id: 'kanban' as const, label: 'Kanban', icon: Columns },
    ];

    const timeFilters = [
        { id: 'all' as const, label: 'All' },
        { id: 'today' as const, label: 'Today' },
        { id: 'upcoming' as const, label: 'Upcoming' },
    ];

    const statusFilters = [
        { id: 'all' as const, label: 'All' },
        { id: 'pending' as const, label: 'Pending' },
        { id: 'completed' as const, label: 'Completed' },
    ];

    // Show loading spinner while auth state is being determined
    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-light-200 dark:border-dark-200 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-light-200 dark:bg-dark-200 flex items-center justify-center mb-4">
                    <ListTodo size={26} className="text-black/30 dark:text-white/30" />
                </div>
                <h2 className="text-lg font-semibold text-black dark:text-white">Sign in to use Tasks</h2>
                <p className="mt-2 text-sm text-black/50 dark:text-white/50 max-w-sm">
                    Tasks and groups are tied to your account. Sign in to create, track, and manage them.
                </p>
                <button
                    onClick={login}
                    className="mt-5 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90 transition-all"
                >
                    Sign In
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col pt-6 lg:pt-10 border-b border-light-200/20 dark:border-dark-200/20 pb-4 lg:pb-6 px-4 lg:px-2">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
                    <div className="flex items-center justify-center lg:justify-start">
                        <ListTodo size={32} className="mb-2 lg:mb-2.5 lg:hidden" />
                        <ListTodo size={45} className="mb-2.5 hidden lg:block" />
                        <div className="flex flex-col">
                            <h1
                                className="text-3xl lg:text-5xl font-normal p-2 pb-0"
                                style={{ fontFamily: 'PP Editorial, serif' }}
                            >
                                Tasks
                            </h1>
                            <div className="px-2 text-xs lg:text-sm text-black/60 dark:text-white/60 text-center lg:text-left">
                                Manage your tasks and stay organized.
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center lg:justify-end gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-black/20 dark:border-white/20 px-2 py-0.5 text-xs text-black/60 dark:text-white/60">
                            <ListTodo size={14} />
                            {loading ? 'Loading…' : `${tasks.length} tasks`}
                        </span>
                        <button
                            onClick={() => {
                                openTaskForm(null);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-all"
                        >
                            <Plus size={16} />
                            <span className="hidden sm:inline">Add Task</span>
                            <span className="sm:hidden">Add</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-4 lg:px-2 pt-4">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tasks..."
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Filters & View Switcher */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 px-4 lg:px-2 pt-4 pb-2">
                <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-hide">
                    {/* Time Filter */}
                    <div className="flex gap-1 p-1 rounded-lg bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 shrink-0">
                        {timeFilters.map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => setTimeFilter(filter.id)}
                                className={cn(
                                    'px-2 sm:px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap',
                                    timeFilter === filter.id
                                        ? 'bg-purple-600 text-white'
                                        : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                                )}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>

                    {/* Status Filter */}
                    <div className="flex gap-1 p-1 rounded-lg bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 shrink-0">
                        {statusFilters.map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => setStatusFilter(filter.id)}
                                className={cn(
                                    'px-2 sm:px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap',
                                    statusFilter === filter.id
                                        ? 'bg-purple-600 text-white'
                                        : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                                )}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* View Mode Switcher */}
                <div className="flex gap-1 p-1 rounded-lg bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 shrink-0">
                    {viewModes.map(mode => (
                        <button
                            key={mode.id}
                            onClick={() => setViewMode(mode.id)}
                            className={cn(
                                'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 text-xs font-medium rounded-md transition-all',
                                viewMode === mode.id
                                    ? 'bg-purple-600 text-white'
                                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                            )}
                        >
                            <mode.icon size={14} />
                            <span className="hidden sm:inline">{mode.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Groups/Projects Filter */}
            {projects.length > 0 && (
                <div className="flex items-center gap-2 px-4 lg:px-2 pb-2 overflow-x-auto scrollbar-hide">
                    <Folder size={14} className="text-black/40 dark:text-white/40 shrink-0" />
                    <button
                        onClick={() => setSelectedProjectId(null)}
                        className={cn(
                            'px-3 py-1 text-xs font-medium rounded-full transition-all whitespace-nowrap',
                            !selectedProjectId
                                ? 'bg-purple-600 text-white'
                                : 'bg-light-secondary dark:bg-dark-secondary text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white border border-light-200 dark:border-dark-200'
                        )}
                    >
                        All Groups
                    </button>
                    {projects.map(project => (
                        <button
                            key={project.id}
                            onClick={() => setSelectedProjectId(selectedProjectId === project.id ? null : project.id)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-all whitespace-nowrap',
                                selectedProjectId === project.id
                                    ? 'text-white'
                                    : 'bg-light-secondary dark:bg-dark-secondary text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white border border-light-200 dark:border-dark-200'
                            )}
                            style={selectedProjectId === project.id ? { backgroundColor: project.color } : {}}
                        >
                            <span>{project.icon}</span>
                            {project.name}
                        </button>
                    ))}
                    <button
                        onClick={openProjectForm}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-light-200 dark:bg-dark-200 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-all whitespace-nowrap"
                    >
                        <FolderPlus size={12} />
                        <span className="hidden sm:inline">New Group</span>
                    </button>
                </div>
            )}

            {/* No projects hint */}
            {projects.length === 0 && (
                <div className="px-4 lg:px-2 pb-2">
                    <button
                        onClick={openProjectForm}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl bg-light-secondary dark:bg-dark-secondary border border-dashed border-light-200 dark:border-dark-200 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:border-purple-500/50 transition-all w-full justify-center"
                    >
                        <FolderPlus size={14} />
                        Create your first group to organize tasks
                    </button>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex flex-row items-center justify-center min-h-[60vh]">
                    <svg
                        aria-hidden="true"
                        className="w-8 h-8 text-light-200 fill-light-secondary dark:text-[#202020] animate-spin dark:fill-[#ffffff3b]"
                        viewBox="0 0 100 101"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M100 50.5908C100.003 78.2051 78.1951 100.003 50.5908 100C22.9765 99.9972 0.997224 78.018 1 50.4037C1.00281 22.7993 22.8108 0.997224 50.4251 1C78.0395 1.00281 100.018 22.8108 100 50.4251ZM9.08164 50.594C9.06312 73.3997 27.7909 92.1272 50.5966 92.1457C73.4023 92.1642 92.1298 73.4365 92.1483 50.6308C92.1669 27.8251 73.4392 9.0973 50.6335 9.07878C27.8278 9.06026 9.10003 27.787 9.08164 50.594Z"
                            fill="currentColor"
                        />
                        <path
                            d="M93.9676 39.0409C96.393 38.4037 97.8624 35.9116 96.9801 33.5533C95.1945 28.8227 92.871 24.3692 90.0681 20.348C85.6237 14.1775 79.4473 9.36872 72.0454 6.45794C64.6435 3.54717 56.3134 2.65431 48.3133 3.89319C45.869 4.27179 44.3768 6.77534 45.014 9.20079C45.6512 11.6262 48.1343 13.0956 50.5786 12.717C56.5073 11.8281 62.5542 12.5399 68.0406 14.7911C73.527 17.0422 78.2187 20.7487 81.5841 25.4923C83.7976 28.5886 85.4467 32.059 86.4416 35.7474C87.1273 38.1189 89.5423 39.6781 91.9676 39.0409Z"
                            fill="currentFill"
                        />
                    </svg>
                </div>
            ) : viewMode === 'calendar' ? (
                <div className="px-2 pt-4 pb-28" style={{ height: 'calc(100vh - 300px)' }}>
                    <CalendarView
                        tasks={filteredTasks}
                        onTaskClick={(task) => {
                            openTaskForm(task as Task);
                        }}
                        onAddTask={() => {
                            openTaskForm(null);
                        }}
                    />
                </div>
            ) : viewMode === 'kanban' ? (
                <div className="px-2 pt-4 pb-28" style={{ height: 'calc(100vh - 300px)' }}>
                    <KanbanView
                        tasks={filteredTasks}
                        onTaskClick={(task) => {
                            openTaskForm(task as Task);
                        }}
                        onAddTask={() => {
                            openTaskForm(null);
                        }}
                        onStatusChange={updateTaskStatus}
                    />
                </div>
            ) : filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh] lg:min-h-[70vh] px-4 text-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary">
                        {searchQuery ? <Search className="text-black/70 dark:text-white/70" /> : <ListTodo className="text-black/70 dark:text-white/70" />}
                    </div>
                    <p className="mt-2 text-black/70 dark:text-white/70 text-sm">
                        {searchQuery ? `No tasks matching "${searchQuery}"` : 'No tasks yet.'}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={() => {
                                openTaskForm(null);
                            }}
                            className="mt-3 text-purple-500 hover:text-purple-600 text-sm font-medium"
                        >
                            Create your first task
                        </button>
                    )}
                </div>
            ) : (
                <div className="pt-4 pb-28 px-4 lg:px-2">
                    <div className="rounded-2xl border border-light-200 dark:border-dark-200 overflow-hidden bg-light-primary dark:bg-dark-primary">
                        {filteredTasks.map((task, index) => {
                            const project = getProjectById(task.projectId);
                            return (
                                <div
                                    key={task.id}
                                    className={cn(
                                        'group flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors duration-200',
                                        index !== filteredTasks.length - 1 && 'border-b border-light-200 dark:border-dark-200',
                                        task.status === 'completed' && 'opacity-60'
                                    )}
                                >
                                    {/* Checkbox */}
                                    <button
                                        onClick={() => toggleTaskStatus(task)}
                                        className="shrink-0"
                                    >
                                        {task.status === 'completed' ? (
                                            <CheckCircle2 size={22} className="text-green-500" />
                                        ) : (
                                            <Circle size={22} className="text-black/30 dark:text-white/30 hover:text-purple-500 transition-colors" />
                                        )}
                                    </button>

                                    {/* Task Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                'text-black dark:text-white font-medium',
                                                task.status === 'completed' && 'line-through'
                                            )}>
                                                {task.title}
                                            </span>
                                            {task.priority !== 'medium' && (
                                                <Flag size={14} className={priorityColors[task.priority]} />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-black/40 dark:text-white/40">
                                            {task.dueDate && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {formatDueDate(task.dueDate)}
                                                </span>
                                            )}
                                            {project && (
                                                <span className="flex items-center gap-1">
                                                    <span>{project.icon}</span>
                                                    {project.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions - visible on mobile, hover on desktop */}
                                    <div className="flex sm:opacity-0 sm:group-hover:opacity-100 items-center gap-1 transition-opacity shrink-0">
                                        <button
                                            onClick={() => {
                                                openTaskForm(task);
                                            }}
                                            className="p-2 hover:bg-light-200 dark:hover:bg-dark-200 rounded-lg transition-colors"
                                        >
                                            <Edit2 size={16} className="text-black/50 dark:text-white/50" />
                                        </button>
                                        <button
                                            onClick={() => deleteTask(task.id)}
                                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} className="text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Task Form Modal */}
            <TaskForm
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setEditingTask(null);
                    setDefaultProjectId(null);
                }}
                task={editingTask}
                projects={projects}
                defaultProjectId={defaultProjectId}
                onSave={() => {
                    fetchTasks();
                    setIsFormOpen(false);
                    setEditingTask(null);
                    setDefaultProjectId(null);
                }}
            />

            {/* Project Form Modal */}
            <ProjectForm
                isOpen={isProjectFormOpen}
                onClose={() => setIsProjectFormOpen(false)}
                onSave={() => {
                    fetchProjects();
                    setIsProjectFormOpen(false);
                }}
            />
        </div>
    );
}
