import { NextRequest, NextResponse } from 'next/server';
import { neonAuth } from '@neondatabase/auth/next/server';
import db from '@/lib/db';
import { memories } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET - Fetch all memories for the current user
export async function GET() {
    try {
        const { session, user } = await neonAuth();

        if (!session || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userMemories = await db
            .select({
                id: memories.id,
                content: memories.content,
                importance: memories.importance,
                createdAt: memories.createdAt,
                lastAccessedAt: memories.lastAccessedAt,
            })
            .from(memories)
            .where(eq(memories.userId, user.id))
            .orderBy(desc(memories.createdAt))
            .limit(50);

        return NextResponse.json({ memories: userMemories });
    } catch (error) {
        console.error('Error fetching user memories:', error);
        return NextResponse.json(
            { error: 'Failed to fetch memories' },
            { status: 500 }
        );
    }
}

// DELETE - Delete a specific memory or all memories
export async function DELETE(request: NextRequest) {
    try {
        const { session, user } = await neonAuth();

        if (!session || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const memoryId = searchParams.get('id');
        const deleteAll = searchParams.get('all') === 'true';

        if (deleteAll) {
            // Delete all memories for this user
            await db.delete(memories).where(eq(memories.userId, user.id));
            return NextResponse.json({ success: true, message: 'All memories deleted' });
        } else if (memoryId) {
            // Delete specific memory (ensure it belongs to this user)
            const existing = await db
                .select()
                .from(memories)
                .where(eq(memories.id, parseInt(memoryId)))
                .limit(1);

            if (existing.length === 0) {
                return NextResponse.json(
                    { error: 'Memory not found' },
                    { status: 404 }
                );
            }

            if (existing[0].userId !== user.id) {
                return NextResponse.json(
                    { error: 'Unauthorized to delete this memory' },
                    { status: 403 }
                );
            }

            await db.delete(memories).where(eq(memories.id, parseInt(memoryId)));
            return NextResponse.json({ success: true, message: 'Memory deleted' });
        } else {
            return NextResponse.json(
                { error: 'Must specify memory id or all=true' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Error deleting memory:', error);
        return NextResponse.json(
            { error: 'Failed to delete memory' },
            { status: 500 }
        );
    }
}
