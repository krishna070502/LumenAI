import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { documents, spaces } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

// GET - Get document by ID
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: docId } = await params;
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const doc = await db.query.documents.findFirst({
            where: eq(documents.id, docId),
        });

        if (!doc) {
            return NextResponse.json({ message: 'Document not found' }, { status: 404 });
        }

        // Verify ownership through space
        const space = await db.query.spaces.findFirst({
            where: and(eq(spaces.id, doc.spaceId), eq(spaces.userId, user.id)),
        });

        if (!space) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json({ document: doc, space });
    } catch (error) {
        console.error('Error fetching document:', error);
        return NextResponse.json({ message: 'Failed to fetch document' }, { status: 500 });
    }
}

// PATCH - Update document
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: docId } = await params;
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const doc = await db.query.documents.findFirst({
            where: eq(documents.id, docId),
        });

        if (!doc) {
            return NextResponse.json({ message: 'Document not found' }, { status: 404 });
        }

        // Verify ownership
        const space = await db.query.spaces.findFirst({
            where: and(eq(spaces.id, doc.spaceId), eq(spaces.userId, user.id)),
        });

        if (!space) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { title, content, plainText } = body;

        await db
            .update(documents)
            .set({
                title: title?.trim() ?? doc.title,
                content: content ?? doc.content,
                plainText: plainText ?? doc.plainText,
                updatedAt: new Date(),
            })
            .where(eq(documents.id, docId));

        return NextResponse.json({ message: 'Document updated' });
    } catch (error) {
        console.error('Error updating document:', error);
        return NextResponse.json({ message: 'Failed to update document' }, { status: 500 });
    }
}

// DELETE - Delete document
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: docId } = await params;
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const doc = await db.query.documents.findFirst({
            where: eq(documents.id, docId),
        });

        if (!doc) {
            return NextResponse.json({ message: 'Document not found' }, { status: 404 });
        }

        // Verify ownership
        const space = await db.query.spaces.findFirst({
            where: and(eq(spaces.id, doc.spaceId), eq(spaces.userId, user.id)),
        });

        if (!space) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await db.delete(documents).where(eq(documents.id, docId));

        return NextResponse.json({ message: 'Document deleted' });
    } catch (error) {
        console.error('Error deleting document:', error);
        return NextResponse.json({ message: 'Failed to delete document' }, { status: 500 });
    }
}
