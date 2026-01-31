import { db } from 'db/index';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const envCheck = {
            DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Missing',
            NETLIFY_DATABASE_URL: process.env.NETLIFY_DATABASE_URL ? 'Set' : 'Missing',
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'Set' : 'Missing',
            NEXTAUTH_URL: process.env.NEXTAUTH_URL ? 'Set' : 'Missing',
            GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing',
            GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing',
        };

        // Try a simple query
        const result = await db.query.users.findFirst();
        
        return NextResponse.json({ 
            status: 'ok', 
            env: envCheck,
            connection: 'success',
            userFound: !!result 
        });
    } catch (e) {
        return NextResponse.json({ 
            status: 'error', 
            message: e.message,
            stack: e.stack,
            env: {
                DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Missing',
                NETLIFY_DATABASE_URL: process.env.NETLIFY_DATABASE_URL ? 'Set' : 'Missing',
            }
        }, { status: 500 });
    }
}
