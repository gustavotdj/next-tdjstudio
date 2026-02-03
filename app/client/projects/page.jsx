import { db } from 'db/index';
import { projects, clients, projectClients } from 'db/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { eq, and, desc } from 'drizzle-orm';
import Link from 'next/link';
import { LayoutGrid, Calendar, CheckSquare, Briefcase, Clock } from 'lucide-react';

export default async function ClientProjectsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/api/auth/signin');

    const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.email, session.user.email)
    });

    if (!clientRecord) {
        // Not a client? redirect to admin if admin, else denied
        if (session.user.role !== 'client') {
             redirect('/admin/dashboard');
        }
        // Should not happen if logic is correct
        return <div className="p-8 text-white">Erro: Perfil de cliente não encontrado.</div>;
    }

    const allProjects = await db.query.projects.findMany({
        where: (projects, { exists, or, eq }) => 
            or(
                eq(projects.clientId, clientRecord.id),
                exists(
                    db.select()
                        .from(projectClients)
                        .where(
                            and(
                                eq(projectClients.projectId, projects.id),
                                eq(projectClients.clientId, clientRecord.id)
                            )
                        )
                )
            ),
        with: {
            subProjects: true
        },
        orderBy: [desc(projects.updatedAt)],
    });

    // Calculate Metrics
    const totalProjects = allProjects.length;
    const activeProjects = allProjects.filter(p => p.status === 'active').length;

    return (
        <main className="w-full px-6 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Meus Projetos</h1>
                    <p className="text-text-muted text-sm">Acompanhe o progresso e detalhes dos seus projetos ativos.</p>
                </div>

                <div className="flex gap-4 items-center">
                    {/* Stats Summary */}
                    <div className="flex gap-4">
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

            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {allProjects.length === 0 ? (
                    <div className="col-span-full bg-surface p-12 text-center rounded-xl border border-white/5 text-text-muted border-dashed">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl opacity-50">📂</div>
                        <h3 className="text-lg font-medium text-white mb-1">Nenhum projeto encontrado</h3>
                        <p>Você ainda não tem projetos vinculados a esta conta.</p>
                    </div>
                ) : (
                    allProjects.map((project) => {
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
                                </div>
                                
                                <Link href={`/client/projects/${project.id}`} className="group-hover:text-primary transition-colors mb-2">
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
                                        <span>{project.updatedAt ? new Date(project.updatedAt).toLocaleDateString('pt-BR') : '-'}</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/5">
                                    <Link 
                                        href={`/client/projects/${project.id}`} 
                                        className="block w-full text-center text-sm font-bold text-white bg-white/5 hover:bg-primary hover:text-white py-2 rounded-lg transition-all border border-white/5 hover:border-primary/50"
                                    >
                                        Ver Detalhes
                                    </Link>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </main>
    );
}