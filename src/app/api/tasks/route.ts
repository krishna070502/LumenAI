import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { tasks } from '@/lib/db/schema';
import crypto from 'crypto';

// GET - List tasks for current user with optional filters
export const GET = async (req: Request) => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status'); // pending, completed
        const priority = searchParams.get('priority'); // low, medium, high
        const projectId = searchParams.get('projectId');
        const view = searchParams.get('view'); // today, upcoming, all

        let conditions = [eq(tasks.userId, user.id)];

        if (status) {
            conditions.push(eq(tasks.status, status as 'pending' | 'completed'));
        }
        if (priority) {
            conditions.push(eq(tasks.priority, priority as 'low' | 'medium' | 'high'));
        }
        if (projectId) {
            conditions.push(eq(tasks.projectId, projectId));
        }

        // Date filters for views
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        if (view === 'today') {
            conditions.push(gte(tasks.dueDate, today));
            conditions.push(lte(tasks.dueDate, tomorrow));
        } else if (view === 'upcoming') {
            conditions.push(gte(tasks.dueDate, today));
            conditions.push(lte(tasks.dueDate, weekFromNow));
        }

        const userTasks = await db.query.tasks.findMany({
            where: and(...conditions),
            orderBy: [desc(tasks.createdAt)],
        });

        return Response.json({ tasks: userTasks }, { status: 200 });
    } catch (err) {
        console.error('Error fetching tasks:', err);
        return Response.json({ message: 'An error occurred' }, { status: 500 });
    }
};

// POST - Create a new task
export const POST = async (req: Request) => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { title, description, priority, projectId, dueDate, tags } = body;

        if (!title) {
            return Response.json({ message: 'Title is required' }, { status: 400 });
        }

        const taskId = crypto.randomBytes(16).toString('hex');

        await db.insert(tasks).values({
            id: taskId,
            userId: user.id,
            title,
            description: description || null,
            priority: priority || 'medium',
            projectId: projectId || null,
            dueDate: dueDate ? new Date(dueDate) : null,
            tags: tags || [],
            status: 'pending',
        });

        const newTask = await db.query.tasks.findFirst({
            where: eq(tasks.id, taskId),
        });

        return Response.json({ task: newTask }, { status: 201 });
    } catch (err) {
        console.error('Error creating task:', err);
        return Response.json({ message: 'An error occurred' }, { status: 500 });
    }
};
