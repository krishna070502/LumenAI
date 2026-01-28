import { UIConfigField } from '@/lib/config/types';
import { Model, ModelList, ProviderMetadata } from '../../types';
import BaseEmbedding from '../../base/embedding';
import BaseModelProvider from '../../base/provider';
import BaseLLM from '../../base/llm';
import OpenAILLM from '../openai/openaiLLM';
import NvidiaNIMEmbedding from './nvidiaNIMEmbedding';
import modelListCache from '../../cache';
import { hashObj } from '@/lib/serverUtils';

interface NvidiaNIMConfig {
    apiKey: string;
    baseURL: string;
}

const defaultChatModels: Model[] = [
    {
        name: 'DeepSeek R1',
        key: 'deepseek-ai/deepseek-r1',
    },
    {
        name: 'Llama 3.3 70B Instruct',
        key: 'nvidia/llama-3.3-70b-instruct',
    },
    {
        name: 'Llama 3.1 405B Instruct',
        key: 'meta/llama-3.1-405b-instruct',
    },
    {
        name: 'Llama 3.1 70B Instruct',
        key: 'meta/llama-3.1-70b-instruct',
    },
    {
        name: 'Llama 3.1 8B Instruct',
        key: 'meta/llama-3.1-8b-instruct',
    },
    {
        name: 'Mistral 7B Instruct v0.3',
        key: 'mistralai/mistral-7b-instruct-v0.3',
    },
    {
        name: 'Mixtral 8x7B Instruct',
        key: 'mistralai/mixtral-8x7b-instruct-v0.1',
    },
    {
        name: 'Nemotron 4 340B Instruct',
        key: 'nvidia/nemotron-4-340b-instruct',
    },
];

const defaultEmbeddingModels: Model[] = [
    {
        name: 'NV-EmbedQA E5 V5 (1024 d)',
        key: 'nvidia/nv-embedqa-e5-v5',
    },
    {
        name: 'NV-Embed-QA (Standard)',
        key: 'nvidia/nv-embed-qa',
    },
    {
        name: 'Llama 3.2 NV-EmbedQA 1B V2 (512 d)',
        key: 'nvidia/llama-3.2-nv-embedqa-1b-v2',
    },
];

const providerConfigFields: UIConfigField[] = [
    {
        type: 'password',
        name: 'API Key',
        key: 'apiKey',
        description: 'Your NVIDIA NIM API key',
        required: true,
        placeholder: 'nvapi-xxx',
        env: 'NVIDIA_NIM_API_KEY',
        scope: 'server',
    },
    {
        type: 'string',
        name: 'Base URL',
        key: 'baseURL',
        description: 'The base URL for the NVIDIA NIM API',
        required: true,
        placeholder: 'https://integrate.api.nvidia.com/v1',
        default: 'https://integrate.api.nvidia.com/v1',
        env: 'NVIDIA_NIM_BASE_URL',
        scope: 'server',
    },
];

class NvidiaNIMProvider extends BaseModelProvider<NvidiaNIMConfig> {
    constructor(id: string, name: string, config: NvidiaNIMConfig) {
        super(id, name, config);
    }

    async getDefaultModels(): Promise<ModelList> {
        return {
            embedding: defaultEmbeddingModels,
            chat: defaultChatModels,
        };
    }

    async getModelList(): Promise<ModelList> {
        const cacheKey = `nvidia-nim-${hashObj(this.config)}`;
        const cached = modelListCache.get(cacheKey);
        if (cached) return cached;

        const { getConfiguredModelProviderById } = await import(
            '@/lib/config/serverRegistry'
        );
        const defaultModels = await this.getDefaultModels();
        const configProvider = getConfiguredModelProviderById(this.id)!;

        try {
            const response = await fetch(`${this.config.baseURL}/models`, {
                headers: {
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const fetchedModels = data.data || [];

                const chat: Model[] = [...defaultModels.chat];
                const embedding: Model[] = [...defaultModels.embedding];

                fetchedModels.forEach((m: any) => {
                    const id = m.id;
                    const name = id.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

                    const model = { name, key: id };

                    // Heuristics for categorization
                    if (id.includes('embed') || id.includes('retriever')) {
                        if (!embedding.some(existing => existing.key === id)) {
                            embedding.push(model);
                        }
                    } else if (id.includes('instruct') || id.includes('chat') || id.includes('deepseek') || id.includes('llama') || id.includes('mistral')) {
                        if (!chat.some(existing => existing.key === id)) {
                            chat.push(model);
                        }
                    }
                });

                const result = {
                    embedding: [
                        ...embedding,
                        ...configProvider.embeddingModels,
                    ],
                    chat: [...chat, ...configProvider.chatModels],
                };

                modelListCache.set(cacheKey, result);
                return result;
            }
        } catch (err) {
            console.error('Failed to fetch models from NVIDIA NIM:', err);
        }

        return {
            embedding: [
                ...defaultModels.embedding,
                ...configProvider.embeddingModels,
            ],
            chat: [...defaultModels.chat, ...configProvider.chatModels],
        };
    }

    async loadChatModel(key: string): Promise<BaseLLM<any>> {
        const modelList = await this.getModelList();
        const exists = modelList.chat.find((m) => m.key === key);

        if (!exists) {
            throw new Error(
                'Error Loading NVIDIA NIM Chat Model. Invalid Model Selected',
            );
        }

        return new OpenAILLM({
            apiKey: this.config.apiKey,
            model: key,
            baseURL: this.config.baseURL,
        });
    }

    async loadEmbeddingModel(key: string): Promise<BaseEmbedding<any>> {
        const modelList = await this.getModelList();
        const exists = modelList.embedding.find((m) => m.key === key);

        if (!exists) {
            throw new Error(
                'Error Loading NVIDIA NIM Embedding Model. Invalid Model Selected.',
            );
        }

        return new NvidiaNIMEmbedding({
            apiKey: this.config.apiKey,
            model: key,
            baseURL: this.config.baseURL,
        });
    }

    static parseAndValidate(raw: any): NvidiaNIMConfig {
        if (!raw || typeof raw !== 'object')
            throw new Error('Invalid config provided. Expected object');
        if (!raw.apiKey || !raw.baseURL)
            throw new Error(
                'Invalid config provided. API key and base URL must be provided',
            );

        return {
            apiKey: String(raw.apiKey),
            baseURL: String(raw.baseURL),
        };
    }

    static getProviderConfigFields(): UIConfigField[] {
        return providerConfigFields;
    }

    static getProviderMetadata(): ProviderMetadata {
        return {
            key: 'nvidia-nim',
            name: 'NVIDIA NIM',
        };
    }
}

export default NvidiaNIMProvider;
