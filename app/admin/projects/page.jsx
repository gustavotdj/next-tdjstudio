import { db } from 'db/index';
import { projects, clients } from 'db/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { Briefcase, Clock, LayoutGrid, Calendar, CheckSquare, MessageSquare, ListTodo } from 'lucide-react';
import { CreateProjectModal } from './CreateProjectModal';
import ClientAvatar from 'components/ui/ClientAvatar';

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
                                // Calculate Metrics
                                let totalTasks = 0;
                                let completedTasks = 0;
                                let totalComments = 0;
                                const pendingTasksList = [];
                                
                                project.subProjects.forEach(sub => {
                                    if (sub.content?.stages) {
                                        sub.content.stages.forEach(stage => {
                                            if (stage.items) {
                                                stage.items.forEach(item => {
                                                    totalTasks++;
                                                    if (item.completed) {
                                                        completedTasks++;
                                                    } else {
                                                        pendingTasksList.push(item);
                                                    }
                                                    if (item.comments) {
                                                        totalComments += item.comments.length;
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });

                                const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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
                                                    <ClientAvatar seed={pc.client.avatar || pc.client.email || pc.client.name} size="w-6 h-6" />
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
                                    
                                    <p className="text-text-muted text-xs mb-4 line-clamp-2 leading-relaxed min-h-[40px]">
                                        {project.description || 'Sem descrição definida para este projeto.'}
                                    </p>
                                    
                                    {/* Stats Bar */}
                                    <div className="mb-4">
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="text-text-muted font-medium">Progresso</span>
                                            <span className={progress === 100 ? "text-emerald-400 font-bold" : "text-white font-bold"}>{progress}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    progress === 100 ? 'bg-emerald-500' : 'bg-primary'
                                                }`}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Pending Tasks Preview */}
                                    {pendingTasksList.length > 0 && (
                                        <div className="mb-4 bg-white/5 rounded-lg p-3 border border-white/5">
                                            <div className="flex items-center gap-2 text-xs text-text-muted mb-2 font-bold uppercase tracking-wider">
                                                <ListTodo size={12} />
                                                Próximas Tarefas
                                            </div>
                                            <div className="space-y-1.5">
                                                {pendingTasksList.slice(0, 3).map((task, idx) => (
                                                    <div key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                                                        <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                                                        <span className="line-clamp-1">{task.text || task.title}</span>
                                                    </div>
                                                ))}
                                                {pendingTasksList.length > 3 && (
                                                    <div className="text-[10px] text-text-muted pl-3">
                                                        + {pendingTasksList.length - 3} outras tarefas...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="mt-auto flex items-center justify-between text-xs text-text-muted pt-3 border-t border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5" title={`${completedTasks} de ${totalTasks} tarefas concluídas`}>
                                                <CheckSquare size={14} className={totalTasks > 0 && totalTasks === completedTasks ? "text-emerald-400" : "text-primary"} />
                                                <span>{completedTasks}/{totalTasks}</span>
                                            </div>
                                            {totalComments > 0 && (
                                                <div className="flex items-center gap-1.5 text-blue-400" title={`${totalComments} comentários`}>
                                                    <MessageSquare size={14} />
                                                    <span>{totalComments}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={14} />
                                            <span>{project.updatedAt ? new Date(project.updatedAt).toLocaleDateString('pt-BR') : '-'}</span>
                                        </div>
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
