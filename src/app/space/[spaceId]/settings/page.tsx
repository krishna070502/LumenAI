'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Zap, Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface SpaceSettings {
    aiSuggestionsEnabled?: boolean;
}

interface Space {
    id: string;
    name: string;
    icon: string;
    description: string | null;
    systemPrompt: string | null;
    settings?: SpaceSettings;
}

const SpaceSettingsPage = () => {
    const params = useParams();
    const router = useRouter();
    const spaceId = params.spaceId as string;

    const [space, setSpace] = useState<Space | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [aiSuggestionsEnabled, setAiSuggestionsEnabled] = useState(true);

    useEffect(() => {
        const fetchSpace = async () => {
            try {
                const res = await fetch(`/api/spaces/${spaceId}`);
                if (!res.ok) {
                    toast.error('Failed to load space');
                    return;
                }
                const data = await res.json();
                setSpace(data.space);
                setName(data.space.name);
                setDescription(data.space.description || '');
                setSystemPrompt(data.space.systemPrompt || '');
                setAiSuggestionsEnabled(data.space.settings?.aiSuggestionsEnabled !== false);
            } catch (err) {
                toast.error('Failed to load space');
            } finally {
                setLoading(false);
            }
        };

        if (spaceId) {
            fetchSpace();
        }
    }, [spaceId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/spaces/${spaceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim(),
                    systemPrompt: systemPrompt.trim(),
                    settings: { aiSuggestionsEnabled },
                }),
            });

            if (!res.ok) {
                throw new Error('Failed to save');
            }

            toast.success('Settings saved successfully');
        } catch (err) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    if (!space) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <p className="text-white/60">Space not found</p>
                <Link href="/spaces" className="text-purple-500 hover:underline">
                    Back to Spaces
                </Link>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.push(`/space/${spaceId}`)}
                        className="p-2 rounded-lg hover:bg-white/10 transition"
                    >
                        <ArrowLeft size={20} className="text-white/70" />
                    </button>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{space.icon}</span>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Settings</h1>
                            <p className="text-white/50 text-sm">{space.name}</p>
                        </div>
                    </div>
                </div>

                {/* Settings Sections */}
                <div className="space-y-8">
                    {/* General Settings */}
                    <section className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-6">
                        <h2 className="text-lg font-semibold text-white mb-6">General</h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    Space Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition"
                                    placeholder="Enter space name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition resize-none"
                                    placeholder="Describe this space..."
                                />
                            </div>
                        </div>
                    </section>

                    {/* AI Settings */}
                    <section className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-6">
                        <h2 className="text-lg font-semibold text-white mb-6">AI Features</h2>

                        <div className="space-y-5">
                            {/* AI Suggestions Toggle */}
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                        <Zap size={20} className="text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium">AI Auto-Suggestions</h3>
                                        <p className="text-white/50 text-sm">
                                            Show AI-powered text completions while typing in documents
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setAiSuggestionsEnabled(!aiSuggestionsEnabled)}
                                    className={`relative w-12 h-7 rounded-full transition-colors ${aiSuggestionsEnabled
                                            ? 'bg-purple-600'
                                            : 'bg-white/20'
                                        }`}
                                >
                                    <span
                                        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${aiSuggestionsEnabled ? 'left-6' : 'left-1'
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* System Prompt */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    Custom AI Persona (System Prompt)
                                </label>
                                <textarea
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition resize-none font-mono text-sm"
                                    placeholder="Optional: Customize how the AI behaves in this space..."
                                />
                                <p className="text-white/40 text-xs mt-2">
                                    This prompt will guide the AI's behavior when chatting in this space
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpaceSettingsPage;
