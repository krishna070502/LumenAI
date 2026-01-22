'use client';

import { useChat } from '@/lib/hooks/useChat';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const TemporaryChatToggle = () => {
    const { isTemporaryChat, setIsTemporaryChat } = useChat();
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsTemporaryChat(!isTemporaryChat)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className={cn(
                    'p-2.5 rounded-full transition-all duration-200 relative',
                    isTemporaryChat
                        ? 'bg-emerald-500/20 ring-2 ring-emerald-500/50 hover:bg-emerald-500/30'
                        : 'bg-light-200 dark:bg-dark-200 hover:bg-light-300 dark:hover:bg-dark-300'
                )}
                aria-label={isTemporaryChat ? 'Disable temporary chat' : 'Enable temporary chat'}
            >
                {/* Custom icon from uploaded image */}
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(
                        'transition-colors duration-200',
                        isTemporaryChat
                            ? 'text-emerald-500'
                            : 'text-black/60 dark:text-white/60'
                    )}
                >
                    {/* Dotted circle representing temporary/ephemeral nature */}
                    <circle cx="12" cy="12" r="10" strokeDasharray="3 3" />
                    {/* Inner dot */}
                    <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
                </svg>

                {/* Active indicator dot */}
                {isTemporaryChat && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                )}
            </button>

            {/* Tooltip - positioned to the left */}
            {showTooltip && (
                <div className="absolute top-1/2 right-full -translate-y-1/2 mr-2 px-3 py-2 bg-black/90 dark:bg-white/90 rounded-lg whitespace-nowrap z-50 shadow-lg">
                    <p className="text-xs font-medium text-white dark:text-black">
                        {isTemporaryChat ? 'Temporary Chat Enabled' : 'Enable Temporary Chat'}
                    </p>
                    <p className="text-[10px] text-white/70 dark:text-black/70 mt-0.5">
                        {isTemporaryChat
                            ? 'Chats won\'t be saved or remembered'
                            : 'Click to disable saving & memory'}
                    </p>
                    {/* Tooltip arrow pointing right */}
                    <div className="absolute top-1/2 left-full -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-black/90 dark:border-l-white/90" />
                </div>
            )}
        </div>
    );
};

export default TemporaryChatToggle;
