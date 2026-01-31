import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
    // Log error in build/runtime logs, but don't crash immediately at module level 
    // to allow other parts of the app to build if possible. 
    // However, DB calls will fail.
    console.error("CRITICAL ERROR: DATABASE_URL or NETLIFY_DATABASE_URL is not set!");
}

const sql = neon(connectionString!);

export const db = drizzle({
    schema,
    client: sql
});