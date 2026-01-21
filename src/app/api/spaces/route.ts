import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { spaces } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

// GET - List all spaces for current user
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const userSpaces = await db
            .select()
            .from(spaces)
            .where(eq(spaces.userId, user.id))
            .orderBy(desc(spaces.createdAt));

        return NextResponse.json({ spaces: userSpaces });
    } catch (error) {
        console.error('Error fetching spaces:', error);
        return NextResponse.json({ message: 'Failed to fetch spaces' }, { status: 500 });
    }
}

// POST - Create a new space
export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, description, icon, systemPrompt } = body;

        if (!name || name.trim().length === 0) {
            return NextResponse.json({ message: 'Space name is required' }, { status: 400 });
        }

        const spaceId = crypto.randomBytes(16).toString('hex');

        await db.insert(spaces).values({
            id: spaceId,
            userId: user.id,
            name: name.trim(),
            description: description?.trim() || null,
            icon: icon || '📁',
            systemPrompt: systemPrompt?.trim() || null,
        });

        return NextResponse.json({
            space: {
                id: spaceId,
                name: name.trim(),
                description: description?.trim() || null,
                icon: icon || '📁',
                systemPrompt: systemPrompt?.trim() || null,
            }
        });
    } catch (error) {
        console.error('Error creating space:', error);
        return NextResponse.json({ message: 'Failed to create space' }, { status: 500 });
    }
}
