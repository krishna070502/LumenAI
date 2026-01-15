import { UIConfigField } from '@/lib/config/types';
import { Model, ModelList, ProviderMetadata } from '../../types';
import BaseEmbedding from '../../base/embedding';
import BaseModelProvider from '../../base/provider';
import BaseLLM from '../../base/llm';
import OpenAILLM from '../openai/openaiLLM';
import OpenAIEmbedding from '../openai/openaiEmbedding';

interface NvidiaNIMConfig {
    apiKey: string;
    baseURL: string;
}

const defaultChatModels: Model[] = [
    {
        name: 'Llama 4 Maverick 17B 128E Instruct',
        key: 'meta/llama-4-maverick-17b-128e-instruct',
    },
    {
        name: 'DeepSeek R1 Distill Llama 8B',
        key: 'deepseek-ai/deepseek-r1-distill-llama-8b',
    },
    {
        name: 'Code Llama 70B',
        key: 'meta/codellama-70b',
    },
    {
        name: 'Code Llama 34B',
        key: 'meta/codellama-34b',
    },
    {
        name: 'Llama 3.1 8B Instruct',
        key: 'meta/llama-3.1-8b-instruct',
    },
    {
        name: 'Llama 3.1 70B Instruct',
        key: 'meta/llama-3.1-70b-instruct',
    },
    {
        name: 'Llama 3.1 405B Instruct',
        key: 'meta/llama-3.1-405b-instruct',
    },
    {
        name: 'Llama 3.2 1B Instruct',
        key: 'meta/llama-3.2-1b-instruct',
    },
    {
        name: 'Llama 3.2 3B Instruct',
        key: 'meta/llama-3.2-3b-instruct',
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
    {
        name: 'DeepSeek Coder V2',
        key: 'deepseek-ai/deepseek-coder-v2',
    },
];

const defaultEmbeddingModels: Model[] = [
    {
        name: 'NV-Embed-QA',
        key: 'nvidia/nv-embed-qa',
    },
    {
        name: 'NV-Embed-2',
        key: 'nvidia/nv-embed-v2',
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
        const { getConfiguredModelProviderById } = await import(
            '@/lib/config/serverRegistry'
        );
        const defaultModels = await this.getDefaultModels();
        const configProvider = getConfiguredModelProviderById(this.id)!;

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

        return new OpenAIEmbedding({
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
