
'use server';

import { db } from 'db/index';
import { subProjects, projects, projectClients, transactions, clients } from 'db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { encrypt } from 'lib/crypto';

async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === 'client') {
        throw new Error('Unauthorized');
    }
}

async function checkProjectAccess(projectId) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error('Unauthorized');

    // Admins always have access
    if (session.user.role !== 'client') return session;

    // Check Client Access
    const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.email, session.user.email)
    });

    if (!clientRecord) throw new Error('Unauthorized');

    // Check direct ownership or many-to-many relation
    const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
        columns: { clientId: true }
    });

    if (!project) throw new Error('Project not found');

    if (project.clientId === clientRecord.id) return session;

    const relation = await db.query.projectClients.findFirst({
        where: and(
            eq(projectClients.projectId, projectId),
            eq(projectClients.clientId, clientRecord.id)
        )
    });

    if (!relation) throw new Error('Unauthorized');

    return session;
}

export async function createProject(formData) {
    await checkAdmin();
    
    const name = formData.get('name');
    const description = formData.get('description');
    const clientIds = formData.getAll('clientIds'); // Handle multiple clients
    
    const [newProject] = await db.insert(projects).values({
        name,
        description,
        // We still keep clientId for now (first one) for compatibility, or null
        clientId: clientIds.length > 0 ? clientIds[0] : null,
    }).returning({ id: projects.id });
    
    // Insert into junction table
    if (clientIds.length > 0 && newProject) {
        await Promise.all(clientIds.map(cid => 
            db.insert(projectClients).values({
                projectId: newProject.id,
                clientId: cid
            })
        ));
    }
    
    revalidatePath('/admin/projects');
}

export async function deleteProject(projectId) {
    await checkAdmin();

    // 1. Delete associated subprojects
    await db.delete(subProjects).where(eq(subProjects.projectId, projectId));
    
    // 2. Delete junction table entries
    await db.delete(projectClients).where(eq(projectClients.projectId, projectId));

    // 3. Delete associated transactions
    await db.delete(transactions).where(eq(transactions.projectId, projectId));

    // 4. Delete the project
    await db.delete(projects).where(eq(projects.id, projectId));

    revalidatePath('/admin/projects');
    redirect('/admin/projects');
}

export async function createSubProject(projectId, formData) {
    await checkAdmin();

    const name = formData.get('name');
    const description = formData.get('description');
    
    // Start with empty dynamic structure
    const initialContent = {
        stages: []
    };

    await db.insert(subProjects).values({
        projectId,
        name,
        description,
        content: initialContent
    });

    revalidatePath(`/admin/projects/${projectId}`);
}

export async function deleteSubProject(subProjectId, projectId) {
    await checkAdmin();

    await db.delete(subProjects).where(eq(subProjects.id, subProjectId));

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
}

export async function updateSubProjectPositions(projectId, items) {
    await checkAdmin();

    // items is an array of { id, position } or just the objects in order
    // Assuming items is an array of objects with 'id' property, sorted in the desired order
    
    await Promise.all(items.map((item, index) => 
        db.update(subProjects)
            .set({ position: index })
            .where(eq(subProjects.id, item.id))
    ));

    revalidatePath(`/admin/projects/${projectId}`);
}

export async function updateProject(projectId, formData) {
    await checkAdmin();

    const name = formData.get('name');
    const description = formData.get('description');
    const clientIds = formData.getAll('clientIds'); // Array of selected client IDs
    const status = formData.get('status');

    // Update project details
    await db.update(projects)
        .set({
            name,
            description,
            // Update deprecated clientId for compatibility (use first selected or null)
            clientId: clientIds.length > 0 ? clientIds[0] : null,
            status,
            updatedAt: new Date()
        })
        .where(eq(projects.id, projectId));

    // Update junction table for clients
    // 1. Delete existing relations
    await db.delete(projectClients).where(eq(projectClients.projectId, projectId));
    
    // 2. Insert new relations
    if (clientIds.length > 0) {
        await Promise.all(clientIds.map(cid => 
            db.insert(projectClients).values({
                projectId,
                clientId: cid
            })
        ));
    }

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath('/admin/projects');
    redirect(`/admin/projects/${projectId}`);
}

export async function updateProjectLinks(projectId, links) {
    await checkProjectAccess(projectId);

    await db.update(projects)
        .set({
            links: links,
            updatedAt: new Date()
        })
        .where(eq(projects.id, projectId));

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
}

export async function updateProjectCredentials(projectId, credentials) {
    await checkProjectAccess(projectId);

    // Encrypt passwords before saving
    const secureCredentials = credentials.map(cred => ({
        ...cred,
        password: cred.password ? encrypt(cred.password) : ''
    }));

    await db.update(projects)
        .set({
            credentials: secureCredentials,
            updatedAt: new Date()
        })
        .where(eq(projects.id, projectId));

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
}

export async function updateProjectFiles(projectId, files) {
    await checkProjectAccess(projectId);

    await db.update(projects)
        .set({
            files: files,
            updatedAt: new Date()
        })
        .where(eq(projects.id, projectId));

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
}

export async function updateSubProjectContent(subProjectId, newContent, projectId) {
    // We allow clients to update content (for task completion), 
    // but checkProjectAccess ensures they are at least linked to the project.
    // Ideally we would check if they are only updating their assigned tasks, 
    // but for now project-level access + UI restrictions is the compromise.
    await checkProjectAccess(projectId);

    await db.update(subProjects)
        .set({ 
            content: newContent,
            updatedAt: new Date()
        })
        .where(eq(subProjects.id, subProjectId));
    
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
}

export async function updateSubProject(subProjectId, data, projectId) {
    await checkAdmin();

    await db.update(subProjects)
        .set({ 
            ...data,
            updatedAt: new Date()
        })
        .where(eq(subProjects.id, subProjectId));
    
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
}

export async function updateSubProjectLinks(subProjectId, links, projectId) {
    await checkAdmin();

    await db.update(subProjects)
        .set({ 
            links: links,
            updatedAt: new Date()
        })
        .where(eq(subProjects.id, subProjectId));
    
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
}

export async function updateSubProjectCredentials(subProjectId, credentials, projectId) {
    await checkAdmin();

    // Encrypt passwords before saving
    const secureCredentials = credentials.map(cred => ({
        ...cred,
        password: cred.password ? encrypt(cred.password) : ''
    }));

    await db.update(subProjects)
        .set({ 
            credentials: secureCredentials,
            updatedAt: new Date()
        })
        .where(eq(subProjects.id, subProjectId));
    
    revalidatePath(`/admin/projects/${projectId}`);
}

export async function updateProjectBudget(projectId, budgetData) {
    await checkAdmin();

    await db.update(projects)
        .set({
            budget: budgetData,
            updatedAt: new Date()
        })
        .where(eq(projects.id, projectId));

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
    revalidatePath('/admin/budgets');
    revalidatePath(`/admin/budgets/${projectId}`);
    revalidatePath(`/client/budgets/${projectId}`);
}

export async function updateSubProjectBudget(subProjectId, budgetData, projectId) {
    await checkAdmin();

    await db.update(subProjects)
        .set({
            budget: budgetData,
            updatedAt: new Date()
        })
        .where(eq(subProjects.id, subProjectId));

    // If project is dynamic, the frontend or a separate action should handle the recalculation
    // or we can do it here. Let's make it easy and just revalidate.
    
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}`);
    revalidatePath('/admin/budgets');
    revalidatePath(`/admin/budgets/${projectId}`);
    revalidatePath(`/client/budgets/${projectId}`);
}


