'use server';

import { db } from 'db/index';
import { clients } from 'db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';

async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === 'client') {
        throw new Error('Unauthorized');
    }
}

export async function createClient(formData) {
    await checkAdmin();
    
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    
    await db.insert(clients).values({
        name,
        email,
        phone,
    });
    
    revalidatePath('/admin/clients');
}

export async function updateClient(id, formData) {
    await checkAdmin();
    
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    
    await db.update(clients)
        .set({
            name,
            email,
            phone,
            updatedAt: new Date()
        })
        .where(eq(clients.id, id));
    
    revalidatePath('/admin/clients');
    revalidatePath(`/admin/clients/${id}`);
}

export async function deleteClient(id) {
    await checkAdmin();
    
    // Check if client has projects? Maybe just delete the relation?
    // In schema.ts, projectClients handles the relation.
    // Let's delete the relations first.
    // I need projectClients from schema.
    
    await db.delete(clients).where(eq(clients.id, id));
    
    revalidatePath('/admin/clients');
    redirect('/admin/clients');
}
