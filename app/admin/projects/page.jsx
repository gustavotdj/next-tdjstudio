import { db } from 'db/index';
import { projects, clients } from 'db/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { createProject } from 'app/actions/project-actions';

export default async function AdminProjectsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/api/auth/signin');

    const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.email, session.user.email)
    });
    
    // Admin check: cannot be a client
    if (clientRecord || session.user.role === 'client') {
        redirect('/client/projects');
    }

    const allProjects = await db.query.projects.findMany({
        with: {
            clients: {
                with: {
                    client: true
                }
            }
        },
        orderBy: projects.createdAt
    });

    const allClients = await db.select().from(clients);

    return (
        <main className="w-full px-6 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Gerenciar Projetos</h1>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Formulário de Criação */}
                <div className="md:col-span-1">
                    <div className="bg-surface p-6 rounded-xl shadow-lg border border-white/5 sticky top-24">
                        <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-sm">＋</span>
                            Novo Projeto
                        </h2>
                        <form action={createProject} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1.5">Nome do Projeto</label>
                                <input 
                                    name="name" 
                                    required 
                                    type="text" 
                                    className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-500 transition-all"
                                    placeholder="Ex: Website Redesign"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1.5">Clientes Responsáveis</label>
                                <div className="bg-black/20 border border-white/10 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                                    {allClients.length > 0 ? (
                                        allClients.map(client => (
                                            <label key={client.id} className="flex items-center gap-2 p-1 hover:bg-white/5 rounded transition-colors cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    name="clientIds" 
                                                    value={client.id}
                                                    className="w-3.5 h-3.5 rounded border-white/20 bg-black/40 text-primary focus:ring-primary/50"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-white">{client.name}</span>
                                                </div>
                                            </label>
                                        ))
                                    ) : (
                                        <p className="text-xs text-text-muted text-center py-2">Nenhum cliente cadastrado.</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1.5">Descrição</label>
                                <textarea 
                                    name="description" 
                                    rows="3"
                                    className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-500 transition-all resize-none"
                                    placeholder="Detalhes do escopo..."
                                ></textarea>
                            </div>
                            <button 
                                type="submit" 
                                className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary/90 transition-all font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 mt-2"
                            >
                                Criar Projeto
                            </button>
                        </form>
                    </div>
                </div>

                {/* Lista de Projetos */}
                <div className="md:col-span-2">
                    <div className="grid gap-4">
                        {allProjects.length === 0 ? (
                            <div className="bg-surface p-12 text-center rounded-xl border border-white/5 text-text-muted">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🚀</div>
                                <h3 className="text-lg font-medium text-white mb-1">Nenhum projeto ainda</h3>
                                <p>Crie o primeiro projeto usando o formulário ao lado.</p>
                            </div>
                        ) : (
                            allProjects.map((project) => (
                                <div key={project.id} className="bg-surface p-6 rounded-xl border border-white/5 hover:border-primary/30 transition-all shadow-lg hover:shadow-xl hover:shadow-primary/5 group relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{project.name}</h3>
                                            {project.clients && project.clients.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-1.5">
                                                    {project.clients.map(pc => (
                                                        <p key={pc.client.id} className="text-[11px] text-primary/80 font-medium flex items-center gap-1 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                                                            <span className="w-1 h-1 rounded-full bg-primary"></span>
                                                            {pc.client.name}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                                            project.status === 'active' 
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                            : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                        }`}>
                                            {project.status === 'active' ? 'Ativo' : project.status}
                                        </span>
                                    </div>
                                    <p className="text-text-muted text-sm mb-4 line-clamp-2 leading-relaxed">
                                        {project.description || 'Sem descrição.'}
                                    </p>
                                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-gray-500 font-mono">ID: {project.id.substring(0, 8)}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Link href={`/admin/projects/${project.id}/edit`} className="p-2 text-text-muted hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Editar Projeto">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </Link>
                                            <Link href={`/admin/projects/${project.id}`} className="text-sm font-medium text-white hover:text-primary transition-colors flex items-center gap-1">
                                                Detalhes <span aria-hidden="true">&rarr;</span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}