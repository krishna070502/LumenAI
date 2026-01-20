'use client';

import { MessageCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat } from '@/lib/hooks/useChat';
import { motion } from 'motion/react';

const ChatModeToggle = () => {
    const { chatMode, setChatMode } = useChat();

    const modes = [
        { id: 'chat', label: 'Chat', icon: MessageCircle, color: 'from-purple-500 to-indigo-600', glow: 'shadow-purple-500/20' },
        { id: 'research', label: 'Research', icon: Search, color: 'from-blue-500 to-cyan-600', glow: 'shadow-blue-500/20' }
    ] as const;

    return (
        <div className="p-0.5 sm:p-1 rounded-2xl bg-light-200/50 dark:bg-dark-200/50 backdrop-blur-sm border border-light-300 dark:border-dark-300 flex items-center gap-0.5 sm:gap-1">
            {modes.map((mode) => {
                const isActive = chatMode === mode.id;
                const Icon = mode.icon;

                return (
                    <button
                        key={mode.id}
                        type="button"
                        onClick={() => setChatMode(mode.id)}
                        className={cn(
                            "relative flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl transition-all duration-300 group",
                            isActive ? "text-white" : "text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70"
                        )}
                        title={`Switch to ${mode.label} Mode`}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="active-pill"
                                className={cn(
                                    "absolute inset-0 rounded-xl bg-gradient-to-r shadow-lg z-0",
                                    mode.color,
                                    mode.glow
                                )}
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}

                        <div className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                            <Icon
                                className={cn(
                                    "w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform duration-300",
                                    isActive ? "scale-110" : "group-hover:scale-110"
                                )}
                            />
                            <span className="text-[10px] sm:text-xs font-semibold tracking-wide">
                                {mode.label}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default ChatModeToggle;

