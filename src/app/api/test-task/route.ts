import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';
import { tasks, taskProjects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return Response.json({ message: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { action, projectName, taskTitle } = body;

        if (action === 'create_project') {
            const projectId = globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 32);
            await db.insert(taskProjects).values({
                id: projectId,
                userId: user.id,
                name: projectName || 'Test Project',
                color: '#8b5cf6',
                icon: '📁',
            });
            return Response.json({ success: true, projectId, message: `Project "${projectName}" created!` });
        }

        if (action === 'create_task') {
            // First find or create project
            let projectId = null;
            if (projectName) {
                const existingProject = await db.query.taskProjects.findFirst({
                    where: and(
                        eq(taskProjects.userId, user.id),
                        eq(taskProjects.name, projectName)
                    )
                });
                if (existingProject) {
                    projectId = existingProject.id;
                } else {
                    projectId = globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 32);
                    await db.insert(taskProjects).values({
                        id: projectId,
                        userId: user.id,
                        name: projectName,
                        color: '#8b5cf6',
                        icon: '📁',
                    });
                }
            }

            const taskId = globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 32);
            await db.insert(tasks).values({
                id: taskId,
                userId: user.id,
                title: taskTitle || 'Test Task',
                description: null,
                priority: 'medium',
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
                projectId,
                tags: [],
                status: 'pending',
            });

            return Response.json({
                success: true,
                taskId,
                projectId,
                message: `Task "${taskTitle}" created${projectId ? ` in project "${projectName}"` : ''}!`
            });
        }

        if (action === 'list') {
            const projects = await db.query.taskProjects.findMany({
                where: eq(taskProjects.userId, user.id),
            });
            const userTasks = await db.query.tasks.findMany({
                where: eq(tasks.userId, user.id),
            });
            return Response.json({ projects, tasks: userTasks });
        }

        return Response.json({ error: 'Unknown action' }, { status: 400 });
    } catch (err) {
        console.error('[test-task] Error:', err);
        return Response.json({ error: String(err) }, { status: 500 });
    }
}
