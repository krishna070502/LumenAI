import { ChatAgentInput } from '@/lib/agents/chat/types';
import SessionManager from '@/lib/session';
import db from '@/lib/db';
import { chats, messages } from '@/lib/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { TextBlock } from '@/lib/types';
import { getChatPrompt } from '@/lib/prompts/chat';

/**
 * ChatAgent - Direct AI conversation agent
 * 
 * Unlike SearchAgent, this agent bypasses web search and research entirely,
 * providing direct LLM conversation for chat-first interactions.
 */
class ChatAgent {
    async chatAsync(session: SessionManager, input: ChatAgentInput) {
        const exists = await db.query.messages.findFirst({
            where: and(
                eq(messages.chatId, input.chatId),
                eq(messages.messageId, input.messageId),
            ),
        });

        if (!exists) {
            await db.insert(messages).values({
                chatId: input.chatId,
                messageId: input.messageId,
                userId: input.userId,
                backendId: session.id,
                query: input.message,
                createdAt: new Date(),
                status: 'answering',
                responseBlocks: [],
            });
        } else {
            await db
                .delete(messages)
                .where(
                    and(eq(messages.chatId, input.chatId), gt(messages.id, exists.id)),
                )
                .execute();
            await db
                .update(messages)
                .set({
                    status: 'answering',
                    backendId: session.id,
                    responseBlocks: [],
                })
                .where(
                    and(
                        eq(messages.chatId, input.chatId),
                        eq(messages.messageId, input.messageId),
                    ),
                )
                .execute();
        }

        // No classification, no search, no widgets - direct LLM conversation
        const chatPrompt = getChatPrompt(input.systemInstructions);

        const answerStream = input.llm.streamText({
            messages: [
                {
                    role: 'system',
                    content: chatPrompt,
                },
                ...input.chatHistory,
                {
                    role: 'user',
                    content: input.message,
                },
            ],
        });

        let responseBlockId = '';

        for await (const chunk of answerStream) {
            if (!responseBlockId) {
                const block: TextBlock = {
                    id: crypto.randomUUID(),
                    type: 'text',
                    data: chunk.contentChunk,
                };

                session.emitBlock(block);

                responseBlockId = block.id;
            } else {
                const block = session.getBlock(responseBlockId) as TextBlock | null;

                if (!block) {
                    continue;
                }

                block.data += chunk.contentChunk;

                session.updateBlock(block.id, [
                    {
                        op: 'replace',
                        path: '/data',
                        value: block.data,
                    },
                ]);
            }
        }

        session.emit('end', {});

        await db
            .update(messages)
            .set({
                status: 'completed',
                responseBlocks: session.getAllBlocks(),
            })
            .where(
                and(
                    eq(messages.chatId, input.chatId),
                    eq(messages.messageId, input.messageId),
                ),
            )
            .execute();
    }
}

export default ChatAgent;
