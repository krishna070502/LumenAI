import { streamText, generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import SessionManager from '@/lib/session';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { chats, messages, documents, spaces } from '@/lib/db/schema';
import { SearchSources } from '@/lib/agents/search/types';
import { Chunk } from '@/lib/types';
import z from 'zod';
import YahooFinance from 'yahoo-finance2';
import { evaluate as mathEval } from 'mathjs';
import { searchSearxng } from '@/lib/searxng';
import TurnDown from 'turndown';
import ModelRegistry from '@/lib/models/registry';
import { MemoryManager } from '@/lib/memory/manager';
import UploadManager from '@/lib/uploads/manager';

const turndown = new TurnDown();
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const nim = createOpenAICompatible({
    name: 'nvidia-nim',
    baseURL: process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    headers: { Authorization: `Bearer ${process.env.NVIDIA_NIM_API_KEY}` },
});

const ensureChatExists = async (input: { id: string; userId: string; query: string; chatMode?: 'chat' | 'research'; spaceId?: string | null }) => {
    try {
        console.log(`[ai-chat-v2] ensureChatExists called with id: ${input.id}, userId: ${input.userId}, spaceId: ${input.spaceId || 'none'}`);
        const exists = await db.query.chats.findFirst({ where: eq(chats.id, input.id) });
        if (!exists) {
            console.log(`[ai-chat-v2] Chat ${input.id} does not exist, creating...`);
            await db.insert(chats).values({
                id: input.id,
                userId: input.userId,
                title: input.query.slice(0, 50),
                sources: [] as SearchSources[],
                files: [],
                chatMode: input.chatMode || 'chat',
                spaceId: input.spaceId || null
            });
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

// Convert markdown to Tiptap JSON format
function convertMarkdownToTiptap(markdown: string): any {
    const lines = markdown.split('\n');
    const content: any[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Skip empty lines
        if (!trimmed) {
            continue;
        }

        // Heading 1: # Title
        if (trimmed.startsWith('# ')) {
            content.push({
                type: 'heading',
                attrs: { level: 1 },
                content: [{ type: 'text', text: trimmed.slice(2) }]
            });
            continue;
        }

        // Heading 2: ## Title
        if (trimmed.startsWith('## ')) {
            content.push({
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: trimmed.slice(3) }]
            });
            continue;
        }

        // Heading 3: ### Title
        if (trimmed.startsWith('### ')) {
            content.push({
                type: 'heading',
                attrs: { level: 3 },
                content: [{ type: 'text', text: trimmed.slice(4) }]
            });
            continue;
        }

        // Bullet list item
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const lastItem = content[content.length - 1];
            const itemText = trimmed.slice(2);
            const textContent = parseInlineFormatting(itemText);
            const listItem = {
                type: 'listItem',
                content: [{ type: 'paragraph', content: textContent }]
            };
            if (lastItem?.type === 'bulletList') {
                lastItem.content.push(listItem);
            } else {
                content.push({ type: 'bulletList', content: [listItem] });
            }
            continue;
        }

        // Numbered list item
        if (/^\d+\.\s/.test(trimmed)) {
            const text = trimmed.replace(/^\d+\.\s/, '');
            const lastItem = content[content.length - 1];
            const textContent = parseInlineFormatting(text);
            const listItem = {
                type: 'listItem',
                content: [{ type: 'paragraph', content: textContent }]
            };
            if (lastItem?.type === 'orderedList') {
                lastItem.content.push(listItem);
            } else {
                content.push({ type: 'orderedList', content: [listItem] });
            }
            continue;
        }

        // Regular paragraph
        const textContent = parseInlineFormatting(trimmed);
        content.push({ type: 'paragraph', content: textContent });
    }

    return { type: 'doc', content };
}

// Parse inline markdown formatting (bold, italic)
function parseInlineFormatting(text: string): any[] {
    const result: any[] = [];
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

    for (const part of parts) {
        if (!part) continue;
        if (part.startsWith('**') && part.endsWith('**')) {
            result.push({ type: 'text', marks: [{ type: 'bold' }], text: part.slice(2, -2) });
        } else if (part.startsWith('*') && part.endsWith('*')) {
            result.push({ type: 'text', marks: [{ type: 'italic' }], text: part.slice(1, -1) });
        } else {
            result.push({ type: 'text', text: part });
        }
    }

    return result.length > 0 ? result : [{ type: 'text', text }];
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return Response.json({ message: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { message, history, chatId, messageId, systemInstructions, sources = [], optimizationMode = 'balanced', chatMode = 'chat', memoryEnabled = true, files = [], spaceId = null } = body;
        if (!message?.content) return Response.json({ message: 'No content' }, { status: 400 });

        await ensureChatExists({ id: chatId, userId: user.id, query: message.content, chatMode, spaceId });

        // Retrieve Document Context from uploaded files
        let documentContext = '';
        if (files && files.length > 0) {
            console.log(`[ai-chat-v2] Processing ${files.length} attached files...`);
            const allChunks: string[] = [];
            for (const fileId of files) {
                try {
                    const file = UploadManager.getFile(fileId);
                    const chunks = UploadManager.getFileChunks(fileId);
                    if (chunks.length > 0) {
                        // Take first 10 chunks (most relevant context)
                        const relevantChunks = chunks.slice(0, 10).map(c => c.content);
                        allChunks.push(`--- Document: ${file?.name || fileId} ---\n${relevantChunks.join('\n')}`);
                        console.log(`[ai-chat-v2] Retrieved ${relevantChunks.length} chunks from file ${file?.name || fileId}`);
                    }
                } catch (err) {
                    console.error(`[ai-chat-v2] Failed to retrieve chunks for file ${fileId}:`, err);
                }
            }
            if (allChunks.length > 0) {
                documentContext = `\n\nATTACHED DOCUMENTS:\nThe user has attached the following document(s). Use this content to answer their questions:\n\n${allChunks.join('\n\n')}\n\n--- End of Documents ---`;
                console.log(`[ai-chat-v2] Document context prepared with ${allChunks.length} documents.`);
            }
        }

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
        if (spaceId) availableCapabilities.push('Document Creation (create new documents with generated content)');

        const systemPrompt = `You are LumenAI, an intelligent AI assistant designed to enlighten and empower users. Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

CRITICAL TOOL INSTRUCTIONS:
- You have access to tools that are called automatically through function calling
- DO NOT write code or pseudo-code to call tools
- DO NOT output "import generate_chart" or "generate_chart(...)" as text
- Simply decide to use a tool and it will be executed automatically
- When you want to generate a chart, just invoke the generate_chart function directly

NON-NEGOTIABLE TOOL RULE:
If the user asks for:
- a chart
- a graph
- a visualization
- trends over time
- comparisons over time
- evolution over time

You MUST call the generate_chart tool with NUMERIC data.
FORBIDDEN RESPONSES:
- Using generate_table instead of generate_chart (tables are NOT charts)
- Text-only explanations describing what a chart "would look like"
- Claiming you "cannot" or "were unable to" generate a chart
- Markdown tables as substitutes for visual charts
- Passing text/string values instead of numbers

DATA FORMAT REQUIREMENTS:
→ X-axis: Years, dates, or categories (strings are OK for x-axis)
→ Y-axis: MUST be numeric values (integers or decimals)
→ For qualitative concepts (like "AI evolution"), assign a numeric score (1-10 scale)

EXAMPLE for "AI evolution chart 2019-2025":
generate_chart({
  title: "AI Evolution Score 2019-2025",
  data: [
    {Year: 2019, Score: 3},
    {Year: 2020, Score: 5},
    {Year: 2021, Score: 6},
    {Year: 2022, Score: 7},
    {Year: 2023, Score: 8},
    {Year: 2024, Score: 9},
    {Year: 2025, Score: 10}
  ]
})

REQUIRED ACTION:
→ Call generate_chart with proper numeric data
→ The chart will render as a visual widget automatically
→ Then briefly describe what the chart shows

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
- Use **bold** for emphasis on key points
- Use bullet points for lists
- Add helpful section headers when the response has multiple parts
- End with an engaging follow-up question or offer to help further when appropriate
- Keep responses scannable - users should be able to quickly find what they need

RESPONSE STYLE (${optimizationMode} mode):
${modeInstructions}

${useSearch ? `SEARCH & TOOLS:
You have access to: ${availableCapabilities.join(', ')}.

HOW TO USE TOOLS:
- Tools are called automatically through function calling - DO NOT WRITE CODE
- When asked to create a chart → call generate_chart with title and data array
- When asked to compare data → call generate_table with headers and rows
- When asked about weather → call get_weather with location
- When asked about stocks → call get_stock_info with symbol
- When asked to calculate → call calculate with expression

EXAMPLE - For a chart request:
User: "Show me AI growth from 2020-2024"
You should: Call generate_chart({ title: "AI Growth", data: [{Year: 2020, Growth: 10}, {Year: 2021, Growth: 25}, ...] })
NOT: Write code like "import generate_chart" or "generate_chart(...)"

When search results are provided:
- Synthesize information into a clear, well-structured response
- Cite sources naturally (not robotically)
- Note when information might change frequently
` : `REASONING:
For complex questions, think through the problem step by step. You may use <think></think> tags at the START of your response for internal reasoning, then provide a clear answer after.
`}
${spaceId ? `DOCUMENT CREATION:
You can create new documents within this space when the user asks. When a user requests to create a document:
- Use the create_document tool with an appropriate title and topic
- After creating, confirm success and let them know they can click the link to view it
- Examples of when to create: "create a document about...", "write a document on...", "generate a document for...", "make a document explaining..."
` : ''}
${systemInstructions ? `USER PREFERENCES: ${systemInstructions}` : ''}

${retrievedMemories.length > 0 ? `IMPORTANT - WHAT YOU KNOW ABOUT THIS USER:
You have established context with this user from previous conversations. Use this information naturally - don't mention that you "remember" from past chats or that you have "memory." Just naturally incorporate what you know as if you've always known it.
<user_context>
${retrievedMemories.map(m => `- ${m.content}`).join('\n')}
</user_context>` : ''}
${documentContext}
Remember: Make your responses visually appealing and easy to scan. Be helpful, be human, be you! Never say things like "we're starting fresh" or "blank slate" - if you have context about the user, use it naturally.${documentContext ? ' When the user asks about attached documents, summarize, analyze, or answer based on the document content provided above.' : ''}`;

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
                parameters: z.object({
                    url: z.string().optional().describe('A single URL to scrape.'),
                    urls: z.array(z.string()).optional().describe('An array of URLs to scrape.')
                }),
                execute: async (params: { url?: string; urls?: string[] }) => {
                    // Normalize: accept either 'url' (string) or 'urls' (array)
                    let urls: string[] = [];
                    if (params.urls && Array.isArray(params.urls)) {
                        urls = params.urls;
                    } else if (params.url) {
                        urls = [params.url];
                    }
                    if (urls.length === 0) {
                        return { error: 'No URLs provided' };
                    }
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
                description: 'REQUIRED for any chart, graph, timeline, or visualization request. Creates a visual line/bar/area chart widget. Call with: title (string) and data (array of objects like [{Year: 2019, Value: 10}, {Year: 2020, Value: 25}]). DO NOT use generate_table for chart requests.',
                parameters: z.object({
                    title: z.string().describe('Title of the chart'),
                    data: z.any().describe('Array of objects with x-axis key and numeric y-axis values'),
                }).passthrough(), // Allow any additional parameters
                execute: async (params: any) => {
                    try {
                        console.log('[generate_chart] Execute called with:', JSON.stringify(params));

                        // Normalize data if it's a string
                        let chartData = params.data;
                        if (typeof chartData === 'string') {
                            try { chartData = JSON.parse(chartData); } catch (e) {
                                console.error('[generate_chart] Failed to parse data:', e);
                                chartData = [];
                            }
                        }

                        // Handle various parameter name variations  
                        const xKey = params.xAxisKey || params.x_axis || params.x_label || 'Year';
                        const yKey = params.y_axis || params.y_label || (params.yAxisKeys?.[0]);

                        // Convert [[x, y], ...] format to [{xKey: x, yKeyName: y}, ...]
                        if (Array.isArray(chartData) && chartData.length > 0 && Array.isArray(chartData[0])) {
                            const yKeyName = yKey || 'Value';
                            chartData = chartData.map((row: any[]) => ({ [xKey]: row[0], [yKeyName]: row[1] }));
                        }

                        params.data = chartData;
                        params.xAxisKey = xKey;

                        // Derive yAxisKeys from actual data keys (excluding xAxisKey)
                        if (chartData && chartData[0]) {
                            const dataKeys = Object.keys(chartData[0]);
                            const yKeys = dataKeys.filter(k => k !== xKey);
                            params.yAxisKeys = yKeys.length > 0 ? yKeys : ['Value'];
                        } else {
                            params.yAxisKeys = yKey ? [yKey] : ['Value'];
                        }

                        params.type = params.type || 'line';
                        delete params.x_label;
                        delete params.x_axis;
                        delete params.y_label;
                        delete params.y_axis;

                        console.log('[generate_chart] Normalized params:', JSON.stringify(params));
                        session.emitBlock({ id: globalThis.crypto.randomUUID().slice(0, 14), type: 'widget', data: { widgetType: 'chart', params } });
                        return { status: 'Chart generated', message: 'The chart is now displayed. Please describe what it shows.' };
                    } catch (error) {
                        console.error('[generate_chart] Execution error:', error);
                        return { error: 'Failed to generate chart' };
                    }
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
            },
            create_document: {
                description: 'Create a new document with AI-generated content within the current space. Use this when the user asks you to create, write, or generate a document about a topic. Only available when chatting within a space.',
                parameters: z.object({
                    title: z.string().describe('The title of the document to create'),
                    topic: z.string().describe('The main topic or subject for the document content'),
                    requirements: z.string().optional().describe('Any specific requirements or instructions for the content')
                }),
                execute: async ({ title, topic, requirements }: { title: string, topic: string, requirements?: string }) => {
                    if (!spaceId) {
                        return { error: 'Document creation is only available within a space. Please navigate to a space first.' };
                    }

                    try {
                        // Verify space ownership
                        const space = await db.query.spaces.findFirst({
                            where: and(eq(spaces.id, spaceId), eq(spaces.userId, user.id)),
                        });

                        if (!space) {
                            return { error: 'Space not found or unauthorized' };
                        }

                        // Generate document content using AI
                        const documentTitle = title || topic;
                        const docGenSystemPrompt = `You are a master document writer and research expert. Generate professionally structured documents.

FORMATTING RULES:
- Use # for main title (only one)
- Use ## for major sections
- Use ### for subsections  
- Use **bold** for emphasis and key terms
- Use bullet points (-) for lists of items
- Use numbered lists (1. 2. 3.) for sequential steps or ranked items
- Use proper paragraph breaks between ideas
- Maintain consistent academic/professional tone

STRUCTURE:
1. Title (use the provided title)
2. Introduction with context and objectives
3. Main body with clear sections
4. Key points and details
5. Conclusion or summary

Write comprehensive, well-researched content. Be thorough and informative.`;

                        const docGenPrompt = requirements
                            ? `Create a comprehensive document titled "${documentTitle}" about: ${topic}\n\nAdditional requirements: ${requirements}`
                            : `Create a comprehensive document titled "${documentTitle}" about: ${topic}`;

                        const docResult = await generateText({
                            model: nim.chatModel('meta/llama-3.1-405b-instruct'),
                            system: docGenSystemPrompt,
                            prompt: docGenPrompt,
                        });

                        const generatedContent = docResult.text;

                        // Convert markdown to Tiptap JSON format
                        const tiptapContent = convertMarkdownToTiptap(generatedContent);

                        // Create the document
                        const docId = globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 32);

                        await db.insert(documents).values({
                            id: docId,
                            spaceId,
                            userId: user.id,
                            title: documentTitle,
                            content: tiptapContent,
                            plainText: generatedContent,
                        });

                        const docUrl = `/space/${spaceId}/docs/${docId}`;

                        // Emit a documentCreated block
                        session.emitBlock({
                            id: globalThis.crypto.randomUUID().slice(0, 14),
                            type: 'documentCreated',
                            data: {
                                documentId: docId,
                                title: documentTitle,
                                url: docUrl,
                                spaceId: spaceId
                            }
                        });

                        return {
                            success: true,
                            documentId: docId,
                            title: documentTitle,
                            url: docUrl,
                            message: `Document "${documentTitle}" has been created successfully!`
                        };
                    } catch (err) {
                        console.error('[ai-chat-v2] Document creation error:', err);
                        return { error: 'Failed to create document' };
                    }
                }
            }
        };

        const activeTools: any = {};

        // Tier 1: Presentation tools (ALWAYS available)
        activeTools.generate_chart = tools.generate_chart;
        activeTools.generate_table = tools.generate_table;
        activeTools.calculate = tools.calculate;
        activeTools.search_media = tools.search_media;

        // Tier 2: Search tools (source-gated)
        if (sources.includes('web')) activeTools.web_search = tools.web_search;
        if (sources.includes('academic')) activeTools.academic_search = tools.academic_search;
        if (sources.includes('discussions')) activeTools.social_search = tools.social_search;

        // Tier 2: Live data tools (search-gated)
        if (useSearch) {
            activeTools.scrape_url = tools.scrape_url;
            activeTools.get_weather = tools.get_weather;
            activeTools.get_stock_info = tools.get_stock_info;
            activeTools.get_latest_news = tools.get_latest_news;
        }

        // Tier 3: Persistence tools (space-gated)
        if (spaceId) {
            activeTools.create_document = tools.create_document;
        }

        // TWO-PASS ARCHITECTURE for Search + Tools + Streaming
        // PASS 1: generateText() with tools (non-streaming) - executes charts, tables, weather, etc.
        // PASS 2: streamText() without tools (streaming) - generates the final answer
        const runWithSearch = async () => {
            let fullText = '';
            let searchContext = '';
            let toolContext = '';

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

                // Build the enhanced message with search context
                // Issue 3 fix: Prevent duplicate search calls in PASS 1
                const searchGuard = searchContext
                    ? '\n\n[SYSTEM NOTE: Web search has already been performed. DO NOT call web_search again unless explicitly required.]'
                    : '';
                const enhancedMessage = searchContext
                    ? `${message.content}\n\n---\n${searchContext}${searchGuard}`
                    : message.content;

                // ===== PASS 1: Tool execution (NON-STREAMING) =====
                // This allows charts, tables, weather, stocks, calculator to work
                if (Object.keys(activeTools).length > 0) {
                    console.log(`[ai-chat-v2] PASS 1: Executing tools (${Object.keys(activeTools).join(', ')})`);

                    try {
                        const toolResult = await generateText({
                            model: nim.chatModel('meta/llama-3.1-405b-instruct'),
                            system: systemPrompt,
                            messages: [...formattedHistory, { role: 'user', content: enhancedMessage }],
                            tools: activeTools,
                            maxSteps: 5,
                        } as any);

                        // Detailed logging for debugging
                        console.log(`[ai-chat-v2] PASS 1 Result:`, {
                            finishReason: toolResult.finishReason,
                            stepsCount: toolResult.steps?.length || 0,
                            textLength: toolResult.text?.length || 0,
                            hasToolCalls: toolResult.steps?.some((s: any) => s.toolCalls?.length > 0) || false,
                        });

                        // Log tool usage
                        if (toolResult.steps && toolResult.steps.length > 0) {
                            for (const step of toolResult.steps) {
                                console.log(`[ai-chat-v2] Step:`, {
                                    stepType: (step as any).stepType,
                                    toolCallsCount: step.toolCalls?.length || 0,
                                    toolResultsCount: step.toolResults?.length || 0,
                                });
                                if (step.toolCalls && step.toolCalls.length > 0) {
                                    console.log(`[ai-chat-v2] Tool calls executed:`, step.toolCalls.map((tc: any) => tc.toolName));
                                }
                            }
                        }

                        // Issue 3 fix: Don't leak PASS 1 text - use explicit instruction only
                        // Widgets are already rendered, just tell model to describe them
                        if (toolResult.steps?.some((s: any) => s.toolCalls?.length > 0)) {
                            // Get list of tools that were called
                            const toolsCalled = toolResult.steps
                                ?.flatMap((s: any) => s.toolCalls?.map((tc: any) => tc.toolName) || [])
                                .filter(Boolean) || [];

                            toolContext = `\n\n[SYSTEM: The following tools were SUCCESSFULLY executed and their outputs are NOW VISIBLE above: ${toolsCalled.join(', ')}]
[IMPORTANT: The chart/table/widget IS displayed above. DO NOT say "no chart was generated" or "I was unable to generate". The visualization exists and is visible to the user.]
[YOUR TASK: Simply describe and interpret what the chart shows. Do not output tool calls as text.]`;
                            console.log(`[ai-chat-v2] PASS 1 complete. Tools were called: ${toolsCalled.join(', ')}`);
                        } else if (toolResult.text && toolResult.text.length > 0) {
                            console.log(`[ai-chat-v2] PASS 1 complete. Text generated but no tool calls.`);
                        } else {
                            console.log(`[ai-chat-v2] PASS 1 complete. No text or tool calls.`);
                        }
                    } catch (toolErr) {
                        console.error('[ai-chat-v2] PASS 1 tool execution error:', toolErr);
                        // Continue to PASS 2 even if tools fail
                    }
                }

                // ===== PASS 2: Streaming answer (NO TOOLS) =====
                console.log(`[ai-chat-v2] PASS 2: Streaming final response`);

                // Issue 4 fix: Use specific instruction for PASS 2
                const finalMessage = toolContext
                    ? `${enhancedMessage}\n\n${toolContext}\n\nThe visualization is now displayed above. Describe what it shows and provide insights. Do NOT claim "no chart was generated" - it exists and is visible.`
                    : enhancedMessage;

                const result = streamText({
                    model: nim.chatModel('meta/llama-3.1-405b-instruct'),
                    system: systemPrompt,
                    messages: [...formattedHistory, { role: 'user', content: finalMessage }],
                });

                let textBlockId = '';
                let lastUpdateTime = 0;
                let lastUpdateLength = 0;
                const UPDATE_INTERVAL_MS = 100;
                const UPDATE_CHAR_THRESHOLD = 50;

                // Single-pass streaming - emit blocks immediately as text comes in
                for await (const part of result.fullStream) {
                    if (part.type === 'text-delta') {
                        const textDelta = (part as any).textDelta ?? (part as any).text ?? '';
                        fullText += textDelta;

                        if (!textBlockId) {
                            // Create and emit the first text block immediately
                            const block = { id: globalThis.crypto.randomUUID().slice(0, 14), type: 'text' as const, data: fullText };
                            textBlockId = block.id;
                            session.emitBlock(block);
                            lastUpdateTime = Date.now();
                            lastUpdateLength = fullText.length;
                        } else {
                            // Throttled updates to avoid overwhelming the client
                            const now = Date.now();
                            const charsSinceUpdate = fullText.length - lastUpdateLength;
                            if (now - lastUpdateTime >= UPDATE_INTERVAL_MS || charsSinceUpdate >= UPDATE_CHAR_THRESHOLD) {
                                session.updateBlock(textBlockId, [{ op: 'replace', path: '/data', value: fullText }]);
                                lastUpdateTime = now;
                                lastUpdateLength = fullText.length;
                            }
                        }
                    } else if (part.type === 'finish') {
                        console.log(`[ai-chat-v2] Stream finished:`, (part as any).finishReason);
                    } else if (part.type === 'error') {
                        console.error(`[ai-chat-v2] Stream error:`, (part as any).error);
                    }
                }

                // Final update to ensure all text is captured
                if (textBlockId) {
                    session.updateBlock(textBlockId, [{ op: 'replace', path: '/data', value: fullText }]);
                }

                console.log(`[ai-chat-v2] PASS 2 complete. Text length:`, fullText.length);
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
                    // Include tools when in a space (for document creation)
                    const chatOptions: any = {
                        model: nim.chatModel('meta/llama-3.1-405b-instruct'),
                        system: systemPrompt,
                        messages: [...formattedHistory, { role: 'user', content: message.content }],
                    };

                    // Enable tools in non-search path (Tier-1 presentation tools are always available)
                    if (Object.keys(activeTools).length > 0) {
                        chatOptions.tools = activeTools;
                        chatOptions.maxSteps = 3; // Allow up to 3 tool calls
                    }

                    const result = streamText(chatOptions);

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
                        } else if (part.type === 'tool-call') {
                            console.log(`[ai-chat-v2] Tool call: ${part.toolName}`, (part as any).input || (part as any).args);
                        } else if (part.type === 'tool-result') {
                            console.log(`[ai-chat-v2] Tool result for ${part.toolName}:`, (part as any).output || (part as any).result);
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
