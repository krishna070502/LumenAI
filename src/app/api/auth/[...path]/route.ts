import { authApiHandler } from '@neondatabase/auth/next/server';

export const runtime = 'nodejs';

const { GET, POST, PUT, DELETE, PATCH } = authApiHandler();

export { GET, POST, PUT, DELETE, PATCH };
