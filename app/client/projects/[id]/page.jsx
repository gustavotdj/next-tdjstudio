import { db } from 'db/index';
import { projects, clients, subProjects, projectClients } from 'db/schema';
import { eq, desc, asc, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import SubProjectCard from 'components/projects/SubProjectCard';
import ProjectLinks from 'components/projects/ProjectLinks';
import ProjectCredentials from 'components/projects/ProjectCredentials';
import GanttChart from 'components/projects/GanttChart';
import { updateProjectLinks, updateProjectCredentials } from 'app/actions/project-actions';
import { decrypt } from 'lib/crypto';

export default async function ClientProjectDetailsPage({ params }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/api/auth/signin');

    const { id } = await params;

    // Security Check for Clients: Can only view if they own the project
    const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.email, session.user.email)
    });

    if (!clientRecord) {
        // If not a client record, maybe admin?
        if (session.user.role !== 'client') {
             redirect(`/admin/projects/${id}`);
        }
        return <div className="p-8 text-white">Acesso negado.</div>;
    }

    const project = await db.query.projects.findFirst({
        where: eq(projects.id, id),
    });

    if (!project) {
        notFound();
    }

    // Access Check:
    // 1. Direct ownership (backward compatibility)
    // 2. Many-to-many relationship
    let hasAccess = clientRecord.id === project.clientId;

    if (!hasAccess) {
        const relation = await db.query.projectClients.findFirst({
            where: and(
                eq(projectClients.projectId, id),
                eq(projectClients.clientId, clientRecord.id)
            )
        });
        if (relation) hasAccess = true;
    }

    if (!hasAccess) {
        // Not your project
        redirect('/client/projects');
    }

    // Fetch SubProjects
    const projectSubProjects = await db.query.subProjects.findMany({
        where: eq(subProjects.projectId, id),
        orderBy: [asc(subProjects.position), desc(subProjects.createdAt)],
    });

    // Calculate Overall Project Progress
    let totalTasks = 0;
    let completedTasks = 0;
    projectSubProjects.forEach(sub => {
        sub.content?.stages?.forEach(stage => {
            stage.items?.forEach(item => {
                totalTasks++;
                if (item.completed) completedTasks++;
            });
        });
    });
    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Decrypt credentials for display
    const decryptedCredentials = (project.credentials || []).map(cred => ({
        ...cred,
        password: cred.password ? decrypt(cred.password) : ''
    }));

    return (
        <main className="w-full px-6 py-8">
            {/* Back Link */}
            <div className="mb-6">
                <Link 
                    href="/client/projects" 
                    className="text-[10px] font-bold tracking-widest uppercase text-text-muted hover:text-white transition-colors flex items-center gap-2 group"
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Voltar para Meus Projetos
                </Link>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
                
                {/* Main Content (Left) - Project Management */}
                <div className="lg:col-span-9 space-y-10 order-2 lg:order-1">
                    {/* Header Info */}
                    <div>
                        <div className="flex flex-wrap items-center gap-4 mb-4">
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">{project.name}</h1>
                            <span className={`text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${
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
                        {project.description && (
                            <p className="text-lg text-text-muted max-w-4xl leading-relaxed">
                                {project.description}
                            </p>
                        )}
                        <div className="flex items-center gap-4 mt-4">
                             <span className="text-xs text-gray-500 font-mono bg-white/5 px-2 py-1 rounded">ID: {project.id.substring(0, 8)}</span>
                             <span className="text-xs text-gray-500">{projectSubProjects.length} fases</span>
                             <span className="text-xs text-gray-500">{totalTasks} tarefas</span>
                        </div>
                    </div>

                    {/* Gantt Chart Section */}
                    <div className="border-t border-white/5 pt-8">
                         <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <span>📅</span> Cronograma
                        </h2>
                        <GanttChart subProjects={projectSubProjects} />
                    </div>

                    {/* Phases Section */}
                    <section className="border-t border-white/5 pt-8">
                        <div className="flex items-center gap-4 mb-8">
                            <h2 className="text-2xl font-bold text-white">Fases do Projeto</h2>
                            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                        </div>
                        
                        <div className="space-y-6">
                            {projectSubProjects.length > 0 ? (
                                projectSubProjects.map(sub => (
                                    <SubProjectCard key={sub.id} subProject={sub} projectId={id} readOnly={true} />
                                ))
                            ) : (
                                <div className="p-20 text-center text-text-muted bg-surface/50 rounded-3xl border border-white/5 border-dashed">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-4xl opacity-20">📋</div>
                                        <p className="text-xl font-medium">Nenhuma etapa cadastrada ainda.</p>
                                        <p className="text-sm opacity-60">Estamos organizando o cronograma do seu projeto.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Sidebar (Right) - Links & Quick Info */}
                <aside className="lg:col-span-3 space-y-6 sticky top-8 order-1 lg:order-2">
                    {/* Links Section */}
                    <div className="bg-surface/30 rounded-2xl border border-white/5 overflow-hidden">
                        <ProjectLinks 
                            title="Documentação e Links"
                            initialLinks={project.links}
                            readOnly={false}
                            onSave={async (links) => {
                                'use server';
                                await updateProjectLinks(id, links);
                            }}
                        />
                    </div>

                    {/* Credentials Section */}
                    <div className="bg-surface/30 rounded-2xl border border-white/5 overflow-hidden">
                        <ProjectCredentials 
                            title="Acessos e Senhas"
                            initialCredentials={decryptedCredentials}
                            readOnly={false}
                            onSave={async (creds) => {
                                'use server';
                                await updateProjectCredentials(id, creds);
                            }}
                        />
                    </div>
                    
                    {/* Minimal Progress Card for Sidebar */}
                    <div className="bg-surface/30 p-5 rounded-2xl border border-white/5">
                        <h3 className="text-[10px] font-bold tracking-widest uppercase text-text-muted mb-3">Progresso</h3>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-3xl font-black text-white">{overallProgress}%</span>
                            <span className="text-xs text-text-muted mb-1.5">concluído</span>
                        </div>
                        <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-1000 ease-out ${
                                    overallProgress === 100 ? 'bg-emerald-500' : 'bg-primary'
                                }`}
                                style={{ width: `${overallProgress}%` }}
                            ></div>
                        </div>
                    </div>
                </aside>

            </div>
        </main>
    );
}