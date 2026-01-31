import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "db/index";
import { eq } from "drizzle-orm";
import * as schema from "db/schema";

export const authOptions = {
    adapter: DrizzleAdapter(db, {
        usersTable: schema.users,
        accountsTable: schema.accounts,
        sessionsTable: schema.sessions,
        verificationTokensTable: schema.verificationTokens,
    }),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "missing-google-client-id",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "missing-google-client-secret",
            allowDangerousEmailAccountLinking: true,
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === 'google') {
                const email = user.email;
                if (!email) return false;

                // 1. Check if user already exists in users table
                const existingUser = await db.query.users.findFirst({
                    where: eq(schema.users.email, email)
                });

                if (existingUser) {
                    // Fix: Check if this user should be a client but has wrong role
                    // This handles cases where user was created before being added as client
                    // or created with default 'user' role
                    const clientRecord = await db.query.clients.findFirst({
                        where: eq(schema.clients.email, email)
                    });

                    if (clientRecord && existingUser.role !== 'client') {
                        await db.update(schema.users)
                            .set({ role: 'client' })
                            .where(eq(schema.users.email, email));
                    }
                    
                    return true; // Allow login
                }

                // 2. Check if email exists in clients table (pre-registered client)
                const client = await db.query.clients.findFirst({
                    where: eq(schema.clients.email, email)
                });

                if (client) {
                    // Pre-create the user with 'client' role so the adapter links it correctly
                    // and we get the correct role from the start.
                    // Note: We don't need to insert 'id' if the schema handles it, 
                    // but Drizzle insert usually needs it if it's primary key unless configured.
                    // Our schema has $defaultFn for id.
                    try {
                         await db.insert(schema.users).values({
                            id: crypto.randomUUID(),
                            name: user.name,
                            email: email,
                            image: user.image,
                            role: 'client',
                            emailVerified: new Date(),
                        });
                        return true;
                    } catch (error) {
                        console.error("Error creating client user:", error);
                        return false;
                    }
                }

                // 3. Deny if neither
                return false;
            }
            return true;
        },
        async session({ session, user }) {
            if (session.user) {
                session.user.id = user.id;
                session.user.role = user.role; // Custom role from schema
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
