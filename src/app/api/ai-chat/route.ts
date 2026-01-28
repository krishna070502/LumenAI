import { z } from 'zod';
import ModelRegistry from '@/lib/models/registry';
import { ModelWithProvider } from '@/lib/models/types';
import ChatAgent from '@/lib/agents/chat';
import SessionManager from '@/lib/session';
import { ChatTurnMessage } from '@/lib/types';
import { SearchSources } from '@/lib/agents/search/types';
import db from '@/lib/db';
import { eq } from 'drizzle-orm';
import { chats } from '@/lib/db/schema';
import UploadManager from '@/lib/uploads/manager';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const messageSchema = z.object({
    messageId: z.string().min(1, 'Message ID is required'),
    chatId: z.string().min(1, 'Chat ID is required'),
    content: z.string().min(1, 'Message content is required'),
});

const chatModelSchema: z.ZodType<ModelWithProvider> = z.object({
    providerId: z.string({ message: 'Chat model provider id must be provided' }),
    key: z.string({ message: 'Chat model key must be provided' }),
});

const bodySchema = z.object({
    message: messageSchema,
    history: z
        .array(z.tuple([z.string(), z.string()]))
        .optional()
        .default([]),
    chatModel: chatModelSchema,
    systemInstructions: z.string().nullable().optional().default(''),
});

type Body = z.infer<typeof bodySchema>;

const safeValidateBody = (data: unknown) => {
    const result = bodySchema.safeParse(data);

    if (!result.success) {
        return {
            success: false,
            error: result.error.issues.map((e: any) => ({
                path: e.path.join('.'),
                message: e.message,
            })),
        };
    }

    return {
        success: true,
        data: result.data,
    };
};

const ensureChatExists = async (input: {
    id: string;
    userId: string;
    query: string;
}) => {
    try {
        const exists = await db.query.chats
            .findFirst({
                where: eq(chats.id, input.id),
            })
            .execute();

        if (!exists) {
            await db.insert(chats).values({
                id: input.id,
                userId: input.userId,
                title: input.query,
                sources: [] as SearchSources[],
                files: [],
            });
        }
    } catch (err) {
        console.error('Failed to check/save chat:', err);
    }
};

export const POST = async (req: Request) => {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return Response.json(
                { message: 'Unauthorized - Please log in to send messages' },
                { status: 401 },
            );
        }

        const reqBody = (await req.json()) as Body;

        const parseBody = safeValidateBody(reqBody);

        if (!parseBody.success) {
            return Response.json(
                { message: 'Invalid request body', error: parseBody.error },
                { status: 400 },
            );
        }

        const body = parseBody.data as Body;
        const { message } = body;

        if (message.content === '') {
            return Response.json(
                {
                    message: 'Please provide a message to process',
                },
                { status: 400 },
            );
        }

        const registry = ModelRegistry.getInstance();

        const llm = await registry.loadChatModel(
            body.chatModel.providerId,
            body.chatModel.key,
        );

        const history: ChatTurnMessage[] = body.history.map((msg) => {
            if (msg[0] === 'human') {
                return {
                    role: 'user',
                    content: msg[1],
                };
            } else {
                return {
                    role: 'assistant',
                    content: msg[1],
                };
            }
        });

        const agent = new ChatAgent();
        const session = SessionManager.createSession();

        const responseStream = new TransformStream();
        const writer = responseStream.writable.getWriter();
        const encoder = new TextEncoder();

        const disconnect = session.subscribe((event: string, data: any) => {
            if (event === 'data') {
                if (data.type === 'block') {
                    writer.write(
                        encoder.encode(
                            JSON.stringify({
                                type: 'block',
                                block: data.block,
                            }) + '\n',
                        ),
                    );
                } else if (data.type === 'updateBlock') {
                    writer.write(
                        encoder.encode(
                            JSON.stringify({
                                type: 'updateBlock',
                                blockId: data.blockId,
                                patch: data.patch,
                            }) + '\n',
                        ),
                    );
                }
            } else if (event === 'end') {
                // Emit researchComplete immediately for chat mode (no research phase)
                writer.write(
                    encoder.encode(
                        JSON.stringify({
                            type: 'researchComplete',
                        }) + '\n',
                    ),
                );
                writer.write(
                    encoder.encode(
                        JSON.stringify({
                            type: 'messageEnd',
                        }) + '\n',
                    ),
                );
                writer.close();
                session.removeAllListeners();
            } else if (event === 'error') {
                writer.write(
                    encoder.encode(
                        JSON.stringify({
                            type: 'error',
                            data: data.data,
                        }) + '\n',
                    ),
                );
                writer.close();
                session.removeAllListeners();
            }
        });

        agent.chatAsync(session, {
            chatHistory: history,
            message: message.content,
            chatId: body.message.chatId,
            messageId: body.message.messageId,
            userId: user.id,
            llm,
            systemInstructions: body.systemInstructions || 'None',
        });

        ensureChatExists({
            id: body.message.chatId,
            userId: user.id,
            query: body.message.content,
        });

        req.signal.addEventListener('abort', () => {
            disconnect();
            writer.close();
        });

        return new Response(responseStream.readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                Connection: 'keep-alive',
                'Cache-Control': 'no-cache, no-transform',
            },
        });
    } catch (err) {
        console.error('An error occurred while processing AI chat request:', err);
        return Response.json(
            { message: 'An error occurred while processing AI chat request' },
            { status: 500 },
        );
    }
};
