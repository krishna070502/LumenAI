import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { chats } from '@/lib/db/schema';

export const GET = async (req: Request) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        { message: 'Unauthorized - Please log in to view chats' },
        { status: 401 },
      );
    }

    console.log(`[api/chats] Fetching chats for userId: ${user.id}`);
    const userChats = await db.query.chats.findMany({
      where: eq(chats.userId, user.id),
      orderBy: [desc(chats.createdAt)],
    });
    console.log(`[api/chats] Found ${userChats.length} chats for user ${user.id}`);
    if (userChats.length > 0) {
      console.log(`[api/chats] First chat createdAt: ${userChats[0].createdAt}, title: ${userChats[0].title}`);
    }
    return Response.json({ chats: userChats }, { status: 200 });
  } catch (err) {
    console.error('Error in getting chats: ', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};
