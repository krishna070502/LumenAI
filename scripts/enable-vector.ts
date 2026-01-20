import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
    console.log('Enabling pgvector extension...');
    try {
        await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
        console.log('Extension enabled successfully.');
    } catch (err) {
        console.error('Failed to enable extension:', err);
    }
}

main();
