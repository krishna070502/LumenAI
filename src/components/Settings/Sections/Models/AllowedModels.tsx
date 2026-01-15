'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Check } from 'lucide-react';

interface ModelInfo {
    providerId: string;
    providerName: string;
    modelKey: string;
    modelName: string;
}

interface ProvidersResponse {
    providers: Array<{
        id: string;
        name: string;
        chatModels: Array<{ key: string; name: string }>;
    }>;
}

const AllowedModels = () => {
    const [allModels, setAllModels] = useState<ModelInfo[]>([]);
    const [allowedModels, setAllowedModels] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadModels = async () => {
            try {
                setIsLoading(true);

                // Fetch all providers to get all available models
                const providersRes = await fetch('/api/providers');
                if (!providersRes.ok) throw new Error('Failed to fetch providers');
                const providersData: ProvidersResponse = await providersRes.json();

                // Build list of all chat models
                const models: ModelInfo[] = [];
                for (const provider of providersData.providers) {
                    for (const model of provider.chatModels || []) {
                        models.push({
                            providerId: provider.id,
                            providerName: provider.name,
                            modelKey: model.key,
                            modelName: model.name,
                        });
                    }
                }
                setAllModels(models);

                // Fetch currently allowed models
                const allowedRes = await fetch('/api/allowed-models');
                if (allowedRes.ok) {
                    const allowedData = await allowedRes.json();
                    setAllowedModels(allowedData.allowedModels || []);
                }
            } catch (error) {
                console.error('Error loading models:', error);
                toast.error('Failed to load models');
            } finally {
                setIsLoading(false);
            }
        };

        loadModels();
    }, []);

    const toggleModel = (modelId: string) => {
        setAllowedModels((prev) => {
            if (prev.includes(modelId)) {
                return prev.filter((id) => id !== modelId);
            } else {
                return [...prev, modelId];
            }
        });
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const res = await fetch('/api/allowed-models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ allowedModels }),
            });

            if (!res.ok) {
                throw new Error('Failed to save');
            }

            toast.success('Allowed models saved successfully');
        } catch (error) {
            console.error('Error saving allowed models:', error);
            toast.error('Failed to save allowed models');
        } finally {
            setIsSaving(false);
        }
    };

    const selectAll = () => {
        setAllowedModels(allModels.map((m) => `${m.providerId}/${m.modelKey}`));
    };

    const selectNone = () => {
        setAllowedModels([]);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-black/40 dark:text-white/40" />
            </div>
        );
    }

    // Group models by provider
    const modelsByProvider: Record<string, ModelInfo[]> = {};
    for (const model of allModels) {
        if (!modelsByProvider[model.providerName]) {
            modelsByProvider[model.providerName] = [];
        }
        modelsByProvider[model.providerName].push(model);
    }

    return (
        <div className="space-y-4">
            <section className="rounded-xl border border-light-200 bg-light-primary/80 p-4 lg:p-6 transition-colors dark:border-dark-200 dark:bg-dark-primary/80">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm text-black dark:text-white">
                                Allowed Chat Models
                            </h4>
                            <p className="text-[11px] lg:text-xs text-black/50 dark:text-white/50">
                                Select which models non-admin users can access in the chat dropdown
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={selectAll}
                                className="text-xs text-sky-500 hover:text-sky-600 transition"
                            >
                                Select All
                            </button>
                            <span className="text-black/30 dark:text-white/30">|</span>
                            <button
                                onClick={selectNone}
                                className="text-xs text-sky-500 hover:text-sky-600 transition"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                        {Object.entries(modelsByProvider).map(([providerName, models]) => (
                            <div key={providerName}>
                                <p className="text-xs text-black/50 dark:text-white/50 uppercase tracking-wider mb-2">
                                    {providerName}
                                </p>
                                <div className="space-y-1">
                                    {models.map((model) => {
                                        const modelId = `${model.providerId}/${model.modelKey}`;
                                        const isSelected = allowedModels.includes(modelId);

                                        return (
                                            <button
                                                key={modelId}
                                                onClick={() => toggleModel(modelId)}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition duration-200 ${isSelected
                                                        ? 'bg-sky-500/10 border border-sky-500/30'
                                                        : 'bg-light-secondary dark:bg-dark-secondary border border-transparent hover:border-light-300 dark:hover:border-dark-300'
                                                    }`}
                                            >
                                                <span
                                                    className={`text-xs ${isSelected
                                                            ? 'text-sky-500 font-medium'
                                                            : 'text-black/70 dark:text-white/70'
                                                        }`}
                                                >
                                                    {model.modelName}
                                                </span>
                                                {isSelected && (
                                                    <Check size={14} className="text-sky-500" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-light-200 dark:border-dark-200">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-black/50 dark:text-white/50">
                                {allowedModels.length === 0
                                    ? 'All models allowed (no restrictions)'
                                    : `${allowedModels.length} model${allowedModels.length > 1 ? 's' : ''} selected`}
                            </p>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-medium rounded-lg transition duration-200 disabled:opacity-50 flex items-center space-x-2"
                            >
                                {isSaving && <Loader2 size={14} className="animate-spin" />}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AllowedModels;
