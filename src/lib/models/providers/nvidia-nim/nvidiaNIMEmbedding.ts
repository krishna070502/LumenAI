import BaseEmbedding from '../../base/embedding';
import { Chunk } from '@/lib/types';

type NvidiaNIMEmbeddingConfig = {
    apiKey: string;
    model: string;
    baseURL?: string;
};

/**
 * NVIDIA NIM Embedding class that handles the required `input_type` parameter
 * for asymmetric models using direct HTTP requests (not OpenAI SDK).
 */
class NvidiaNIMEmbedding extends BaseEmbedding<NvidiaNIMEmbeddingConfig> {
    private baseURL: string;

    constructor(protected config: NvidiaNIMEmbeddingConfig) {
        super(config);
        this.baseURL = config.baseURL || 'https://integrate.api.nvidia.com/v1';
    }

    /**
     * Makes a direct HTTP request to NVIDIA NIM embeddings API.
     */
    private async makeRequest(texts: string[], inputType: 'query' | 'passage'): Promise<number[][]> {
        const url = `${this.baseURL}/embeddings`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`,
            },
            body: JSON.stringify({
                model: this.config.model,
                input: texts,
                input_type: inputType,
                encoding_format: 'float',
                truncate: 'END',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`${response.status} ${errorText}`);
        }

        const data = await response.json();
        return data.data.map((item: any) => item.embedding);
    }

    /**
     * Embed text for querying (retrieval). Uses input_type: 'query'.
     */
    async embedText(texts: string[]): Promise<number[][]> {
        return this.makeRequest(texts, 'query');
    }

    /**
     * Embed chunks for storage. Uses input_type: 'passage'.
     */
    async embedChunks(chunks: Chunk[]): Promise<number[][]> {
        return this.makeRequest(chunks.map((c) => c.content), 'passage');
    }

    /**
     * Embed text for storage. Uses input_type: 'passage'.
     */
    async embedForStorage(texts: string[]): Promise<number[][]> {
        return this.makeRequest(texts, 'passage');
    }
}

export default NvidiaNIMEmbedding;
