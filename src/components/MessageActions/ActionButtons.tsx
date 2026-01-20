'use client';

import React from 'react';
import {
    FileText,
    Search,
    Mail,
    ListChecks,
    Sparkles,
    Zap
} from 'lucide-react';
import { useChat } from '@/lib/hooks/useChat';

const ActionButtons = () => {
    const { sendMessage, loading } = useChat();

    const actions = [
        {
            label: 'Summarize',
            icon: <FileText size={14} />,
            query: 'Can you summarize this into key bullet points?',
            color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
        },
        {
            label: 'Explain Further',
            icon: <Search size={14} />,
            query: 'Could you explain this in more detail for a beginner?',
            color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20'
        },
        {
            label: 'Action Plan',
            icon: <ListChecks size={14} />,
            query: 'Can you create a step-by-step action plan based on this?',
            color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
        },
        {
            label: 'Draft Email',
            icon: <Mail size={14} />,
            query: 'Draft a professional email based on this information.',
            color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20'
        }
    ];

    if (loading) return null;

    return (
        <div className="flex flex-wrap gap-2 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {actions.map((action, idx) => (
                <button
                    key={idx}
                    onClick={() => sendMessage(action.query)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-transparent hover:border-light-200 dark:hover:border-dark-200 transition-all duration-200 ${action.color} hover:shadow-sm`}
                >
                    {action.icon}
                    {action.label}
                </button>
            ))}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40 border border-dashed border-light-200 dark:border-dark-200">
                <Zap size={10} className="text-amber-500" />
                Quick Actions
            </div>
        </div>
    );
};

export default ActionButtons;
