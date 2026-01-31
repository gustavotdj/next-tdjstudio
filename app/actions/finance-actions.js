'use server';

import { db } from 'db/index';
import { transactions, projects } from 'db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';

async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
        throw new Error('Não autorizado');
    }
    return session;
}

export async function createTransaction(data) {
    await checkAdmin();

    const { description, amount, type, category, projectId, subProjectId, subProjectItemId, clientId, date, status } = data;

    // Helper to ensure empty strings are null for DB
    const toNull = (val) => (val && val.toString().trim() !== '') ? val : null;

    const [newTransaction] = await db.insert(transactions).values({
        description,
        amount: Math.round(parseFloat(amount) * 100), // convert to cents
        type,
        category,
        projectId: toNull(projectId),
        subProjectId: toNull(subProjectId),
        subProjectItemId: toNull(subProjectItemId),
        clientId: toNull(clientId),
        date: date ? new Date(date) : new Date(),
        status: status || 'completed',
    }).returning();

    revalidatePath('/admin/finance');
    if (projectId) {
        revalidatePath(`/admin/budgets/${projectId}`);
        revalidatePath(`/admin/finance/projects/${projectId}`);
    }

    return newTransaction;
}

export async function updateTransaction(id, data) {
    await checkAdmin();

    const { description, amount, type, category, projectId, subProjectId, subProjectItemId, clientId, date, status } = data;

    // Helper to ensure empty strings are null for DB
    const toNull = (val) => (val && val.toString().trim() !== '') ? val : null;

    const [updatedTransaction] = await db.update(transactions)
        .set({
            description,
            amount: Math.round(parseFloat(amount) * 100),
            type,
            category,
            projectId: toNull(projectId),
            subProjectId: toNull(subProjectId),
            subProjectItemId: toNull(subProjectItemId),
            clientId: toNull(clientId),
            date: date ? new Date(date) : undefined,
            status,
            updatedAt: new Date(),
        })
        .where(eq(transactions.id, id))
        .returning();

    revalidatePath('/admin/finance');
    if (projectId) {
        revalidatePath(`/admin/budgets/${projectId}`);
        revalidatePath(`/admin/finance/projects/${projectId}`);
    }

    return updatedTransaction;
}

export async function deleteTransaction(id) {
    const session = await checkAdmin();

    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    
    await db.delete(transactions).where(eq(transactions.id, id));

    revalidatePath('/admin/finance');
    if (transaction?.projectId) {
        revalidatePath(`/admin/budgets/${transaction.projectId}`);
    }

    return { success: true };
}

export async function getFinanceStats() {
    await checkAdmin();

    const allTransactions = await db.query.transactions.findMany();

    const income = allTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0) / 100;

    const expense = allTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0) / 100;

    return {
        income,
        expense,
        balance: income - expense,
        transactionCount: allTransactions.length
    };
}
