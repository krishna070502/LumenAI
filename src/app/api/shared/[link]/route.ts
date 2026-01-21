import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { documents, documentShares } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET - Get shared document by share link
export async function GET(
    req: Request,
    { params }: { params: Promise<{ link: string }> }
) {
    try {
        const { link } = await params;

        const share = await db.query.documentShares.findFirst({
            where: eq(documentShares.shareLink, link),
        });

        if (!share) {
            return NextResponse.json({ message: 'Share link not found' }, { status: 404 });
        }

        const doc = await db.query.documents.findFirst({
            where: eq(documents.id, share.documentId),
        });

        if (!doc) {
            return NextResponse.json({ message: 'Document not found' }, { status: 404 });
        }

        return NextResponse.json({
            document: {
                id: doc.id,
                title: doc.title,
                content: doc.content,
            },
            permission: share.permission,
        });
    } catch (error) {
        console.error('Error fetching shared document:', error);
        return NextResponse.json({ message: 'Failed to fetch document' }, { status: 500 });
    }
}
