import { db } from 'db/index';
import { projects, clients } from 'db/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { Briefcase, Clock, LayoutGrid, Calendar, CheckSquare } from 'lucide-react';
import { CreateProjectModal } from './CreateProjectModal';
import { Avatar } from 'components/Avatar';

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
            },
            subProjects: true
        },
        orderBy: [desc(projects.createdAt)]
    });

    const allClients = await db.select().from(clients);

    // Calculate Metrics
    const totalProjects = allProjects.length;
    const activeProjects = allProjects.filter(p => p.status === 'active').length;
    
    // Total phases (subprojects)
    const totalPhases = allProjects.reduce((acc, p) => acc + p.subProjects.length, 0);

    return (
        <main className="w-full px-6 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Gerenciar Projetos</h1>
                    <p className="text-text-muted text-sm">Visão geral de todos os projetos do estúdio.</p>
                </div>
                
                <div className="flex gap-4 items-center">
                    <CreateProjectModal allClients={allClients} />
                    
                    {/* Stats Summary */}
                    <div className="flex gap-4 pl-4 border-l border-white/5">
                        <div className="bg-surface px-4 py-2 rounded-lg border border-white/5 flex items-center gap-3">
                            <div className="bg-primary/10 p-1.5 rounded-md text-primary">
                                <Briefcase size={16} />
                            </div>
                            <div>
                                <div className="text-xs text-text-muted uppercase tracking-wider font-bold">Total</div>
                                <div className="text-lg font-bold text-white leading-none">{totalProjects}</div>
                            </div>
                        </div>
                        <div className="bg-surface px-4 py-2 rounded-lg border border-white/5 flex items-center gap-3">
                            <div className="bg-emerald-500/10 p-1.5 rounded-md text-emerald-400">
                                <Clock size={16} />
                            </div>
                            <div>
                                <div className="text-xs text-text-muted uppercase tracking-wider font-bold">Ativos</div>
                                <div className="text-lg font-bold text-white leading-none">{activeProjects}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid xl:grid-cols-4 gap-8 items-start">
                
                {/* Lista de Projetos (Grid) */}
                <div className="col-span-full">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {allProjects.length === 0 ? (
                            <div className="col-span-full bg-surface p-12 text-center rounded-xl border border-white/5 text-text-muted border-dashed">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl opacity-50">🚀</div>
                                <h3 className="text-lg font-medium text-white mb-1">Nenhum projeto ainda</h3>
                                <p>Crie o primeiro projeto usando o formulário ao lado.</p>
                            </div>
                        ) : (
                            allProjects.map((project) => {
                                // Calculate simple progress based on subprojects/phases just for visual indication
                                const phaseCount = project.subProjects.length;
                                
                                let totalTasks = 0;
                                let completedTasks = 0;
                                
                                project.subProjects.forEach(sub => {
                                    if (sub.content?.stages) {
                                        sub.content.stages.forEach(stage => {
                                            if (stage.items) {
                                                totalTasks += stage.items.length;
                                                completedTasks += stage.items.filter(i => i.completed).length;
                                            }
                                        });
                                    }
                                });

                                return (
                                <div key={project.id} className="bg-surface p-5 rounded-xl border border-white/5 hover:border-primary/30 transition-all shadow-lg hover:shadow-xl hover:shadow-primary/5 group relative flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold tracking-wider ${
                                            project.status === 'active' 
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                            : project.status === 'paused'
                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            : project.status === 'completed'
                                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                        }`}>
                                            {project.status === 'active' ? 'Em Andamento' : 
                                             project.status === 'paused' ? 'Pausado' :
                                             project.status === 'completed' ? 'Concluído' :
                                             project.status === 'archived' ? 'Arquivado' : project.status}
                                        </span>
                                        <div className="flex -space-x-2 overflow-hidden">
                                            {project.clients?.slice(0, 3).map(pc => (
                                                <div key={pc.client.id} title={pc.client.name} className="ring-2 ring-[#121212] rounded-full">
                                                    <Avatar seed={pc.client.email || pc.client.name} size={24} />
                                                </div>
                                            ))}
                                            {(project.clients?.length || 0) > 3 && (
                                                <div className="inline-flex h-6 w-6 rounded-full ring-2 ring-[#121212] bg-surface items-center justify-center text-[9px] font-bold text-text-muted border border-white/10">
                                                    +{(project.clients?.length || 0) - 3}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <Link href={`/admin/projects/${project.id}`} className="group-hover:text-primary transition-colors mb-2">
                                        <h3 className="text-xl font-bold text-white line-clamp-1">{project.name}</h3>
                                    </Link>
                                    
                                    <p className="text-text-muted text-xs mb-4 line-clamp-2 leading-relaxed flex-1">
                                        {project.description || 'Sem descrição definida para este projeto.'}
                                    </p>
                                    
                                    <div className="flex items-center gap-4 text-xs text-text-muted mb-4 bg-white/5 p-2 rounded-lg">
                                        <div className="flex items-center gap-1.5" title={`${completedTasks} de ${totalTasks} tarefas concluídas`}>
                                            <CheckSquare size={14} className={totalTasks > 0 && totalTasks === completedTasks ? "text-emerald-400" : "text-primary"} />
                                            <span>{completedTasks}/{totalTasks} tarefas</span>
                                        </div>
                                        <div className="w-px h-3 bg-white/10"></div>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={14} />
                                            <span>{new Date(project.createdAt).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/5 flex gap-2">
                                        <Link 
                                            href={`/admin/projects/${project.id}`} 
                                            className="flex-1 text-center text-sm font-bold text-white bg-white/5 hover:bg-primary hover:text-white py-2 rounded-lg transition-all border border-white/5 hover:border-primary/50"
                                        >
                                            Gerenciar
                                        </Link>
                                        <Link 
                                            href={`/admin/projects/${project.id}/edit`} 
                                            className="p-2 text-text-muted hover:text-white hover:bg-white/10 rounded-lg transition-all border border-transparent hover:border-white/10" 
                                            title="Configurações"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                        </Link>
                                    </div>
                                </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
