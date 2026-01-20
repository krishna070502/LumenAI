import { streamText, generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import SessionManager from '@/lib/session';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';
import { eq } from 'drizzle-orm';
import { chats, messages } from '@/lib/db/schema';
import { SearchSources } from '@/lib/agents/search/types';
import { Chunk } from '@/lib/types';
import z from 'zod';
import YahooFinance from 'yahoo-finance2';
import { evaluate as mathEval } from 'mathjs';
import { searchSearxng } from '@/lib/searxng';
import TurnDown from 'turndown';
import ModelRegistry from '@/lib/models/registry';
import { MemoryManager } from '@/lib/memory/manager';

const turndown = new TurnDown();
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const nim = createOpenAICompatible({
    name: 'nvidia-nim',
    baseURL: process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    headers: { Authorization: `Bearer ${process.env.NVIDIA_NIM_API_KEY}` },
});

const ensureChatExists = async (input: { id: string; userId: string; query: string; chatMode?: 'chat' | 'research' }) => {
    try {
        console.log(`[ai-chat-v2] ensureChatExists called with id: ${input.id}, userId: ${input.userId}`);
        const exists = await db.query.chats.findFirst({ where: eq(chats.id, input.id) });
        if (!exists) {
            console.log(`[ai-chat-v2] Chat ${input.id} does not exist, creating...`);
            await db.insert(chats).values({ id: input.id, userId: input.userId, title: input.query.slice(0, 50), sources: [] as SearchSources[], files: [], chatMode: input.chatMode || 'chat' });
            console.log(`[ai-chat-v2] Chat ${input.id} created successfully.`);
        } else {
            console.log(`[ai-chat-v2] Chat ${input.id} already exists.`);
        }
    } catch (err) {
        console.error('[ai-chat-v2] Failed to check/save chat:', err);
    }
};

const generateChatTitle = async (query: string, response: string): Promise<string> => {
    try {
        const result = await generateText({
            model: nim.chatModel('meta/llama-3.1-405b-instruct'),
            system: 'You are a helpful assistant that generates concise chat titles. Generate a short, descriptive title (3-6 words) that summarizes the conversation topic. Only output the title, nothing else.',
            messages: [
                { role: 'user', content: query },
                { role: 'assistant', content: response.slice(0, 500) },
                { role: 'user', content: 'Generate a concise title for this conversation.' }
            ],
        });
        const title = result.text.trim().replace(/^["']|["']$/g, '').slice(0, 100);
        return title || query.slice(0, 50);
    } catch (err) {
        console.error('[ai-chat-v2] Failed to generate title:', err);
        return query.slice(0, 50);
    }
};

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return Response.json({ message: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { message, history, chatId, messageId, systemInstructions, sources = [], optimizationMode = 'balanced', chatMode = 'chat', memoryEnabled = true } = body;
        if (!message?.content) return Response.json({ message: 'No content' }, { status: 400 });

        await ensureChatExists({ id: chatId, userId: user.id, query: message.content, chatMode });

        // Retrieve User Memories - Resilient Selection
        let retrievedMemories: any[] = [];
        let memoryManager: MemoryManager | null = null;

        // Only retrieve memories if enabled
        if (memoryEnabled === false) {
            console.log(`[ai-chat-v2] Memory disabled by user preference.`);
        } else {
            try {
                const registry = new ModelRegistry();
                const providers = await registry.getActiveProviders();

                // Filter and prioritize providers
                const validEmbeddingProviders = providers.filter(p => {
                    if (p.embeddingModels.length === 0) return false;
                    const apiKey = (p as any).config?.apiKey || '';
                    // Skip placeholder keys
                    if (apiKey.startsWith('your-') || apiKey.includes('PLACEHOLDER') || apiKey === 'OpenAI API Key' || apiKey === 'nvapi-xxx') return false;
                    return true;
                });

                console.log(`[ai-chat-v2] Found ${validEmbeddingProviders.length} potential embedding providers.`);

                for (const p of validEmbeddingProviders) {
                    let initialized = false;
                    for (const model of p.embeddingModels) {
                        try {
                            console.log(`[ai-chat-v2] Attempting memory retrieval with provider: ${p.name}, model: ${model.key}`);

                            const embeddingModel = await registry.loadEmbeddingModel(p.id, model.key);
                            const manager = new MemoryManager(embeddingModel);

                            // Test the model with a search
                            retrievedMemories = await manager.searchMemories(user.id, message.content);

                            // If we get here, the model/provider works!
                            memoryManager = manager;
                            initialized = true;
                            console.log(`[ai-chat-v2] Successfully initialized MemoryManager with ${p.name} (${model.key}). Retrieved ${retrievedMemories.length} memories.`);
                            break;
                        } catch (err: any) {
                            console.warn(`[ai-chat-v2] Model ${model.key} on ${p.name} failed: ${err.message}`);
                            continue;
                        }
                    }
                    if (initialized) break;
                }
            } catch (err) {
                console.error('[ai-chat-v2] Memory system failure:', err);
            }
        }

        if (!(await db.query.messages.findFirst({ where: eq(messages.messageId, messageId) }))) {
            await db.insert(messages).values({ chatId, messageId, userId: user.id, backendId: messageId, query: message.content, createdAt: new Date(), status: 'answering', responseBlocks: [] });
        }

        const formattedHistory = (history || []).map(([role, content]: [string, string]) => ({ role: role === 'human' ? 'user' : 'assistant', content }));
        console.log(`[ai-chat-v2] Received history with ${formattedHistory.length} messages. Memory count: ${retrievedMemories.length}`);

        // Intelligent search classification for Chat mode
        const classifyNeedsSearch = async (query: string): Promise<boolean> => {
            try {
                const result = await generateText({
                    model: nim.chatModel('meta/llama-3.1-405b-instruct'),
                    system: `You are a classifier that determines if a user query requires real-time web search.
                    
Answer ONLY "YES" or "NO".

Answer "YES" if the query:
- Asks about current events, news, or recent developments
- Asks for up-to-date information (prices, weather, sports scores, etc.)
- Asks about specific products, companies, or people that may have recent updates
- Asks for factual information that may have changed recently
- Mentions "latest", "current", "today", "recent", "now", "2024", "2025", etc.

Answer "NO" if the query:
- Is a general knowledge question with stable answers
- Asks for explanations, tutorials, or how-to guides
- Is a coding question or technical help
- Is philosophical, creative, or opinion-based
- Is casual conversation or greetings
- Can be answered from general training knowledge`,
                    messages: [{ role: 'user', content: `Query: "${query}"\n\nDoes this require real-time web search? Answer YES or NO only.` }],
                });
                const answer = result.text.trim().toUpperCase();
                console.log(`[ai-chat-v2] Search classification for "${query.slice(0, 50)}...": ${answer}`);
                return answer.includes('YES');
            } catch (err) {
                console.error('[ai-chat-v2] Classification error, defaulting to no search:', err);
                return false;
            }
        };

        // Determine if search should be used
        let useSearch = sources.length > 0; // User explicitly enabled sources
        console.log(`[ai-chat-v2] chatMode: ${chatMode}, sources: [${sources.join(', ')}], initial useSearch: ${useSearch}`);

        // In chat mode with no explicit sources, let AI decide
        if (chatMode === 'chat' && sources.length === 0) {
            console.log('[ai-chat-v2] Running auto-search classification...');
            useSearch = await classifyNeedsSearch(message.content);
            console.log(`[ai-chat-v2] Classification result: ${useSearch ? 'NEEDS SEARCH' : 'NO SEARCH NEEDED'}`);
        }

        const modeInstructions = {
            speed: 'Be quick and to the point. Short, snappy responses.',
            balanced: 'Be helpful and informative with a conversational tone.',
            quality: 'Be thorough and insightful. Provide detailed, well-structured responses.'
        }[optimizationMode as 'speed' | 'balanced' | 'quality'] || 'Be helpful and informative with a conversational tone.';

        const availableCapabilities = [];
        if (sources.includes('web') || useSearch) availableCapabilities.push('Web Search');
        if (sources.includes('academic')) availableCapabilities.push('Academic Search');
        if (sources.includes('discussions')) availableCapabilities.push('Social Search (Reddit/Discussions)');
        if (useSearch) availableCapabilities.push('Tools (Weather, Stocks, Calculator, Tables, Charts, Media Search)');

        const systemPrompt = `You are LumenAI, an intelligent AI assistant designed to enlighten and empower users. Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

YOUR IDENTITY (IMPORTANT):
- Your name is **LumenAI** (pronounced "Lumen-AI")
- When asked "what is your name?" or "who are you?", ALWAYS respond that you are "LumenAI"
- Your tagline is "Enlighten Yourself"
- Never claim to be a different AI or use a different name

PERSONALITY & TONE:
- Be warm, conversational, and approachable - like chatting with a helpful friend who happens to be an expert
- Use natural language, not stiff or formal phrasing
- Show genuine interest in helping the user
- Use contractions (I'm, you're, don't) to sound natural
- Be encouraging and positive without being over-the-top

FORMATTING GUIDELINES:
- Use emojis strategically to add visual interest (📌 ✅ 🔌 💡 🎯 etc.) - but don't overdo it
- When presenting lists of items with data (prices, specs, etc.), use **markdown tables** for clarity
- Use **bold** for emphasis on key points
- Use bullet points for lists
- Add helpful section headers when the response has multiple parts
- End with an engaging follow-up question or offer to help further when appropriate
- Keep responses scannable - users should be able to quickly find what they need

RESPONSE STYLE (${optimizationMode} mode):
${modeInstructions}

${useSearch ? `SEARCH & TOOLS:
You have access to: ${availableCapabilities.join(', ')}.
When search results are provided:
- Synthesize information into a clear, well-structured response
- Use tables for comparative data like prices or specifications
- Cite sources naturally (not robotically)
- Note when information might change frequently
` : `REASONING:
For complex questions, think through the problem step by step. You may use <think></think> tags at the START of your response for internal reasoning, then provide a clear answer after.
`}
${systemInstructions ? `USER PREFERENCES: ${systemInstructions}` : ''}

${retrievedMemories.length > 0 ? `IMPORTANT - WHAT YOU KNOW ABOUT THIS USER:
You have established context with this user from previous conversations. Use this information naturally - don't mention that you "remember" from past chats or that you have "memory." Just naturally incorporate what you know as if you've always known it.
<user_context>
${retrievedMemories.map(m => `- ${m.content}`).join('\n')}
</user_context>` : ''}

Remember: Make your responses visually appealing and easy to scan. Be helpful, be human, be you! Never say things like "we're starting fresh" or "blank slate" - if you have context about the user, use it naturally.`;

        const session = new SessionManager(messageId);
        (SessionManager as any).sessions.set(messageId, session);

        const responseStream = new TransformStream();
        const writer = responseStream.writable.getWriter();
        const encoder = new TextEncoder();
        let disconnect: (() => void) | undefined;
        disconnect = session.subscribe((event, data) => {
            // For 'data' events, the actual type is inside data.type
            // For other events (like 'messageEnd'), we need to construct the proper format
            if (event === 'data') {
                writer.write(encoder.encode(JSON.stringify(data) + '\n'));
            } else {
                writer.write(encoder.encode(JSON.stringify({ type: event, ...data }) + '\n'));
            }
        });

        const researchBlockId = globalThis.crypto.randomUUID().slice(0, 14);
        const getOrCreateResearchBlock = () => {
            let block: any = session.getBlock(researchBlockId);
            if (!block) {
                block = { id: researchBlockId, type: 'research', data: { subSteps: [] } };
                session.emitBlock(block);
            }
            return block;
        };

        const executeSearch = async (input: string[] | string | undefined, engines?: string[]) => {
            const queries = Array.isArray(input) ? input : (input ? [input] : []);
            console.log(`[ai-chat-v2] executeSearch triggered. Final Queries:`, queries, `Engines:`, engines);

            if (queries.length === 0) {
                console.warn(`[ai-chat-v2] executeSearch called with 0 queries! Input was:`, input);
                return [];
            }

            const block: any = getOrCreateResearchBlock();
            const stepId = globalThis.crypto.randomUUID().slice(0, 14);
            block.data.subSteps.push({ id: stepId, type: 'searching', searching: queries });
            session.updateBlock(researchBlockId, [{ op: 'replace', path: '/data/subSteps', value: block.data.subSteps }]);

            const results: Chunk[] = [];
            await Promise.all(queries.slice(0, 3).map(async (q) => {
                try {
                    const res = await searchSearxng(q, engines ? { engines } : undefined);
                    results.push(...res.results.map(r => ({ content: r.content || r.title, metadata: { title: r.title, url: r.url } })));
                } catch (e) {
                    console.error(`[ai-chat-v2] Search failed for query "${q}":`, e);
                }
            }));

            console.log(`[ai-chat-v2] Search complete. Found ${results.length} results.`);
            block.data.subSteps.push({ id: globalThis.crypto.randomUUID().slice(0, 14), type: 'search_results', reading: results.slice(0, 5) });
            session.updateBlock(researchBlockId, [{ op: 'replace', path: '/data/subSteps', value: block.data.subSteps }]);
            return results;
        };

        const tools: any = {
            web_search: {
                description: 'Search the web for real-time information.',
                parameters: z.object({
                    queries: z.array(z.string()).optional().describe('An array of search queries.'),
                    query: z.string().optional().describe('A single search query.')
                }),
                execute: async (params: any) => executeSearch(params?.queries || params?.query)
            },
            academic_search: {
                description: 'Search academic papers and scholarly articles.',
                parameters: z.object({
                    queries: z.array(z.string()).optional().describe('An array of academic search queries.'),
                    query: z.string().optional().describe('A single academic search query.')
                }),
                execute: async (params: any) => executeSearch(params?.queries || params?.query, ['google scholar'])
            },
            social_search: {
                description: 'Search for discussions on social platforms.',
                parameters: z.object({
                    queries: z.array(z.string()).optional().describe('An array of social search queries.'),
                    query: z.string().optional().describe('A single social search query.')
                }),
                execute: async (params: any) => executeSearch(params?.queries || params?.query, ['reddit'])
            },
            scrape_url: {
                description: 'Extract and read the full content of specific URLs.',
                parameters: z.object({ urls: z.array(z.string()).min(1).max(3).describe('An array of URLs to scrape.') }),
                execute: async ({ urls }: { urls: string[] }) => {
                    const block: any = getOrCreateResearchBlock();
                    const stepId = globalThis.crypto.randomUUID().slice(0, 14);
                    block.data.subSteps.push({ id: stepId, type: 'reading', reading: urls.map(url => ({ content: '', metadata: { url, title: url } })) });
                    session.updateBlock(researchBlockId, [{ op: 'replace', path: '/data/subSteps', value: block.data.subSteps }]);
                    const results = await Promise.all(urls.slice(0, 3).map(async (url) => {
                        try {
                            const res = await fetch(url);
                            const text = await res.text();
                            const title = text.match(/<title>(.*?)<\/title>/i)?.[1] || url;
                            return { content: turndown.turndown(text).slice(0, 20000), metadata: { url, title } };
                        } catch (e) { return { content: `Error: ${e}`, metadata: { url, title: 'Error' } }; }
                    }));
                    return results;
                }
            },
            generate_table: {
                description: 'Create a structured data table to display information clearly.',
                parameters: z.object({ title: z.string().optional(), headers: z.array(z.string()), rows: z.array(z.array(z.union([z.string(), z.number(), z.boolean()]))), footer: z.string().optional() }),
                execute: async (params: any) => {
                    session.emitBlock({ id: globalThis.crypto.randomUUID().slice(0, 14), type: 'widget', data: { widgetType: 'table', params } });
                    return { status: 'Table generated' };
                }
            },
            generate_chart: {
                description: 'Create a line, bar, or area chart to visualize numerical data.',
                parameters: z.object({ type: z.enum(['line', 'bar', 'area']), title: z.string().optional(), data: z.array(z.record(z.string(), z.any())), xAxisKey: z.string(), yAxisKeys: z.array(z.string()), colors: z.array(z.string()).optional() }),
                execute: async (params: any) => {
                    session.emitBlock({ id: globalThis.crypto.randomUUID().slice(0, 14), type: 'widget', data: { widgetType: 'chart', params } });
                    return { status: 'Chart generated' };
                }
            },
            get_latest_news: {
                description: 'Retrieve the latest trending news articles on a specific topic.',
                parameters: z.object({ topic: z.string().optional().describe('The topic to get news for (e.g., tech, sports, finance).') }),
                execute: async ({ topic = 'tech' }: { topic?: string }) => {
                    const res = await fetch(`${new URL(req.url).origin}/api/discover?mode=preview&topic=${topic}`);
                    const data = await res.json();
                    const article = (data.blogs || [])[0];
                    if (article) session.emitBlock({ id: globalThis.crypto.randomUUID().slice(0, 14), type: 'widget', data: { widgetType: 'news_article', params: { article } } });
                    return article || { error: 'No news found' };
                }
            },
            get_weather: {
                description: 'Get current weather conditions for a specific location.',
                parameters: z.object({ location: z.string().describe('The city and country/state.') }),
                execute: async ({ location }: { location: string }) => {
                    const locRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`, { headers: { 'User-Agent': 'Gradia-AIEngine' } });
                    const loc = (await locRes.json())[0];
                    if (!loc) return { error: 'Not found' };
                    const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`);
                    const wData = await wRes.json();
                    session.emitBlock({ id: globalThis.crypto.randomUUID().slice(0, 14), type: 'widget', data: { widgetType: 'weather', params: { location, current: wData.current, daily: wData.daily } } });
                    return { temp: wData.current.temperature_2m };
                }
            },
            get_stock_info: {
                description: 'Get real-time stock price and market data for a ticker symbol.',
                parameters: z.object({ symbol: z.string().describe('The stock ticker symbol (e.g., AAPL, TSLA).') }),
                execute: async ({ symbol }: { symbol: string }) => {
                    const f = await yf.search(symbol); const ticker = f.quotes[0]?.symbol as string;
                    if (!ticker) return { error: 'Not found' };
                    const q: any = await yf.quote(ticker);
                    session.emitBlock({ id: globalThis.crypto.randomUUID().slice(0, 14), type: 'widget', data: { widgetType: 'stock', params: { symbol: ticker, shortName: q.shortName, regularMarketPrice: q.regularMarketPrice, currency: q.currency, regularMarketChangePercent: q.regularMarketChangePercent, chartData: {} } } });
                    return { price: q.regularMarketPrice };
                }
            },
            calculate: {
                description: 'Evaluate a mathematical expression.',
                parameters: z.object({ expression: z.string().describe('The math expression to solve (e.g., "sqrt(25) + 10").') }),
                execute: async ({ expression }: { expression: string }) => {
                    const result = mathEval(expression);
                    session.emitBlock({ id: globalThis.crypto.randomUUID().slice(0, 14), type: 'widget', data: { widgetType: 'calculation_result', params: { expression, result } } });
                    return { result };
                }
            },
            search_media: {
                description: 'Search for high-quality images or videos related to a topic.',
                parameters: z.object({ query: z.string(), type: z.enum(['images', 'videos']) }),
                execute: async ({ query, type }: { query: string, type: 'images' | 'videos' }) => {
                    session.emit('mediaSearch', { query, type });
                    return { status: `Started ${type} search for ${query}` };
                }
            }
        };

        const activeTools: any = {};
        if (sources.includes('web')) activeTools.web_search = tools.web_search;
        if (sources.includes('academic')) activeTools.academic_search = tools.academic_search;
        if (sources.includes('discussions')) activeTools.social_search = tools.social_search;

        if (useSearch) {
            activeTools.scrape_url = tools.scrape_url;
            activeTools.calculate = tools.calculate;
            activeTools.get_weather = tools.get_weather;
            activeTools.get_stock_info = tools.get_stock_info;
            activeTools.get_latest_news = tools.get_latest_news;
            activeTools.generate_table = tools.generate_table;
            activeTools.generate_chart = tools.generate_chart;
            activeTools.search_media = tools.search_media;
        }

        // Simplified Search Flow: Pre-execute search then stream response with results
        const runWithSearch = async () => {
            let fullText = '';
            let searchContext = '';

            try {
                // Execute search if: explicit sources selected OR auto-classification determined search is needed
                const shouldSearch = useSearch || sources.includes('web') || sources.includes('academic') || sources.includes('discussions');

                if (shouldSearch) {
                    console.log(`[ai-chat-v2] Executing web search (useSearch: ${useSearch}, sources: [${sources.join(', ')}])`);

                    const searchQueries = [message.content.slice(0, 200)]; // Use first 200 chars as query
                    let searchEngines: string[] | undefined;

                    if (sources.includes('academic')) searchEngines = ['google scholar'];
                    else if (sources.includes('discussions')) searchEngines = ['reddit'];

                    const searchResults = await executeSearch(searchQueries, searchEngines);

                    if (searchResults.length > 0) {
                        searchContext = `\n\n<search_results>\n${searchResults.slice(0, 5).map((r, i) =>
                            `[${i + 1}] ${r.metadata.title}\nURL: ${r.metadata.url}\n${r.content}`
                        ).join('\n\n')}\n</search_results>\n\nUse the above search results to inform your response. Cite sources when relevant.`;
                        console.log(`[ai-chat-v2] Search complete. Found ${searchResults.length} results, using top 5.`);
                    } else {
                        console.log('[ai-chat-v2] Search returned no results.');
                    }
                }

                // Stream the final response with search context injected
                const enhancedMessage = searchContext
                    ? `${message.content}\n\n---\n${searchContext}`
                    : message.content;

                const result = streamText({
                    model: nim.chatModel('meta/llama-3.1-405b-instruct'),
                    system: systemPrompt,
                    messages: [...formattedHistory, { role: 'user', content: enhancedMessage }],
                });

                let textBlockId = '';
                let lastUpdateTime = 0;
                let lastUpdateLength = 0;
                const UPDATE_INTERVAL_MS = 100;
                const UPDATE_CHAR_THRESHOLD = 50;

                for await (const part of result.fullStream) {
                    if (part.type === 'text-delta') {
                        const textDelta = (part as any).text || '';
                        fullText += textDelta;

                        if (!textBlockId) {
                            const block = { id: globalThis.crypto.randomUUID().slice(0, 14), type: 'text' as const, data: fullText };
                            textBlockId = block.id;
                            session.emitBlock(block);
                            lastUpdateTime = Date.now();
                            lastUpdateLength = fullText.length;
                        } else {
                            // Throttle updates: only update if enough time or characters have passed
                            const now = Date.now();
                            const charsSinceUpdate = fullText.length - lastUpdateLength;
                            if (now - lastUpdateTime >= UPDATE_INTERVAL_MS || charsSinceUpdate >= UPDATE_CHAR_THRESHOLD) {
                                session.updateBlock(textBlockId, [{ op: 'replace', path: '/data', value: fullText }]);
                                lastUpdateTime = now;
                                lastUpdateLength = fullText.length;
                            }
                        }
                    }
                }
                // Final update to ensure all text is captured
                if (textBlockId) {
                    session.updateBlock(textBlockId, [{ op: 'replace', path: '/data', value: fullText }]);
                }
                console.log(`[ai-chat-v2] Stream complete. Text length:`, fullText.length);
            } catch (err) {
                console.error('[ai-chat-v2] Error in runWithSearch:', err);
                session.emit('error', { message: 'Search/response error' });
            } finally {
                try {
                    await db.update(messages).set({ status: 'completed', responseBlocks: session.getAllBlocks() }).where(eq(messages.messageId, messageId)).execute();
                    if (formattedHistory.length === 0 && fullText.length > 0) {
                        generateChatTitle(message.content, fullText).then(async (title) => {
                            try { await db.update(chats).set({ title }).where(eq(chats.id, chatId)).execute(); } catch (e) { }
                        });
                    }
                } catch (e) { }

                // Extract new memories every 10 messages (5 user-assistant pairs)
                if (memoryManager && (formattedHistory.length / 2) % 5 === 0) {
                    const conversationSlice = [
                        ...formattedHistory,
                        { role: 'user', content: message.content },
                        { role: 'assistant', content: fullText }
                    ] as any;

                    console.log('[ai-chat-v2] Triggering memory extraction...');
                    MemoryManager.extractMemories(nim.chatModel('meta/llama-3.1-405b-instruct'), conversationSlice)
                        .then(async (extracted) => {
                            if (extracted.length > 0) {
                                console.log(`[ai-chat-v2] Extracted ${extracted.length} potential memories. Saving...`);
                                for (const mem of extracted) {
                                    await memoryManager?.saveMemory(user.id, mem);
                                }
                                console.log('[ai-chat-v2] Memory saving complete.');
                            } else {
                                console.log('[ai-chat-v2] No new facts extracted from this interaction.');
                            }
                        })
                        .catch(err => console.error('[ai-chat-v2] Memory extraction/save failed:', err));
                }

                session.emit('messageEnd', {});
                if (disconnect) disconnect();
                writer.close();
            }
        };

        if (useSearch) {
            runWithSearch();
        } else {
            (async () => {
                let fullText = '';
                try {
                    const result = streamText({
                        model: nim.chatModel('meta/llama-3.1-405b-instruct'),
                        system: systemPrompt,
                        messages: [...formattedHistory, { role: 'user', content: message.content }],
                    });

                    let textBlockId = '';
                    let lastUpdateTime = 0;
                    let lastUpdateLength = 0;
                    const UPDATE_INTERVAL_MS = 100;
                    const UPDATE_CHAR_THRESHOLD = 50;

                    for await (const part of result.fullStream) {
                        if (part.type === 'text-delta') {
                            const textDelta = (part as any).text || '';
                            fullText += textDelta;

                            if (!textBlockId) {
                                const block = { id: globalThis.crypto.randomUUID().slice(0, 14), type: 'text' as const, data: fullText };
                                textBlockId = block.id;
                                session.emitBlock(block);
                                lastUpdateTime = Date.now();
                                lastUpdateLength = fullText.length;
                            } else {
                                // Throttle updates: only update if enough time or characters have passed
                                const now = Date.now();
                                const charsSinceUpdate = fullText.length - lastUpdateLength;
                                if (now - lastUpdateTime >= UPDATE_INTERVAL_MS || charsSinceUpdate >= UPDATE_CHAR_THRESHOLD) {
                                    session.updateBlock(textBlockId, [{ op: 'replace', path: '/data', value: fullText }]);
                                    lastUpdateTime = now;
                                    lastUpdateLength = fullText.length;
                                }
                            }
                        }
                    }
                    // Final update to ensure all text is captured
                    if (textBlockId) {
                        session.updateBlock(textBlockId, [{ op: 'replace', path: '/data', value: fullText }]);
                    }
                } catch (err) {
                    console.error('[ai-chat-v2] Chat error:', err);
                } finally {
                    try {
                        await db.update(messages).set({ status: 'completed', responseBlocks: session.getAllBlocks() }).where(eq(messages.messageId, messageId)).execute();
                        if (formattedHistory.length === 0 && fullText.length > 0) {
                            generateChatTitle(message.content, fullText).then(async (title) => {
                                try { await db.update(chats).set({ title }).where(eq(chats.id, chatId)).execute(); } catch (e) { }
                            });
                        }
                    } catch (e) { }

                    // Extract new memories
                    if (memoryManager && (formattedHistory.length / 2) % 5 === 0) {
                        const conversationSlice = [
                            ...formattedHistory,
                            { role: 'user', content: message.content },
                            { role: 'assistant', content: fullText }
                        ] as any;

                        MemoryManager.extractMemories(nim.chatModel('meta/llama-3.1-405b-instruct'), conversationSlice)
                            .then(async (extracted) => {
                                for (const mem of extracted) {
                                    await memoryManager?.saveMemory(user.id, mem);
                                }
                            })
                            .catch(err => console.error('[ai-chat-v2] Memory extraction failed:', err));
                    }

                    session.emit('messageEnd', {});
                    if (disconnect) disconnect();
                    writer.close();
                }
            })();
        }

        return new Response(responseStream.readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });

    } catch (err) { console.error(err); return Response.json({ message: 'Error' }, { status: 500 }); }
}
