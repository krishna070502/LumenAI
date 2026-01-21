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

// POST - Generate document content with AI
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
        const { prompt, mode, existingContent } = body;

        // mode: 'generate' for full doc, 'assist' for help writing, 'continue' for continuation
        let systemPrompt = '';
        let userPrompt = '';

        if (mode === 'generate') {
            systemPrompt = `You are a master document writer and research paper expert. Generate professionally structured documents.

FORMATTING RULES:
- Use # for main title (only one)
- Use ## for major sections
- Use ### for subsections  
- Use **bold** for emphasis and key terms
- Use bullet points (-) for lists of items
- Use numbered lists (1. 2. 3.) for sequential steps or ranked items
- Use proper paragraph breaks between ideas
- Maintain consistent academic/professional tone

STRUCTURE FOR RESEARCH PAPERS:
1. Title and Abstract
2. Introduction with context and objectives
3. Main body with clear sections
4. Analysis and findings
5. Conclusion and recommendations

Write comprehensive, well-researched content with proper citations style (Author, Year) where applicable.`;
            userPrompt = `Generate a professional, well-structured document about: ${prompt}`;
        } else if (mode === 'assist') {
            systemPrompt = `You are a professional writing assistant for documents and research papers.

RULES:
- Output ONLY the text to insert, no meta-commentary
- Use proper markdown formatting (## headings, **bold**, - bullets, 1. numbered)
- Match the existing document's style and tone
- Write clear, professional prose
- Structure content logically with proper sections`;
            userPrompt = existingContent
                ? `Document context:\n${existingContent}\n\nRequest: ${prompt}`
                : prompt;
        } else if (mode === 'continue') {
            systemPrompt = `You are a professional document continuation expert. Continue writing seamlessly.

RULES:
- Match exact style, tone, and formatting of existing content
- Don't repeat previous content
- Maintain logical flow and structure
- Use proper markdown (## headings, **bold**, - bullets)
- Add appropriate transitions`;
            userPrompt = `Continue this document naturally:\n\n${existingContent}`;
        } else if (mode === 'improve') {
            systemPrompt = `You are an expert editor for professional documents and research papers.

IMPROVEMENTS TO MAKE:
- Fix grammar and spelling
- Enhance clarity and readability
- Improve sentence structure and flow
- Strengthen transitions between ideas
- Use proper formatting (## headings, **bold**, - bullets)
- Maintain professional/academic tone

Return ONLY the improved text, no explanations.`;
            userPrompt = existingContent;
        } else if (mode === 'summarize') {
            systemPrompt = `You are a document summarization expert.

Create a well-structured summary:
## Summary
Brief overview in 2-3 sentences

## Key Points
- Bullet point highlights

## Main Findings
Most important insights`;
            userPrompt = `Summarize this content:\n\n${existingContent}`;
        }

        const model = nvidia('meta/llama-3.1-405b-instruct');

        const result = await generateText({
            model,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.7,
        });

        return NextResponse.json({
            content: result.text,
            mode
        });
    } catch (error) {
        console.error('Error generating content:', error);
        return NextResponse.json({ message: 'Failed to generate content' }, { status: 500 });
    }
}
