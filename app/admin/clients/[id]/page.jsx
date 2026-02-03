import { db } from 'db/index';
import { clients, projects } from 'db/schema';
import { eq, desc } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import ClientAvatar from 'components/ui/ClientAvatar';

export default async function AdminClientDetailsPage({ params }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/api/auth/signin');

    const { id } = await params;
    
    // Admin check
    const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.email, session.user.email)
    });
    
    if (clientRecord || session.user.role === 'client') {
        redirect('/client/projects');
    }

    const client = await db.query.clients.findFirst({
        where: eq(clients.id, id),
    });

    if (!client) {
        notFound();
    }

    // Fetch Client's Projects
    const clientProjects = await db.query.projects.findMany({
        where: eq(projects.clientId, id),
        orderBy: [desc(projects.createdAt)],
    });

    return (
        <main className="w-full px-6 py-8">
            {/* Header / Back Link */}
            <div className="mb-8">
                <Link 
                    href="/admin/clients" 
                    className="text-text-muted hover:text-white transition-colors flex items-center gap-2 mb-4"
                >
                    <span>←</span> Voltar para Clientes
                </Link>
                <div className="flex justify-between items-start">
                    <div className="flex gap-6 items-center">
                        <ClientAvatar seed={client.avatar} size="w-24 h-24" className="shadow-2xl border-4 border-surface" />
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">{client.name}</h1>
                            <div className="flex gap-4 text-text-muted">
                                <span className="flex items-center gap-2">✉️ {client.email}</span>
                                {client.phone && <span className="flex items-center gap-2">📱 {client.phone}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <Link 
                            href={`/admin/clients/${id}/edit`}
                            className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-white/10"
                        >
                            Editar Cliente
                        </Link>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid md:grid-cols-3 gap-8">
                
                {/* Main Content: Projects */}
                <div className="md:col-span-2 space-y-8">
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">Projetos do Cliente</h2>
                        </div>
                        
                        <div className="space-y-4">
                            {clientProjects.length > 0 ? (
                                clientProjects.map(project => (
                                    <Link 
                                        href={`/admin/projects/${project.id}`} 
                                        key={project.id}
                                        className="block bg-surface p-6 rounded-xl border border-white/5 hover:border-primary/50 hover:bg-white/5 transition-all group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">{project.name}</h3>
                                                {project.description && (
                                                    <p className="text-sm text-text-muted line-clamp-2">{project.description}</p>
                                                )}
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full border ${
                                                project.status === 'active' 
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                    : project.status === 'completed'
                                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                    : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                            }`}>
                                                {project.status === 'active' ? 'Em Andamento' : 
                                                 project.status === 'completed' ? 'Concluído' : project.status}
                                            </span>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="p-12 text-center text-text-muted bg-surface rounded-xl border border-white/5">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-2xl opacity-50">🚀</div>
                                        <p>Nenhum projeto vinculado a este cliente.</p>
                                        <Link href="/admin/projects" className="text-primary hover:underline">Criar novo projeto</Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Sidebar: Stats or Notes */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-surface p-6 rounded-xl shadow-lg border border-white/5">
                        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Estatísticas</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Total de Projetos</span>
                                <span className="text-white font-mono text-lg">{clientProjects.length}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Cliente desde</span>
                                <span className="text-white font-mono text-sm">
                                    {client.createdAt ? new Date(client.createdAt).toLocaleDateString('pt-BR') : '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}