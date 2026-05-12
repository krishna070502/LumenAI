'use client';

import { useState } from 'react';
import { Plus, MoreHorizontal, CheckCircle2, Circle, Flag, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
    id: string;
    title: string;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'completed';
    dueDate?: string;
    projectId?: string;
}

interface KanbanViewProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onAddTask: () => void;
    onStatusChange: (taskId: string, status: 'pending' | 'completed') => void;
}

const priorityColors = {
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-red-500',
};

const columns = [
    { id: 'pending', label: 'To Do', color: 'bg-blue-500' },
    { id: 'completed', label: 'Done', color: 'bg-green-500' },
];

export default function KanbanView({ tasks, onTaskClick, onAddTask, onStatusChange }: KanbanViewProps) {
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);

    const getColumnTasks = (columnId: string) => {
        return tasks.filter(task => task.status === columnId);
    };

    const handleDragStart = (e: React.DragEvent, task: Task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        if (draggedTask && draggedTask.status !== columnId) {
            onStatusChange(draggedTask.id, columnId as 'pending' | 'completed');
        }
        setDraggedTask(null);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="h-full flex gap-4 p-6 overflow-x-auto">
            {columns.map(column => {
                const columnTasks = getColumnTasks(column.id);

                return (
                    <div
                        key={column.id}
                        className="flex-shrink-0 w-80 flex flex-col bg-light-secondary/50 dark:bg-dark-secondary/50 rounded-2xl border border-light-200 dark:border-dark-200"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, column.id)}
                    >
                        {/* Column Header */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-light-200 dark:border-dark-200">
                            <div className={cn('w-2 h-2 rounded-full', column.color)} />
                            <span className="font-semibold text-black dark:text-white">
                                {column.label}
                            </span>
                            <span className="text-xs text-black/40 dark:text-white/40 bg-light-200 dark:bg-dark-200 px-2 py-0.5 rounded-full">
                                {columnTasks.length}
                            </span>
                        </div>

                        {/* Tasks */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {columnTasks.map(task => (
                                <div
                                    key={task.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task)}
                                    onClick={() => onTaskClick(task)}
                                    className={cn(
                                        'group bg-light-primary dark:bg-dark-primary rounded-xl p-4 border border-light-200 dark:border-dark-200 cursor-pointer transition-all',
                                        'hover:border-purple-500/30 hover:shadow-md',
                                        draggedTask?.id === task.id && 'opacity-50'
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <GripVertical size={16} className="text-black/20 dark:text-white/20 mt-1 cursor-grab" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {task.status === 'completed' ? (
                                                    <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                                                ) : (
                                                    <Circle size={16} className="text-black/30 dark:text-white/30 shrink-0" />
                                                )}
                                                <span className={cn(
                                                    'text-sm font-medium text-black dark:text-white truncate',
                                                    task.status === 'completed' && 'line-through opacity-60'
                                                )}>
                                                    {task.title}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={cn('w-2 h-2 rounded-full', priorityColors[task.priority])} />
                                                {task.dueDate && (
                                                    <span className="text-xs text-black/40 dark:text-white/40">
                                                        {formatDate(task.dueDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Add Task Button */}
                            {column.id === 'pending' && (
                                <button
                                    onClick={onAddTask}
                                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 hover:bg-light-200 dark:hover:bg-dark-200 rounded-xl transition-colors"
                                >
                                    <Plus size={16} />
                                    Add task
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
