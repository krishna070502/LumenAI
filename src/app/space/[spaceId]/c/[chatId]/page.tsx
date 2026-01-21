'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ChatProvider } from '@/lib/hooks/useChat';
import Chat from '@/components/Chat';
import Link from 'next/link';

interface Space {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    systemPrompt: string | null;
}

const SpaceChatPage = () => {
    const params = useParams();
    const router = useRouter();
    const spaceId = params.spaceId as string;
    const chatId = params.chatId as string;

    const [space, setSpace] = useState<Space | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchSpace = async () => {
            try {
                const res = await fetch(`/api/spaces/${spaceId}`);
                if (!res.ok) {
                    setError(true);
                    return;
                }
                const data = await res.json();
                setSpace(data.space);
            } catch (err) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        if (spaceId) {
            fetchSpace();
        }
    }, [spaceId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    if (error || !space) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="text-black/60 dark:text-white/60">Space not found</p>
                <Link
                    href="/spaces"
                    className="text-purple-500 hover:underline"
                >
                    Back to Spaces
                </Link>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <ChatProvider spaceSystemPrompt={space.systemPrompt} spaceId={space.id}>
                <Chat />
            </ChatProvider>
        </div>
    );
};

export default SpaceChatPage;
