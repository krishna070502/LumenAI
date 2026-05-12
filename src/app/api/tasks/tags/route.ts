import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { taskTags } from '@/lib/db/schema';
import crypto from 'crypto';

// GET - List task tags for current user
export const GET = async (req: Request) => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const tags = await db.query.taskTags.findMany({
            where: eq(taskTags.userId, user.id),
            orderBy: [desc(taskTags.createdAt)],
        });

        return Response.json({ tags }, { status: 200 });
    } catch (err) {
        console.error('Error fetching tags:', err);
        return Response.json({ message: 'An error occurred' }, { status: 500 });
    }
};

// POST - Create a new tag
export const POST = async (req: Request) => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, color } = body;

        if (!name) {
            return Response.json({ message: 'Name is required' }, { status: 400 });
        }

        const tagId = crypto.randomBytes(16).toString('hex');

        await db.insert(taskTags).values({
            id: tagId,
            userId: user.id,
            name,
            color: color || '#6366f1',
        });

        const newTag = await db.query.taskTags.findFirst({
            where: eq(taskTags.id, tagId),
        });

        return Response.json({ tag: newTag }, { status: 201 });
    } catch (err) {
        console.error('Error creating tag:', err);
        return Response.json({ message: 'An error occurred' }, { status: 500 });
    }
};

// DELETE - Delete a tag
export const DELETE = async (req: Request) => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return Response.json({ message: 'Tag ID required' }, { status: 400 });
        }

        await db.delete(taskTags).where(eq(taskTags.id, id));

        return Response.json({ message: 'Tag deleted' }, { status: 200 });
    } catch (err) {
        console.error('Error deleting tag:', err);
        return Response.json({ message: 'An error occurred' }, { status: 500 });
    }
};
