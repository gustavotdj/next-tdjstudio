import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import ws from 'ws';

import * as schema from './schema';

// Configurar WebSocket para ambientes que não suportam nativamente (como Node.js local)
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
    // Log error in build/runtime logs, but don't crash immediately at module level 
    // to allow other parts of the app to build if possible. 
    // However, DB calls will fail.
    console.error("CRITICAL ERROR: DATABASE_URL or NETLIFY_DATABASE_URL is not set!");
}

// Use a fallback string to prevent crash at module import time if env is missing.
// This allows diagnostic routes (like /api/debug/db) to run and report the missing env.
const sql = neon(connectionString || "postgres://placeholder:placeholder@placeholder.neondatabase.com/placeholder");

export const db = drizzle({
    schema,
    client: sql
});