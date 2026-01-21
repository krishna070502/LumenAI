'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { ArrowLeft, Settings, Loader2, FileText } from 'lucide-react';
import { ChatProvider } from '@/lib/hooks/useChat';
import SpaceChatWindow from '@/components/SpaceChatWindow';
import Link from 'next/link';

interface Space {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    systemPrompt: string | null;
    createdAt: string;
}

const SpacePage = () => {
    const params = useParams();
    const router = useRouter();
    const spaceId = params.spaceId as string;

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
            <div className="h-full flex flex-col pt-10 px-6">
                {/* Minimal Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3 invisible lg:visible lg:opacity-0 pointer-events-none">
                        <span className="text-2xl">{space.icon}</span>
                        <h1 className="font-semibold text-xl text-black dark:text-white">
                            {space.name}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 rounded-lg hover:bg-light-200 dark:hover:bg-dark-200 transition text-black/60 dark:text-white/60">
                            <Settings size={20} />
                        </button>
                    </div>
                </div>

                {/* Chat Content */}
                <ChatProvider spaceSystemPrompt={space.systemPrompt}>
                    <SpaceChatWindow space={space} />
                </ChatProvider>
            </div>
        </div>
    );
};

export default SpacePage;
