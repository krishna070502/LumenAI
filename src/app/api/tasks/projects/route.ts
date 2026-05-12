import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { taskProjects } from '@/lib/db/schema';
import crypto from 'crypto';

// GET - List task projects for current user
export const GET = async (req: Request) => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const projects = await db.query.taskProjects.findMany({
            where: eq(taskProjects.userId, user.id),
            orderBy: [desc(taskProjects.createdAt)],
        });

        return Response.json({ projects }, { status: 200 });
    } catch (err) {
        console.error('Error fetching projects:', err);
        return Response.json({ message: 'An error occurred' }, { status: 500 });
    }
};

// POST - Create a new project
export const POST = async (req: Request) => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, color, icon } = body;

        if (!name) {
            return Response.json({ message: 'Name is required' }, { status: 400 });
        }

        const projectId = crypto.randomBytes(16).toString('hex');

        await db.insert(taskProjects).values({
            id: projectId,
            userId: user.id,
            name,
            color: color || '#6366f1',
            icon: icon || '📁',
        });

        const newProject = await db.query.taskProjects.findFirst({
            where: eq(taskProjects.id, projectId),
        });

        return Response.json({ project: newProject }, { status: 201 });
    } catch (err) {
        console.error('Error creating project:', err);
        return Response.json({ message: 'An error occurred' }, { status: 500 });
    }
};

// DELETE - Delete a project
export const DELETE = async (req: Request) => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return Response.json({ message: 'Project ID required' }, { status: 400 });
        }

        await db.delete(taskProjects).where(eq(taskProjects.id, id));

        return Response.json({ message: 'Project deleted' }, { status: 200 });
    } catch (err) {
        console.error('Error deleting project:', err);
        return Response.json({ message: 'An error occurred' }, { status: 500 });
    }
};
