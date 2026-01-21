'use client';

import EmptyChatMessageInput from './EmptyChatMessageInput';

interface SpaceEmptyChat {
    spaceName: string;
    spaceIcon: string;
    spaceDescription?: string | null;
}

const SpaceEmptyChat = ({ spaceName, spaceIcon, spaceDescription }: SpaceEmptyChat) => {
    return (
        <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="flex flex-col items-center justify-center h-full max-w-screen-sm mx-auto p-4 space-y-4">
                <div className="flex flex-col items-center justify-center w-full space-y-6">
                    <div className="text-center space-y-3">
                        <div className="text-5xl mb-2">{spaceIcon}</div>
                        <h2
                            className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight"
                            style={{
                                background: 'linear-gradient(90deg, #22d3ee, #a3e635, #facc15, #fb923c, #f87171, #a855f7, #6366f1)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            {spaceName}
                        </h2>
                        {spaceDescription && (
                            <p className="text-sm text-black/50 dark:text-white/50 max-w-md">
                                {spaceDescription}
                            </p>
                        )}
                    </div>
                    <EmptyChatMessageInput />
                </div>
            </div>
        </div>
    );
};

export default SpaceEmptyChat;
