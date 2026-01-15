import { neonAuth, createAuthServer } from '@neondatabase/auth/next/server';

export interface User {
    id: string;
    email: string;
    name?: string;
}

// Create singleton auth server instance
const authServer = createAuthServer();

/**
 * Get the currently authenticated user from the request
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
    try {
        const { session, user } = await neonAuth();
        if (!user || !session) {
            return null;
        }
        return {
            id: user.id,
            email: user.email || '',
            name: user.name || undefined,
        };
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<User> {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('Unauthorized - Please log in to continue');
    }
    return user;
}

/**
 * Check if a user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
    const user = await getCurrentUser();
    return user !== null;
}

/**
 * Get the auth server instance for more advanced operations
 */
export function getAuthServer() {
    return authServer;
}
