import { db } from 'db/index';
import { clients } from 'db/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { createClient } from 'app/actions/client-actions';

export default async function AdminClientsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/api/auth/signin');

    const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.email, session.user.email)
    });
    
    // Admin check: cannot be a client
    if (clientRecord || session.user.role === 'client') {
        redirect('/client/projects');
    }

    const allClients = await db.query.clients.findMany({
        with: {
            projects: {
                with: {
                    project: true
                }
            }
        },
        orderBy: desc(clients.createdAt)
    });

    return (
        <main className="w-full px-6 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Gerenciar Clientes</h1>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Formulário de Criação */}
                <div className="md:col-span-1">
                    <div className="bg-surface p-6 rounded-xl shadow-lg border border-white/5 sticky top-24">
                        <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-sm">＋</span>
                            Novo Cliente
                        </h2>
                        <form action={createClient} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1.5">Nome da Empresa/Cliente</label>
                                <input 
                                    name="name" 
                                    required 
                                    type="text" 
                                    className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-500 transition-all"
                                    placeholder="Ex: Tech Solutions Ltda"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1.5">Email Principal</label>
                                <input 
                                    name="email" 
                                    required 
                                    type="email" 
                                    className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-500 transition-all"
                                    placeholder="contato@empresa.com"
                                />
                                <p className="text-xs text-text-muted mt-1">Este email será usado para login.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1.5">Telefone (opcional)</label>
                                <input 
                                    name="phone" 
                                    type="text" 
                                    className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-500 transition-all"
                                    placeholder="(11) 99999-9999"
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary/90 transition-all font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 mt-2"
                            >
                                Cadastrar Cliente
                            </button>
                        </form>
                    </div>
                </div>

                {/* Lista de Clientes */}
                <div className="md:col-span-2">
                    <div className="grid gap-4">
                        {allClients.length === 0 ? (
                            <div className="bg-surface p-12 text-center rounded-xl border border-white/5 text-text-muted">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">👥</div>
                                <h3 className="text-lg font-medium text-white mb-1">Nenhum cliente ainda</h3>
                                <p>Cadastre o primeiro cliente usando o formulário ao lado.</p>
                            </div>
                        ) : (
                            allClients.map(client => (
                                <Link 
                                    href={`/admin/clients/${client.id}`} 
                                    key={client.id}
                                    className="block bg-surface p-6 rounded-xl border border-white/5 hover:border-primary/50 hover:bg-white/5 transition-all group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-primary transition-colors">{client.name}</h3>
                                            <div className="flex flex-col gap-1 text-sm text-text-muted">
                                                <span className="flex items-center gap-2">✉️ {client.email}</span>
                                                {client.phone && <span className="flex items-center gap-2">📱 {client.phone}</span>}
                                                {client.projects && client.projects.length > 0 && (
                                                    <span className="flex items-center gap-2 text-emerald-400 font-semibold mt-1">
                                                        💰 Total em Projetos: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                            client.projects.reduce((sum, pc) => sum + (pc.project.budget?.total || 0), 0)
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* Projetos Vinculados */}
                                            {client.projects && client.projects.length > 0 && (
                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {client.projects.map(pc => (
                                                        <span 
                                                            key={pc.project.id}
                                                            className="text-[10px] px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full font-medium"
                                                        >
                                                            🚀 {pc.project.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs font-mono text-gray-600 bg-black/20 px-2 py-1 rounded">
                                            {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}