import db from '@/lib/db';
import { memories } from '@/lib/db/schema';
import { eq, and, sql, desc, or, ilike } from 'drizzle-orm';
import { Message } from '@/lib/types';
import BaseEmbedding from '../models/base/embedding';
import { generateText } from 'ai';

export interface Memory {
    content: string;
    importance: number;
    metadata?: any;
}

export class MemoryManager {
    constructor(private embeddingModel: BaseEmbedding<any>) { }

    /**
     * Normalizes an embedding to match the target dimension (usually 1536 for OpenAI standards)
     * by padding with zeros or truncating. This allows cross-provider fallback without DB errors.
     */
    private normalizeEmbedding(vec: number[], targetDim: number = 1536): number[] {
        if (vec.length === targetDim) return vec;

        console.log(`[MemoryManager] Normalizing vector from ${vec.length} to ${targetDim}`);
        if (vec.length > targetDim) {
            return vec.slice(0, targetDim);
        } else {
            const padded = new Array(targetDim).fill(0);
            for (let i = 0; i < vec.length; i++) padded[i] = vec[i];
            return padded;
        }
    }

    /**
     * Search for relevant memories using Hybrid Search (Vector + Keyword)
     * and rank them by relevance, recency, and importance.
     */
    async searchMemories(userId: string, query: string, topK: number = 5): Promise<any[]> {
        try {
            // 1. Generate embedding for the query
            let [queryEmbedding] = await this.embeddingModel.embedText([query]);
            console.log(`[MemoryManager] searchMemories query raw dimension: ${queryEmbedding.length}`);
            queryEmbedding = this.normalizeEmbedding(queryEmbedding);

            // 2. Perform Hybrid Search
            // We use cosine similarity (1 - cosine distance)
            const similarityExpression = sql<number>`1 - (${memories.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`;

            const results = await db.select({
                id: memories.id,
                content: memories.content,
                importance: memories.importance,
                metadata: memories.metadata,
                lastAccessedAt: memories.lastAccessedAt,
                createdAt: memories.createdAt,
                similarity: similarityExpression
            })
                .from(memories)
                .where(and(
                    eq(memories.userId, userId),
                    or(
                        // Lower threshold from 0.75 to 0.4 to account for padded vectors
                        sql`${similarityExpression} > 0.4`,
                        ilike(memories.content, `%${query}%`)
                    )
                ))
                .orderBy(desc(similarityExpression))
                .limit(topK * 2);

            console.log(`[MemoryManager] Found ${results.length} potential memories for user ${userId}`);

            // FALLBACK: If semantic search found nothing, fetch ALL user memories
            // This handles cross-provider embedding mismatches (e.g., Gemini saved, NVIDIA searching)
            if (results.length === 0) {
                console.log(`[MemoryManager] Semantic search returned 0, fetching all user memories as fallback...`);
                const allMemories = await db.select({
                    id: memories.id,
                    content: memories.content,
                    importance: memories.importance,
                    metadata: memories.metadata,
                    lastAccessedAt: memories.lastAccessedAt,
                    createdAt: memories.createdAt,
                })
                    .from(memories)
                    .where(eq(memories.userId, userId))
                    .orderBy(desc(memories.lastAccessedAt))
                    .limit(topK);

                console.log(`[MemoryManager] Fallback found ${allMemories.length} total memories for user`);

                if (allMemories.length === 0) return [];

                // Return all memories with a default score
                return allMemories.map(m => ({ ...m, finalScore: 0.5 }));
            }

            // 3. Ranking Algorithm
            // Final Score = (Similarity * 0.6) + (Recency * 0.25) + (Importance * 0.15)
            const rankedResults = results.map((m) => {
                const sim = m.similarity || 0.5;

                // Recency Score: (1 / (1 + days_since_last_access))
                const daysSince = (new Date().getTime() - new Date(m.lastAccessedAt!).getTime()) / (1000 * 60 * 60 * 24);
                const recencyScore = 1 / (1 + daysSince);

                // Importance Score: scale 1-5 to 0-1
                const importanceScore = (m.importance || 1) / 5;

                const finalScore = (sim * 0.6) + (recencyScore * 0.25) + (importanceScore * 0.15);

                return { ...m, finalScore };
            });

            // Sort by final score and take topK
            const finalResults = rankedResults
                .sort((a, b) => b.finalScore - a.finalScore)
                .slice(0, topK);

            // 4. Update lastAccessedAt for retrieved memories
            if (finalResults.length > 0) {
                await Promise.all(
                    finalResults.map((m) =>
                        db.update(memories)
                            .set({ lastAccessedAt: new Date() })
                            .where(eq(memories.id, m.id))
                    )
                );
            }

            return finalResults;
        } catch (err) {
            console.error('Error searching memories:', err);
            throw err; // Re-throw so the root caller knows it failed
        }
    }

    /**
     * Save a new memory, consolidating with existing ones if similar.
     */
    async saveMemory(userId: string, newMemory: Memory) {
        try {
            // Use embedForStorage for saving (uses input_type: 'passage' for NVIDIA NIM)
            let [embedding] = await this.embeddingModel.embedForStorage([newMemory.content]);
            console.log(`[MemoryManager] saveMemory embedding raw dimension: ${embedding.length}`);
            embedding = this.normalizeEmbedding(embedding);

            // Check for existing similar memory (Threshold 0.85)
            const similarityExpression = sql`1 - (${memories.embedding} <=> ${JSON.stringify(embedding)}::vector)`;

            const existing = await db.select()
                .from(memories)
                .where(and(
                    eq(memories.userId, userId),
                    sql`${similarityExpression} > 0.85`
                ))
                .limit(1);

            if (existing.length > 0) {
                const firstExisting = existing[0];
                // In a pro version we'd use generateText to merge them.
                await db.update(memories)
                    .set({
                        content: newMemory.content,
                        importance: Math.max(firstExisting.importance || 1, newMemory.importance),
                        lastAccessedAt: new Date(),
                    })
                    .where(eq(memories.id, firstExisting.id));
            } else {
                await db.insert(memories).values({
                    userId,
                    content: newMemory.content,
                    embedding,
                    importance: newMemory.importance,
                    metadata: newMemory.metadata,
                });
            }
        } catch (err) {
            console.error('Error saving memory:', err);
        }
    }

    /**
     * Extract new facts from a conversation fragment.
     */
    static async extractMemories(llm: any, messages: Message[]): Promise<Memory[]> {
        const prompt = `
      Analyze the following chat history and extract a list of NEW, MEANINGFUL personal facts, research interests, or specific areas of knowledge the user cares about.
      
      Guidelines:
      - Extract persistent facts (name, job, location).
      - Extract long-term interests (e.g., "The user is deeply interested in Quantum Computing research" or "The user frequently searches for advanced TypeScript patterns").
      - Do NOT extract one-off queries or ephemeral context.
      - Assign an importance score (1-5).
      - Format as a JSON array of objects: { "content": string, "importance": number }
      
      Conversation:
      ${JSON.stringify(messages.slice(-10))}
      
      Return ONLY the JSON array. If nothing is worth remembering, return [].
    `;

        try {
            const { text } = await generateText({
                model: llm,
                prompt: prompt,
            });

            // Find the first '[' and last ']' to extract the JSON array
            const start = text.indexOf('[');
            const end = text.lastIndexOf(']');

            if (start === -1 || end === -1) return [];

            const jsonStr = text.substring(start, end + 1);
            const extracted = JSON.parse(jsonStr);
            return Array.isArray(extracted) ? extracted : [];
        } catch (err) {
            console.error('Error extracting memories:', err);
            return [];
        }
    }
}
