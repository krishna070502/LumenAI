import { Chunk } from '@/lib/types';

abstract class BaseEmbedding<CONFIG> {
  constructor(protected config: CONFIG) { }
  abstract embedText(texts: string[]): Promise<number[][]>;
  abstract embedChunks(chunks: Chunk[]): Promise<number[][]>;

  /**
   * Embed text for storage. Default implementation uses embedText.
   * Override this in providers (like NVIDIA NIM) that require different 
   * input_type for storage vs. query.
   */
  async embedForStorage(texts: string[]): Promise<number[][]> {
    return this.embedText(texts);
  }
}

export default BaseEmbedding;
