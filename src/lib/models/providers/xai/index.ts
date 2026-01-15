import { UIConfigField } from '@/lib/config/types';
import { Model, ModelList, ProviderMetadata } from '../../types';
import BaseEmbedding from '../../base/embedding';
import BaseModelProvider from '../../base/provider';
import BaseLLM from '../../base/llm';
import OpenAILLM from '../openai/openaiLLM';

interface XAIConfig {
    apiKey: string;
    baseURL: string;
}

const defaultChatModels: Model[] = [
    {
        name: 'Grok Beta',
        key: 'grok-beta',
    },
    {
        name: 'Grok 2',
        key: 'grok-2',
    },
    {
        name: 'Grok 2 Mini',
        key: 'grok-2-mini',
    },
    {
        name: 'Grok 2 Vision',
        key: 'grok-2-vision',
    },
    {
        name: 'Grok 3',
        key: 'grok-3',
    },
];

const providerConfigFields: UIConfigField[] = [
    {
        type: 'password',
        name: 'API Key',
        key: 'apiKey',
        description: 'Your xAI API key',
        required: true,
        placeholder: 'xai-xxx',
        env: 'XAI_API_KEY',
        scope: 'server',
    },
    {
        type: 'string',
        name: 'Base URL',
        key: 'baseURL',
        description: 'The base URL for the xAI API',
        required: true,
        placeholder: 'https://api.x.ai/v1',
        default: 'https://api.x.ai/v1',
        env: 'XAI_BASE_URL',
        scope: 'server',
    },
];

class XAIProvider extends BaseModelProvider<XAIConfig> {
    constructor(id: string, name: string, config: XAIConfig) {
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
                'Error Loading xAI Chat Model. Invalid Model Selected',
            );
        }

        return new OpenAILLM({
            apiKey: this.config.apiKey,
            model: key,
            baseURL: this.config.baseURL,
        });
    }

    async loadEmbeddingModel(key: string): Promise<BaseEmbedding<any>> {
        throw new Error('xAI does not currently support embeddings');
    }

    static parseAndValidate(raw: any): XAIConfig {
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
            key: 'xai',
            name: 'xAI (Grok)',
        };
    }
}

export default XAIProvider;
