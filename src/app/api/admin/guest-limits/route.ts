import { NextRequest, NextResponse } from 'next/server';
import { neonAuth } from '@neondatabase/auth/next/server';
import db from '@/lib/db';
import { adminSettings, AdminSettingsData } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET - Fetch guest chat limits
export async function GET() {
    try {
        const settings = await db
            .select()
            .from(adminSettings)
            .where(eq(adminSettings.key, 'global'))
            .limit(1);

        const data = settings[0]?.settings || {};

        return NextResponse.json({
            guestChatLimit: data.guestChatLimit ?? 10,
            guestResearchLimit: data.guestResearchLimit ?? 5,
            guestLimitPeriod: data.guestLimitPeriod ?? 'daily',
        });
    } catch (error) {
        console.error('Error fetching guest limits:', error);
        return NextResponse.json(
            { error: 'Failed to fetch guest limits' },
            { status: 500 }
        );
    }
}

// POST - Update guest chat limits (admin only)
export async function POST(request: NextRequest) {
    try {
        const { session, user } = await neonAuth();

        if (!session || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check if user is admin
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail || user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { guestChatLimit, guestResearchLimit, guestLimitPeriod } = body;

        // Validate inputs
        if (guestChatLimit !== undefined && (typeof guestChatLimit !== 'number' || guestChatLimit < 0)) {
            return NextResponse.json(
                { error: 'guestChatLimit must be a non-negative number' },
                { status: 400 }
            );
        }

        if (guestResearchLimit !== undefined && (typeof guestResearchLimit !== 'number' || guestResearchLimit < 0)) {
            return NextResponse.json(
                { error: 'guestResearchLimit must be a non-negative number' },
                { status: 400 }
            );
        }

        if (guestLimitPeriod !== undefined && !['session', 'daily'].includes(guestLimitPeriod)) {
            return NextResponse.json(
                { error: 'guestLimitPeriod must be "session" or "daily"' },
                { status: 400 }
            );
        }

        // Check if settings row exists
        const existing = await db
            .select()
            .from(adminSettings)
            .where(eq(adminSettings.key, 'global'))
            .limit(1);

        const newSettings: Partial<AdminSettingsData> = {};
        if (guestChatLimit !== undefined) newSettings.guestChatLimit = guestChatLimit;
        if (guestResearchLimit !== undefined) newSettings.guestResearchLimit = guestResearchLimit;
        if (guestLimitPeriod !== undefined) newSettings.guestLimitPeriod = guestLimitPeriod;

        if (existing.length > 0) {
            // Update existing settings
            await db
                .update(adminSettings)
                .set({
                    settings: { ...existing[0].settings, ...newSettings },
                    updatedAt: new Date(),
                })
                .where(eq(adminSettings.key, 'global'));
        } else {
            // Insert new settings
            await db.insert(adminSettings).values({
                key: 'global',
                settings: newSettings as AdminSettingsData,
            });
        }

        return NextResponse.json({ success: true, ...newSettings });
    } catch (error) {
        console.error('Error updating guest limits:', error);
        return NextResponse.json(
            { error: 'Failed to update guest limits' },
            { status: 500 }
        );
    }
}
