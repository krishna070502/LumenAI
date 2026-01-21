import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { documents, spaces } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';

// GET - List all documents in a space
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: spaceId } = await params;
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Verify space ownership
        const space = await db.query.spaces.findFirst({
            where: and(eq(spaces.id, spaceId), eq(spaces.userId, user.id)),
        });

        if (!space) {
            return NextResponse.json({ message: 'Space not found' }, { status: 404 });
        }

        const docs = await db
            .select({
                id: documents.id,
                title: documents.title,
                createdAt: documents.createdAt,
                updatedAt: documents.updatedAt,
            })
            .from(documents)
            .where(eq(documents.spaceId, spaceId))
            .orderBy(desc(documents.updatedAt));

        return NextResponse.json({ documents: docs });
    } catch (error) {
        console.error('Error fetching documents:', error);
        return NextResponse.json({ message: 'Failed to fetch documents' }, { status: 500 });
    }
}

// POST - Create a new document in a space
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: spaceId } = await params;
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Verify space ownership
        const space = await db.query.spaces.findFirst({
            where: and(eq(spaces.id, spaceId), eq(spaces.userId, user.id)),
        });

        if (!space) {
            return NextResponse.json({ message: 'Space not found' }, { status: 404 });
        }

        const body = await req.json();
        const { title } = body;

        const docId = crypto.randomBytes(16).toString('hex');

        // Default empty Tiptap document
        const defaultContent = {
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: []
                }
            ]
        };

        await db.insert(documents).values({
            id: docId,
            spaceId,
            userId: user.id,
            title: title?.trim() || 'Untitled Document',
            content: defaultContent,
            plainText: '',
        });

        return NextResponse.json({
            document: {
                id: docId,
                title: title?.trim() || 'Untitled Document',
            }
        });
    } catch (error) {
        console.error('Error creating document:', error);
        return NextResponse.json({ message: 'Failed to create document' }, { status: 500 });
    }
}
