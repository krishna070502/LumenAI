import { NextRequest, NextResponse } from 'next/server';
import { neonAuth } from '@neondatabase/auth/next/server';
import db from '@/lib/db';
import { savedArticles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET - Check if article is bookmarked or get all bookmarks
export async function GET(request: NextRequest) {
    try {
        const { session, user } = await neonAuth();

        if (!session || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const url = request.nextUrl.searchParams.get('url');

        if (url) {
            // Check if specific article is bookmarked
            const bookmark = await db
                .select()
                .from(savedArticles)
                .where(and(
                    eq(savedArticles.userId, user.id),
                    eq(savedArticles.url, url)
                ))
                .limit(1);

            return NextResponse.json({
                isBookmarked: bookmark.length > 0,
                bookmark: bookmark[0] || null
            });
        } else {
            // Get all bookmarks for user
            const bookmarks = await db
                .select()
                .from(savedArticles)
                .where(eq(savedArticles.userId, user.id))
                .orderBy(savedArticles.savedAt);

            return NextResponse.json({ bookmarks });
        }
    } catch (error) {
        console.error('Error fetching bookmarks:', error);
        return NextResponse.json(
            { error: 'Failed to fetch bookmarks' },
            { status: 500 }
        );
    }
}

// POST - Add bookmark
export async function POST(request: NextRequest) {
    try {
        const { session, user } = await neonAuth();

        if (!session || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { url, title, thumbnail, source } = body;

        if (!url || !title) {
            return NextResponse.json(
                { error: 'URL and title are required' },
                { status: 400 }
            );
        }

        // Check if already bookmarked
        const existing = await db
            .select()
            .from(savedArticles)
            .where(and(
                eq(savedArticles.userId, user.id),
                eq(savedArticles.url, url)
            ))
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json({
                success: true,
                message: 'Already bookmarked',
                bookmark: existing[0]
            });
        }

        // Add new bookmark
        const [bookmark] = await db
            .insert(savedArticles)
            .values({
                userId: user.id,
                url,
                title,
                thumbnail: thumbnail || null,
                source: source || null,
            })
            .returning();

        return NextResponse.json({
            success: true,
            message: 'Article saved',
            bookmark
        });
    } catch (error) {
        console.error('Error adding bookmark:', error);
        return NextResponse.json(
            { error: 'Failed to save bookmark' },
            { status: 500 }
        );
    }
}

// DELETE - Remove bookmark
export async function DELETE(request: NextRequest) {
    try {
        const { session, user } = await neonAuth();

        if (!session || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const url = request.nextUrl.searchParams.get('url');

        if (!url) {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        await db
            .delete(savedArticles)
            .where(and(
                eq(savedArticles.userId, user.id),
                eq(savedArticles.url, url)
            ));

        return NextResponse.json({
            success: true,
            message: 'Bookmark removed'
        });
    } catch (error) {
        console.error('Error removing bookmark:', error);
        return NextResponse.json(
            { error: 'Failed to remove bookmark' },
            { status: 500 }
        );
    }
}
