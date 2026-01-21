'use client';

import Chat from './Chat';
import SpaceEmptyChat from './SpaceEmptyChat';
import { useChat } from '@/lib/hooks/useChat';
import Loader from './ui/Loader';

interface Space {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    systemPrompt: string | null;
}

interface SpaceChatWindowProps {
    space: Space;
}

const SpaceChatWindow = ({ space }: SpaceChatWindowProps) => {
    const { hasError, messages, isReady } = useChat();

    if (hasError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="dark:text-white/70 text-black/70 text-sm">
                    Failed to connect to the server. Please try again later.
                </p>
            </div>
        );
    }

    return isReady ? (
        <div className="flex-1 flex flex-col min-h-0">
            {messages.length > 0 ? (
                <Chat />
            ) : (
                <SpaceEmptyChat
                    spaceName={space.name}
                    spaceIcon={space.icon}
                    spaceDescription={space.description}
                />
            )}
        </div>
    ) : (
        <div className="flex items-center justify-center min-h-screen w-full">
            <Loader />
        </div>
    );
};

export default SpaceChatWindow;
