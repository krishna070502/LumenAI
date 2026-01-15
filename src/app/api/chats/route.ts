import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
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

    let userChats = await db.query.chats.findMany({
      where: eq(chats.userId, user.id),
    });
    userChats = userChats.reverse();
    return Response.json({ chats: userChats }, { status: 200 });
  } catch (err) {
    console.error('Error in getting chats: ', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};
