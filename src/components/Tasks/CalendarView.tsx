'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
    id: string;
    title: string;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'completed';
    dueDate?: string;
}

interface CalendarViewProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onAddTask: (date?: Date) => void;
}

const priorityColors = {
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-red-500',
};

export default function CalendarView({ tasks, onTaskClick, onAddTask }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        return { daysInMonth, firstDayOfMonth };
    };

    const { daysInMonth, firstDayOfMonth } = getDaysInMonth(currentDate);

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const getTasksForDay = (day: number) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        return tasks.filter(task => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            return taskDate.toDateString() === date.toDateString();
        });
    };

    const isToday = (day: number) => {
        const today = new Date();
        return (
            today.getDate() === day &&
            today.getMonth() === currentDate.getMonth() &&
            today.getFullYear() === currentDate.getFullYear()
        );
    };

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-light-200 dark:border-dark-200">
                <h2 className="text-xl font-bold text-black dark:text-white">
                    {months[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToPreviousMonth}
                        className="p-2 hover:bg-light-200 dark:hover:bg-dark-200 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={20} className="text-black/60 dark:text-white/60" />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 py-1.5 text-sm font-medium text-purple-500 hover:bg-purple-500/10 rounded-lg transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={goToNextMonth}
                        className="p-2 hover:bg-light-200 dark:hover:bg-dark-200 rounded-lg transition-colors"
                    >
                        <ChevronRight size={20} className="text-black/60 dark:text-white/60" />
                    </button>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-light-200 dark:border-dark-200">
                {days.map(day => (
                    <div
                        key={day}
                        className="p-3 text-center text-xs font-medium text-black/50 dark:text-white/50 uppercase"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                {/* Empty cells for days before the first day of month */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div
                        key={`empty-${i}`}
                        className="border-b border-r border-light-200 dark:border-dark-200 bg-light-secondary/50 dark:bg-dark-secondary/50"
                    />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayTasks = getTasksForDay(day);
                    const today = isToday(day);

                    return (
                        <div
                            key={day}
                            className={cn(
                                'group border-b border-r border-light-200 dark:border-dark-200 p-2 min-h-[100px] hover:bg-light-secondary/50 dark:hover:bg-dark-secondary/50 transition-colors relative',
                                today && 'bg-purple-500/5'
                            )}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span
                                    className={cn(
                                        'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                                        today
                                            ? 'bg-purple-600 text-white'
                                            : 'text-black/70 dark:text-white/70'
                                    )}
                                >
                                    {day}
                                </span>
                                <button
                                    onClick={() => onAddTask(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-light-200 dark:hover:bg-dark-200 rounded transition-all"
                                >
                                    <Plus size={14} className="text-black/40 dark:text-white/40" />
                                </button>
                            </div>

                            {/* Tasks */}
                            <div className="space-y-1">
                                {dayTasks.slice(0, 3).map(task => (
                                    <button
                                        key={task.id}
                                        onClick={() => onTaskClick(task)}
                                        className={cn(
                                            'w-full text-left px-2 py-1 rounded text-xs truncate transition-colors',
                                            task.status === 'completed'
                                                ? 'bg-green-500/10 text-green-600 line-through'
                                                : 'bg-light-200 dark:bg-dark-200 text-black/80 dark:text-white/80 hover:bg-light-300 dark:hover:bg-dark-300'
                                        )}
                                    >
                                        <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1.5', priorityColors[task.priority])} />
                                        {task.title}
                                    </button>
                                ))}
                                {dayTasks.length > 3 && (
                                    <span className="text-[10px] text-black/40 dark:text-white/40 px-2">
                                        +{dayTasks.length - 3} more
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
