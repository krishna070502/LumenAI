import { UIConfigField } from '@/lib/config/types';
import { Model, ModelList, ProviderMetadata } from '../../types';
import BaseEmbedding from '../../base/embedding';
import BaseModelProvider from '../../base/provider';
import BaseLLM from '../../base/llm';
import GroqLLM from './groqLLM';
import modelListCache from '../../cache';
import { hashObj } from '@/lib/serverUtils';

interface GroqConfig {
  apiKey: string;
}

const providerConfigFields: UIConfigField[] = [
  {
    type: 'password',
    name: 'API Key',
    key: 'apiKey',
    description: 'Your Groq API key',
    required: true,
    placeholder: 'Groq API Key',
    env: 'GROQ_API_KEY',
    scope: 'server',
  },
];

class GroqProvider extends BaseModelProvider<GroqConfig> {
  constructor(id: string, name: string, config: GroqConfig) {
    super(id, name, config);
  }

  async getDefaultModels(): Promise<ModelList> {
    const res = await fetch(`https://api.groq.com/openai/v1/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    const data = await res.json();
    const defaultChatModels: Model[] = [];

    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((m: any) => {
        defaultChatModels.push({
          key: m.id,
          name: m.id,
        });
      });
    }

    return {
      embedding: [],
      chat: defaultChatModels,
    };
  }

  async getModelList(): Promise<ModelList> {
    const cacheKey = `groq-${hashObj(this.config)}`;
    const cached = modelListCache.get(cacheKey);
    if (cached) return cached;

    const { getConfiguredModelProviderById } = await import(
      '@/lib/config/serverRegistry'
    );
    const defaultModels = await this.getDefaultModels();
    const configProvider = getConfiguredModelProviderById(this.id)!;

    const result = {
      embedding: [
        ...defaultModels.embedding,
        ...configProvider.embeddingModels,
      ],
      chat: [...defaultModels.chat, ...configProvider.chatModels],
    };

    modelListCache.set(cacheKey, result);
    return result;
  }

  async loadChatModel(key: string): Promise<BaseLLM<any>> {
    const modelList = await this.getModelList();

    const exists = modelList.chat.find((m) => m.key === key);

    if (!exists) {
      throw new Error('Error Loading Groq Chat Model. Invalid Model Selected');
    }

    return new GroqLLM({
      apiKey: this.config.apiKey,
      model: key,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  async loadEmbeddingModel(key: string): Promise<BaseEmbedding<any>> {
    throw new Error('Groq Provider does not support embedding models.');
  }

  static parseAndValidate(raw: any): GroqConfig {
    if (!raw || typeof raw !== 'object')
      throw new Error('Invalid config provided. Expected object');
    if (!raw.apiKey)
      throw new Error('Invalid config provided. API key must be provided');

    return {
      apiKey: String(raw.apiKey),
    };
  }

  static getProviderConfigFields(): UIConfigField[] {
    return providerConfigFields;
  }

  static getProviderMetadata(): ProviderMetadata {
    return {
      key: 'groq',
      name: 'Groq',
    };
  }
}

export default GroqProvider;
