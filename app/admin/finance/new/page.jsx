import { db } from 'db/index';
import { projects, clients } from 'db/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import TransactionForm from './_components/transaction-form';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default async function NewTransactionPage({ searchParams }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') redirect('/api/auth/signin');

    const params = await searchParams;
    const initialProjectId = params.projectId || '';
    const initialSubProjectId = params.subProjectId || '';
    const initialSubProjectItemId = params.subProjectItemId || '';

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
                    <h1 className="text-2xl font-bold text-white">Nova Transação</h1>
                    <p className="text-text-muted mt-1 text-sm">Registre uma nova entrada ou saída no sistema.</p>
                </div>

                <div className="p-8">
                    <TransactionForm 
                        projects={allProjects} 
                        clients={allClients} 
                        initialProjectId={initialProjectId}
                        initialSubProjectId={initialSubProjectId}
                        initialSubProjectItemId={initialSubProjectItemId}
                    />
                </div>
            </div>
        </main>
    );
}
