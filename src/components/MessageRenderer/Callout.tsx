'use client';

import React from 'react';
import { Info, AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalloutProps {
    children: React.ReactNode;
}

const Callout = ({ children }: CalloutProps) => {
    // Determine if there's a specific type based on content prefix (e.g., "Tip:", "Warning:")
    const textContent = typeof children === 'string' ? children : '';

    let icon = <Info className="text-blue-500" size={18} />;
    let bgColor = "bg-blue-50/50 dark:bg-blue-900/10";
    let borderColor = "border-blue-200/50 dark:border-blue-800/30";

    if (textContent.toLowerCase().startsWith('tip:') || textContent.toLowerCase().startsWith('insight:')) {
        icon = <Lightbulb className="text-amber-500" size={18} />;
        bgColor = "bg-amber-50/50 dark:bg-amber-900/10";
        borderColor = "border-amber-200/50 dark:border-amber-800/30";
    } else if (textContent.toLowerCase().startsWith('warning:') || textContent.toLowerCase().startsWith('note:')) {
        icon = <AlertCircle className="text-red-500" size={18} />;
        bgColor = "bg-red-50/50 dark:bg-red-900/10";
        borderColor = "border-red-200/50 dark:border-red-800/30";
    } else if (textContent.toLowerCase().startsWith('example:') || textContent.toLowerCase().startsWith('success:')) {
        icon = <CheckCircle2 className="text-emerald-500" size={18} />;
        bgColor = "bg-emerald-50/50 dark:bg-emerald-900/10";
        borderColor = "border-emerald-200/50 dark:border-emerald-800/30";
    }

    return (
        <div className={cn(
            "my-4 p-4 rounded-2xl border flex items-start gap-4 transition-all duration-300",
            bgColor,
            borderColor
        )}>
            <div className="mt-0.5 flex-shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0 prose prose-sm dark:prose-invert max-w-none prose-p:my-0 text-black/80 dark:text-white/80">
                {children}
            </div>
        </div>
    );
};

export default Callout;
