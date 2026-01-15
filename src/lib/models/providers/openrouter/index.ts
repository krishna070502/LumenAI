import { UIConfigField } from '@/lib/config/types';
import { Model, ModelList, ProviderMetadata } from '../../types';
import BaseEmbedding from '../../base/embedding';
import BaseModelProvider from '../../base/provider';
import BaseLLM from '../../base/llm';
import OpenAILLM from '../openai/openaiLLM';

interface OpenRouterConfig {
    apiKey: string;
    baseURL: string;
}

const defaultChatModels: Model[] = [
    {
        name: 'GPT-4o',
        key: 'openai/gpt-4o',
    },
    {
        name: 'GPT-4 Turbo',
        key: 'openai/gpt-4-turbo',
    },
    {
        name: 'Claude 3.5 Sonnet',
        key: 'anthropic/claude-3.5-sonnet',
    },
    {
        name: 'Claude 3 Opus',
        key: 'anthropic/claude-3-opus',
    },
    {
        name: 'Llama 3.1 405B',
        key: 'meta-llama/llama-3.1-405b-instruct',
    },
    {
        name: 'Llama 3.1 70B',
        key: 'meta-llama/llama-3.1-70b-instruct',
    },
    {
        name: 'Gemini Pro 1.5',
        key: 'google/gemini-pro-1.5',
    },
    {
        name: 'Mixtral 8x7B',
        key: 'mistralai/mixtral-8x7b-instruct',
    },
    {
        name: 'DeepSeek V3',
        key: 'deepseek/deepseek-chat',
    },
];

const providerConfigFields: UIConfigField[] = [
    {
        type: 'password',
        name: 'API Key',
        key: 'apiKey',
        description: 'Your OpenRouter API key',
        required: true,
        placeholder: 'sk-or-xxx',
        env: 'OPENROUTER_API_KEY',
        scope: 'server',
    },
    {
        type: 'string',
        name: 'Base URL',
        key: 'baseURL',
        description: 'The base URL for the OpenRouter API',
        required: true,
        placeholder: 'https://openrouter.ai/api/v1',
        default: 'https://openrouter.ai/api/v1',
        env: 'OPENROUTER_BASE_URL',
        scope: 'server',
    },
];

class OpenRouterProvider extends BaseModelProvider<OpenRouterConfig> {
    constructor(id: string, name: string, config: OpenRouterConfig) {
        super(id, name, config);
    }

    async getDefaultModels(): Promise<ModelList> {
        return {
            embedding: [],
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
            embedding: [...configProvider.embeddingModels],
            chat: [...defaultModels.chat, ...configProvider.chatModels],
        };
    }

    async loadChatModel(key: string): Promise<BaseLLM<any>> {
        const modelList = await this.getModelList();
        const exists = modelList.chat.find((m) => m.key === key);

        if (!exists) {
            throw new Error(
                'Error Loading OpenRouter Chat Model. Invalid Model Selected',
            );
        }

        return new OpenAILLM({
            apiKey: this.config.apiKey,
            model: key,
            baseURL: this.config.baseURL,
        });
    }

    async loadEmbeddingModel(key: string): Promise<BaseEmbedding<any>> {
        throw new Error('OpenRouter does not support embeddings');
    }

    static parseAndValidate(raw: any): OpenRouterConfig {
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
            key: 'openrouter',
            name: 'OpenRouter',
        };
    }
}

export default OpenRouterProvider;
