import { neonAuth } from '@neondatabase/auth/next/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { session, user } = await neonAuth();

        if (!session || !user) {
            return NextResponse.json({ isAdmin: false });
        }

        const adminEmail = process.env.ADMIN_EMAIL;

        if (!adminEmail) {
            // If no admin email is configured, no one is admin
            return NextResponse.json({ isAdmin: false });
        }

        const userEmail = user.email?.toLowerCase();
        const isAdmin = userEmail === adminEmail.toLowerCase();

        return NextResponse.json({ isAdmin });
    } catch (error) {
        console.error('Error checking admin status:', error);
        return NextResponse.json({ isAdmin: false });
    }
}
