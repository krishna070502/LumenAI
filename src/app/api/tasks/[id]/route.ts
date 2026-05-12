import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { tasks } from '@/lib/db/schema';

// GET - Get a single task
export const GET = async (
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const task = await db.query.tasks.findFirst({
            where: and(eq(tasks.id, id), eq(tasks.userId, user.id)),
        });

        if (!task) {
            return Response.json({ message: 'Task not found' }, { status: 404 });
        }

        return Response.json({ task }, { status: 200 });
    } catch (err) {
        console.error('Error fetching task:', err);
        return Response.json({ message: 'An error occurred' }, { status: 500 });
    }
};

// PATCH - Update a task
export const PATCH = async (
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { title, description, priority, status, projectId, dueDate, tags } = body;

        // Verify task exists and belongs to user
        const existingTask = await db.query.tasks.findFirst({
            where: and(eq(tasks.id, id), eq(tasks.userId, user.id)),
        });

        if (!existingTask) {
            return Response.json({ message: 'Task not found' }, { status: 404 });
        }

        const updateData: Record<string, unknown> = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (priority !== undefined) updateData.priority = priority;
        if (projectId !== undefined) updateData.projectId = projectId;
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
        if (tags !== undefined) updateData.tags = tags;

        if (status !== undefined) {
            updateData.status = status;
            if (status === 'completed') {
                updateData.completedAt = new Date();
            } else {
                updateData.completedAt = null;
            }
        }

        await db.update(tasks).set(updateData).where(eq(tasks.id, id));

        const updatedTask = await db.query.tasks.findFirst({
            where: eq(tasks.id, id),
        });

        return Response.json({ task: updatedTask }, { status: 200 });
    } catch (err) {
        console.error('Error updating task:', err);
        return Response.json({ message: 'An error occurred' }, { status: 500 });
    }
};

// DELETE - Delete a task
export const DELETE = async (
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Verify task exists and belongs to user
        const existingTask = await db.query.tasks.findFirst({
            where: and(eq(tasks.id, id), eq(tasks.userId, user.id)),
        });

        if (!existingTask) {
            return Response.json({ message: 'Task not found' }, { status: 404 });
        }

        await db.delete(tasks).where(eq(tasks.id, id));

        return Response.json({ message: 'Task deleted' }, { status: 200 });
    } catch (err) {
        console.error('Error deleting task:', err);
        return Response.json({ message: 'An error occurred' }, { status: 500 });
    }
};
