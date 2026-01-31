import { db } from 'db/index';
import { projects, clients, projectClients } from 'db/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import Link from 'next/link';

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
        orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
    });

    // Helper to calculate project progress
    const calculateProgress = (project) => {
        let totalTasks = 0;
        let completedTasks = 0;

        project.subProjects?.forEach(sub => {
            // sub.content contains the stages and items
            sub.content?.stages?.forEach(stage => {
                stage.items?.forEach(item => {
                    totalTasks++;
                    if (item.completed) completedTasks++;
                });
            });
        });

        return {
            percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            totalTasks,
            completedTasks,
            subProjectCount: project.subProjects?.length || 0
        };
    };

    return (
        <main className="w-full px-6 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Meus Projetos</h1>
                    <p className="text-text-muted mt-1">Acompanhe o progresso e detalhes dos seus projetos ativos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {allProjects.length === 0 ? (
                    <div className="bg-surface p-12 text-center rounded-xl border border-white/5 text-text-muted">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">📂</div>
                        <h3 className="text-lg font-medium text-white mb-1">Nenhum projeto encontrado</h3>
                        <p>Você ainda não tem projetos vinculados a esta conta.</p>
                    </div>
                ) : (
                    allProjects.map((project) => {
                        const progress = calculateProgress(project);
                        return (
                            <Link 
                                key={project.id} 
                                href={`/client/projects/${project.id}`}
                                className="bg-surface p-6 rounded-xl border border-white/5 hover:border-primary/30 transition-all shadow-lg hover:shadow-xl hover:shadow-primary/5 group relative overflow-hidden block"
                            >
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                                                {project.name}
                                            </h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                project.status === 'active' 
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                            }`}>
                                                {project.status === 'active' ? 'Em Andamento' : project.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-text-muted line-clamp-1 max-w-2xl">
                                            {project.description || 'Sem descrição.'}
                                        </p>
                                    </div>

                                    <div className="flex flex-col items-end text-right">
                                        <div className="text-2xl font-black text-white">
                                            {progress.percentage}%
                                        </div>
                                        <div className="text-[10px] text-text-muted font-medium uppercase tracking-widest">
                                            Progresso Total
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden mb-6">
                                    <div 
                                        className={`h-full transition-all duration-1000 ease-out ${
                                            progress.percentage === 100 ? 'bg-emerald-500' : 'bg-primary'
                                        }`}
                                        style={{ width: `${progress.percentage}%` }}
                                    ></div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Etapas</span>
                                        <span className="text-sm text-white font-medium">{progress.subProjectCount} fases</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Tarefas</span>
                                        <span className="text-sm text-white font-medium">{progress.completedTasks} / {progress.totalTasks}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Última Atualização</span>
                                        <span className="text-sm text-white font-medium">
                                            {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString('pt-BR') : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-end items-center">
                                        <div className="text-xs font-bold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                            VER DETALHES <span aria-hidden="true">&rarr;</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </main>
    );
}