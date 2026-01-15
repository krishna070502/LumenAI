import { NextRequest, NextResponse } from 'next/server';
import { neonAuth } from '@neondatabase/auth/next/server';
import ModelRegistry from '@/lib/models/registry';
import db from '@/lib/db';
import { adminSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET - Fetch allowed models for chat dropdown
export async function GET() {
    try {
        // Fetch allowed models from database
        const settings = await db
            .select()
            .from(adminSettings)
            .where(eq(adminSettings.key, 'global'))
            .limit(1);

        const allowedModels = settings[0]?.settings?.allowedChatModels || [];

        // Use ModelRegistry to get dynamically-fetched providers with model lists
        const registry = new ModelRegistry();
        const activeProviders = await registry.getActiveProviders();

        // Build list of allowed models with details
        const models: Array<{
            providerId: string;
            providerName: string;
            modelKey: string;
            modelName: string;
        }> = [];

        for (const provider of activeProviders) {
            // Skip providers with error models
            if (provider.chatModels.some((m) => m.key === 'error')) continue;

            for (const model of provider.chatModels || []) {
                const modelId = `${provider.id}/${model.key}`;

                // If no allowed models configured, allow all
                // If allowed models configured, only include those
                if (allowedModels.length === 0 || allowedModels.includes(modelId)) {
                    models.push({
                        providerId: provider.id,
                        providerName: provider.name,
                        modelKey: model.key,
                        modelName: model.name,
                    });
                }
            }
        }

        return NextResponse.json({ models, allowedModels });
    } catch (error) {
        console.error('Error fetching allowed models:', error);
        return NextResponse.json(
            { error: 'Failed to fetch allowed models' },
            { status: 500 }
        );
    }
}

// POST - Update allowed models (admin only)
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
        const { allowedModels } = body;

        if (!Array.isArray(allowedModels)) {
            return NextResponse.json(
                { error: 'allowedModels must be an array' },
                { status: 400 }
            );
        }

        // Check if settings row exists
        const existing = await db
            .select()
            .from(adminSettings)
            .where(eq(adminSettings.key, 'global'))
            .limit(1);

        if (existing.length > 0) {
            // Update existing settings
            await db
                .update(adminSettings)
                .set({
                    settings: { ...existing[0].settings, allowedChatModels: allowedModels },
                    updatedAt: new Date(),
                })
                .where(eq(adminSettings.key, 'global'));
        } else {
            // Insert new settings
            await db.insert(adminSettings).values({
                key: 'global',
                settings: { allowedChatModels: allowedModels },
            });
        }

        return NextResponse.json({ success: true, allowedModels });
    } catch (error) {
        console.error('Error updating allowed models:', error);
        return NextResponse.json(
            { error: 'Failed to update allowed models' },
            { status: 500 }
        );
    }
}
