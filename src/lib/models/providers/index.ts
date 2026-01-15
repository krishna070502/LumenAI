import { ModelProviderUISection } from '@/lib/config/types';
import { ProviderConstructor } from '../base/provider';
import OpenAIProvider from './openai';
import GeminiProvider from './gemini';
import GroqProvider from './groq';
import AnthropicProvider from './anthropic';
import NvidiaNIMProvider from './nvidia-nim';
import OpenRouterProvider from './openrouter';
import XAIProvider from './xai';

export const providers: Record<string, ProviderConstructor<any>> = {
  'nvidia-nim': NvidiaNIMProvider,
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  gemini: GeminiProvider,
  openrouter: OpenRouterProvider,
  xai: XAIProvider,
  groq: GroqProvider,
};

export const getModelProvidersUIConfigSection =
  (): ModelProviderUISection[] => {
    return Object.entries(providers).map(([k, p]) => {
      const configFields = p.getProviderConfigFields();
      const metadata = p.getProviderMetadata();

      return {
        fields: configFields,
        key: k,
        name: metadata.name,
      };
    });
  };

