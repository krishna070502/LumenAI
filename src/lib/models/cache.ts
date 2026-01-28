import { ModelList } from './types';

interface CacheEntry {
    data: ModelList;
    timestamp: number;
}

class ModelListCache {
    private cache: Map<string, CacheEntry> = new Map();
    private readonly TTL = 3600000; // 1 hour in milliseconds

    public get(key: string): ModelList | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() - entry.timestamp > this.TTL) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    public set(key: string, data: ModelList): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    public clear(): void {
        this.cache.clear();
    }
}

const modelListCache = new ModelListCache();
export default modelListCache;
