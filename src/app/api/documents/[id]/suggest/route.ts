import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { documents, spaces } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';

const nvidia = createOpenAICompatible({
    name: 'nvidia-nim',
    baseURL: process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    headers: {
        Authorization: `Bearer ${process.env.NVIDIA_NIM_API_KEY}`,
    },
});

// POST - Get quick AI suggestion for autocomplete
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: docId } = await params;
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const doc = await db.query.documents.findFirst({
            where: eq(documents.id, docId),
        });

        if (!doc) {
            return NextResponse.json({ message: 'Document not found' }, { status: 404 });
        }

        // Verify ownership
        const space = await db.query.spaces.findFirst({
            where: and(eq(spaces.id, doc.spaceId), eq(spaces.userId, user.id)),
        });

        if (!space) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { context } = body; // Text before cursor

        if (!context || context.trim().length < 10) {
            return NextResponse.json({ suggestion: '' });
        }

        // Get just the last part for completion - keep it simple
        const lastChars = context.slice(-150).trim();

        // Find a natural break point (sentence or line end)
        const lastNewline = lastChars.lastIndexOf('\n');
        const textToComplete = lastNewline > 20 ? lastChars.slice(lastNewline + 1) : lastChars;

        const systemPrompt = `You are a text autocomplete. Complete the user's sentence with a few natural words.

RULES:
- Output ONLY the completion words (3-10 words max)
- Continue the sentence naturally  
- No URLs, no citations, no references
- No quotes around your response
- No explanations or commentary
- Match the writing tone`;

        const userPrompt = textToComplete;

        const model = nvidia('meta/llama-3.1-405b-instruct');

        const result = await generateText({
            model,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.1, // Very low for predictable output
        });

        // Clean up the suggestion
        let suggestion = result.text.trim();

        // Remove quotes if the model wrapped the response
        if (suggestion.startsWith('"') && suggestion.endsWith('"')) {
            suggestion = suggestion.slice(1, -1);
        }
        if (suggestion.startsWith("'") && suggestion.endsWith("'")) {
            suggestion = suggestion.slice(1, -1);
        }

        // Reject bad suggestions (URLs, citations, too long, etc.)
        if (
            suggestion.includes('http') ||
            suggestion.includes('www.') ||
            suggestion.includes('arxiv') ||
            suggestion.includes('Retrieved from') ||
            suggestion.includes('[') ||
            suggestion.includes('(20') || // Year citations like (2023)
            suggestion.length > 100 ||
            suggestion.length < 2
        ) {
            return NextResponse.json({ suggestion: '' });
        }

        return NextResponse.json({ suggestion });
    } catch (error) {
        console.error('Error generating suggestion:', error);
        return NextResponse.json({ suggestion: '' });
    }
}
