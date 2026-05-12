import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = [
    '/auth/sign-in',
    '/auth/sign-up',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/api/auth', // Auth API routes should be accessible
    '/guest', // Guest chat route for unauthenticated users
    '/library', // Show sign-in prompt for guests
];

// Static assets, API routes, and Next.js internals that should bypass auth
const bypassPatterns = [
    '/_next',
    '/favicon.ico',
    '/logo',
    '/icons',
    '/images',
    '/api', // All API routes should be accessible (they handle their own auth)
    '/manifest', // PWA manifest
    '/robots.txt',
    '/sitemap',
    '.webmanifest',
    '.json',
    '.xml',
];

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Clone request headers and add pathname for layout detection
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', pathname);

    // Create response with updated request headers
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // Bypass static assets and Next.js internals
    for (const pattern of bypassPatterns) {
        if (pathname.startsWith(pattern) || pathname.endsWith(pattern)) {
            return response;
        }
    }

    // Allow public routes (auth pages)
    for (const route of publicRoutes) {
        if (pathname.startsWith(route)) {
            return response;
        }
    }

    // Check for auth session cookie
    // Look for any cookie containing 'session' in its name
    const allCookies = request.cookies.getAll();
    const sessionCookie = allCookies.find(cookie =>
        cookie.name.toLowerCase().includes('session')
    );

    // Debug log (can be removed later)
    if (!sessionCookie) {
        console.log('No session cookie found. Available cookies:', allCookies.map(c => c.name));
    }

    if (!sessionCookie?.value) {
        // No session - redirect to guest chat page
        const guestUrl = new URL('/guest', request.url);
        return NextResponse.redirect(guestUrl);
    }

    // User is authenticated, allow request
    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files with extensions
         */
        '/((?!_next/static|_next/image|favicon.ico|manifest|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest|xml|txt)$).*)',
    ],
};

