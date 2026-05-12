import { authApiHandler } from '@neondatabase/auth/next/server';

export const runtime = 'nodejs';

const handler = authApiHandler();
const { GET, POST, PUT, DELETE, PATCH } = handler;
export { GET, POST, PUT, DELETE, PATCH };
