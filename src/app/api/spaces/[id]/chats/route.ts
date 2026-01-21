import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { chats, spaces } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, and, desc } from 'drizzle-orm';

// GET - List all chats for a specific space
export async function GET(
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

        // Get all chats for this space
        const spaceChats = await db
            .select({
                id: chats.id,
                title: chats.title,
                createdAt: chats.createdAt,
                chatMode: chats.chatMode,
            })
            .from(chats)
            .where(and(eq(chats.spaceId, spaceId), eq(chats.userId, user.id)))
            .orderBy(desc(chats.createdAt));

        return NextResponse.json({ chats: spaceChats });
    } catch (error) {
        console.error('Error fetching space chats:', error);
        return NextResponse.json({ message: 'Failed to fetch chats' }, { status: 500 });
    }
}
