import { NextRequest, NextResponse } from 'next/server';
import { neonAuth } from '@neondatabase/auth/next/server';
import db from '@/lib/db';
import { userPreferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Default preferences for new users
const defaultPreferences = {
    theme: 'dark' as const,
    measureUnit: 'Metric' as const,
    autoMediaSearch: true,
    showWeatherWidget: true,
    showNewsWidget: true,
};

const defaultPersonalization = {
    systemInstructions: '',
};

// GET - Fetch current user's preferences
export async function GET() {
    try {
        const { session, user } = await neonAuth();

        if (!session || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Try to find existing preferences
        const existing = await db
            .select()
            .from(userPreferences)
            .where(eq(userPreferences.userId, user.id))
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json({
                preferences: { ...defaultPreferences, ...existing[0].preferences },
                personalization: { ...defaultPersonalization, ...existing[0].personalization },
            });
        }

        // Return defaults if no preferences exist
        return NextResponse.json({
            preferences: defaultPreferences,
            personalization: defaultPersonalization,
        });
    } catch (error) {
        console.error('Error fetching user preferences:', error);
        return NextResponse.json(
            { error: 'Failed to fetch preferences' },
            { status: 500 }
        );
    }
}

// PATCH - Update current user's preferences
export async function PATCH(request: NextRequest) {
    try {
        const { session, user } = await neonAuth();

        if (!session || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { preferences, personalization } = body;

        // Check if user has existing preferences
        const existing = await db
            .select()
            .from(userPreferences)
            .where(eq(userPreferences.userId, user.id))
            .limit(1);

        if (existing.length > 0) {
            // Update existing preferences
            const updatedPrefs = preferences
                ? { ...existing[0].preferences, ...preferences }
                : existing[0].preferences;
            const updatedPers = personalization
                ? { ...existing[0].personalization, ...personalization }
                : existing[0].personalization;

            await db
                .update(userPreferences)
                .set({
                    preferences: updatedPrefs,
                    personalization: updatedPers,
                    updatedAt: new Date(),
                })
                .where(eq(userPreferences.userId, user.id));

            return NextResponse.json({
                preferences: { ...defaultPreferences, ...updatedPrefs },
                personalization: { ...defaultPersonalization, ...updatedPers },
            });
        } else {
            // Insert new preferences
            const newPrefs = { ...defaultPreferences, ...preferences };
            const newPers = { ...defaultPersonalization, ...personalization };

            await db.insert(userPreferences).values({
                userId: user.id,
                preferences: newPrefs,
                personalization: newPers,
            });

            return NextResponse.json({
                preferences: newPrefs,
                personalization: newPers,
            });
        }
    } catch (error) {
        console.error('Error updating user preferences:', error);
        return NextResponse.json(
            { error: 'Failed to update preferences' },
            { status: 500 }
        );
    }
}
