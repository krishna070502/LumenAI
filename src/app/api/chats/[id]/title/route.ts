import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { chats } from '@/lib/db/schema';

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

        const chat = await db.query.chats.findFirst({
            where: and(eq(chats.id, id), eq(chats.userId, user.id)),
            columns: { title: true },
        });

        if (!chat) {
            return Response.json({ message: 'Chat not found' }, { status: 404 });
        }

        return Response.json({ title: chat.title });
    } catch (err) {
        console.error('Error fetching chat title:', err);
        return Response.json({ message: 'Error' }, { status: 500 });
    }
};
