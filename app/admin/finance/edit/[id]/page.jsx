import { db } from 'db/index';
import { transactions, projects, clients } from 'db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect, notFound } from 'next/navigation';
import TransactionForm from '../../new/_components/transaction-form';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default async function EditTransactionPage({ params }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') redirect('/api/auth/signin');

    const { id } = await params;

    const transaction = await db.query.transactions.findFirst({
        where: eq(transactions.id, id)
    });

    if (!transaction) notFound();

    const allProjects = await db.query.projects.findMany({
        with: {
            subProjects: true
        },
        orderBy: (projects, { desc }) => [desc(projects.createdAt)]
    });

    const allClients = await db.query.clients.findMany({
        orderBy: (clients, { asc }) => [asc(clients.name)]
    });

    return (
        <main className="w-full max-w-4xl mx-auto px-6 py-12">
            <Link 
                href="/admin/finance" 
                className="inline-flex items-center gap-2 text-text-muted hover:text-white mb-8 transition-colors group"
            >
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-all">
                    <ChevronLeft size={18} />
                </div>
                Voltar para Financeiro
            </Link>

            <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 bg-white/2">
                    <h1 className="text-2xl font-bold text-white">Editar Transação</h1>
                    <p className="text-text-muted mt-1 text-sm">Atualize os dados do lançamento financeiro.</p>
                </div>

                <div className="p-8">
                    <TransactionForm 
                        projects={allProjects} 
                        clients={allClients} 
                        initialData={transaction}
                    />
                </div>
            </div>
        </main>
    );
}
