import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { chats } from '@/lib/db/schema';

// GET all chats for search (including space chats)
export const GET = async (req: Request) => {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return Response.json(
                { message: 'Unauthorized - Please log in to view chats' },
                { status: 401 },
            );
        }

        // Return ALL chats including those in spaces (for search functionality)
        const userChats = await db.query.chats.findMany({
            where: eq(chats.userId, user.id),
            orderBy: [desc(chats.createdAt)],
        });

        return Response.json({ chats: userChats }, { status: 200 });
    } catch (err) {
        console.error('Error in getting all chats: ', err);
        return Response.json(
            { message: 'An error has occurred.' },
            { status: 500 },
        );
    }
};
