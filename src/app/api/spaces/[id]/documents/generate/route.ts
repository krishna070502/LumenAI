import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { documents, spaces } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';
import crypto from 'crypto';

const nvidia = createOpenAICompatible({
    name: 'nvidia-nim',
    baseURL: process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    headers: {
        Authorization: `Bearer ${process.env.NVIDIA_NIM_API_KEY}`,
    },
});

// POST - Generate a new document with AI content
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: spaceId } = await params;
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Verify space ownership
        const space = await db.query.spaces.findFirst({
            where: and(eq(spaces.id, spaceId), eq(spaces.userId, user.id)),
        });

        if (!space) {
            return NextResponse.json({ message: 'Space not found' }, { status: 404 });
        }

        const body = await req.json();
        const { title, topic, requirements } = body;

        if (!title && !topic) {
            return NextResponse.json({ message: 'Title or topic is required' }, { status: 400 });
        }

        // Generate document title if not provided
        const documentTitle = title || `${topic}`;

        // Generate document content using AI
        const systemPrompt = `You are a master document writer and research expert. Generate professionally structured documents.

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

        const userPrompt = requirements
            ? `Create a comprehensive document titled "${documentTitle}" about: ${topic || title}\n\nAdditional requirements: ${requirements}`
            : `Create a comprehensive document titled "${documentTitle}" about: ${topic || title}`;

        const model = nvidia('meta/llama-3.1-405b-instruct');

        const result = await generateText({
            model,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.7,
        });

        const generatedContent = result.text;

        // Convert markdown to Tiptap JSON format
        const tiptapContent = convertMarkdownToTiptap(generatedContent);

        // Create the document
        const docId = crypto.randomBytes(16).toString('hex');

        await db.insert(documents).values({
            id: docId,
            spaceId,
            userId: user.id,
            title: documentTitle,
            content: tiptapContent,
            plainText: generatedContent,
        });

        return NextResponse.json({
            document: {
                id: docId,
                title: documentTitle,
                url: `/space/${spaceId}/docs/${docId}`,
            },
            success: true,
        });
    } catch (error) {
        console.error('Error generating document:', error);
        return NextResponse.json({ message: 'Failed to generate document' }, { status: 500 });
    }
}

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
