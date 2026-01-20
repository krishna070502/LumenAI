import { NextRequest, NextResponse } from 'next/server';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';

// Create NVIDIA NIM client
const nim = createOpenAICompatible({
    name: 'nvidia-nim',
    baseURL: 'https://integrate.api.nvidia.com/v1',
    headers: {
        Authorization: `Bearer ${process.env.NVIDIA_NIM_API_KEY}`,
    },
});

// Summarize article content using AI
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { content, title, url } = body;

        if (!content) {
            return NextResponse.json(
                { error: 'Content is required' },
                { status: 400 }
            );
        }

        const result = await generateText({
            model: nim.chatModel('meta/llama-3.1-405b-instruct'),
            system: `You are an expert summarizer. Create a clear, concise summary of the article content provided.

Guidelines:
- Keep the summary to 3-5 paragraphs
- Highlight key points and main takeaways
- Maintain the original meaning and context
- Use clear, accessible language
- Don't include your own opinions`,
            messages: [
                {
                    role: 'user',
                    content: `Please summarize this article${title ? ` titled "${title}"` : ''}:\n\n${content.slice(0, 10000)}`, // Limit content length
                },
            ],
        });

        return NextResponse.json({
            summary: result.text,
            title,
            url,
        });
    } catch (error) {
        console.error('Error summarizing article:', error);
        return NextResponse.json(
            { error: 'Failed to summarize article' },
            { status: 500 }
        );
    }
}
