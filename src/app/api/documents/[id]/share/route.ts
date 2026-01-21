import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { documents, documentShares, spaces } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

// POST - Create a share link for a document
export async function POST(
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
        const { permission = 'view' } = body;

        // Generate unique share link
        const shareLink = crypto.randomBytes(16).toString('hex');

        await db.insert(documentShares).values({
            documentId: docId,
            shareLink,
            permission,
        });

        const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/shared/${shareLink}`;

        return NextResponse.json({
            shareLink,
            shareUrl,
            permission,
        });
    } catch (error) {
        console.error('Error creating share:', error);
        return NextResponse.json({ message: 'Failed to create share' }, { status: 500 });
    }
}

// GET - Get existing shares for a document
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

        // Verify ownership
        const space = await db.query.spaces.findFirst({
            where: and(eq(spaces.id, doc.spaceId), eq(spaces.userId, user.id)),
        });

        if (!space) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const shares = await db
            .select()
            .from(documentShares)
            .where(eq(documentShares.documentId, docId));

        const sharesWithUrls = shares.map(share => ({
            ...share,
            shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/shared/${share.shareLink}`,
        }));

        return NextResponse.json({ shares: sharesWithUrls });
    } catch (error) {
        console.error('Error fetching shares:', error);
        return NextResponse.json({ message: 'Failed to fetch shares' }, { status: 500 });
    }
}

// DELETE - Remove a share
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: docId } = await params;
        const url = new URL(req.url);
        const shareId = url.searchParams.get('shareId');

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

        if (shareId) {
            await db.delete(documentShares).where(eq(documentShares.id, parseInt(shareId)));
        } else {
            // Delete all shares for this document
            await db.delete(documentShares).where(eq(documentShares.documentId, docId));
        }

        return NextResponse.json({ message: 'Share deleted' });
    } catch (error) {
        console.error('Error deleting share:', error);
        return NextResponse.json({ message: 'Failed to delete share' }, { status: 500 });
    }
}
