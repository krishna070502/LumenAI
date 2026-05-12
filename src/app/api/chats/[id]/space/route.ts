import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { chats, spaces } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

// PATCH - Update a chat's space assignment
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { spaceId } = body;

        // Verify chat exists and belongs to user
        const chat = await db.query.chats.findFirst({
            where: and(eq(chats.id, id), eq(chats.userId, user.id)),
        });

        if (!chat) {
            return NextResponse.json({ message: 'Chat not found' }, { status: 404 });
        }

        // If spaceId is provided, verify it exists and belongs to user
        if (spaceId) {
            const space = await db.query.spaces.findFirst({
                where: and(eq(spaces.id, spaceId), eq(spaces.userId, user.id)),
            });

            if (!space) {
                return NextResponse.json({ message: 'Space not found' }, { status: 404 });
            }
        }

        // Update the chat's spaceId
        await db
            .update(chats)
            .set({ spaceId: spaceId || null })
            .where(eq(chats.id, id));

        return NextResponse.json({
            message: spaceId ? 'Chat added to space' : 'Chat removed from space',
            chatId: id,
            spaceId: spaceId || null,
        });
    } catch (error) {
        console.error('Error updating chat space:', error);
        return NextResponse.json({ message: 'Failed to update chat space' }, { status: 500 });
    }
}
