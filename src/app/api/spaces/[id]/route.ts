import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { spaces, chats } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

// GET - Get space by ID
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const space = await db.query.spaces.findFirst({
            where: and(eq(spaces.id, id), eq(spaces.userId, user.id)),
        });

        if (!space) {
            return NextResponse.json({ message: 'Space not found' }, { status: 404 });
        }

        return NextResponse.json({ space });
    } catch (error) {
        console.error('Error fetching space:', error);
        return NextResponse.json({ message: 'Failed to fetch space' }, { status: 500 });
    }
}

// PATCH - Update space
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, description, icon, systemPrompt, settings } = body;

        // Verify ownership
        const existingSpace = await db.query.spaces.findFirst({
            where: and(eq(spaces.id, id), eq(spaces.userId, user.id)),
        });

        if (!existingSpace) {
            return NextResponse.json({ message: 'Space not found' }, { status: 404 });
        }

        await db
            .update(spaces)
            .set({
                name: name?.trim() || existingSpace.name,
                description: description?.trim() ?? existingSpace.description,
                icon: icon || existingSpace.icon,
                systemPrompt: systemPrompt?.trim() ?? existingSpace.systemPrompt,
                settings: settings ?? existingSpace.settings,
            })
            .where(eq(spaces.id, id));

        return NextResponse.json({ message: 'Space updated' });
    } catch (error) {
        console.error('Error updating space:', error);
        return NextResponse.json({ message: 'Failed to update space' }, { status: 500 });
    }
}

// DELETE - Delete space and all associated chats
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership
        const existingSpace = await db.query.spaces.findFirst({
            where: and(eq(spaces.id, id), eq(spaces.userId, user.id)),
        });

        if (!existingSpace) {
            return NextResponse.json({ message: 'Space not found' }, { status: 404 });
        }

        // Delete associated chats first
        await db.delete(chats).where(eq(chats.spaceId, id));

        // Delete the space
        await db.delete(spaces).where(eq(spaces.id, id));

        return NextResponse.json({ message: 'Space deleted' });
    } catch (error) {
        console.error('Error deleting space:', error);
        return NextResponse.json({ message: 'Failed to delete space' }, { status: 500 });
    }
}
