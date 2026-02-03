import { db } from 'db/index';
import { projects, clients, subProjects, projectClients } from 'db/schema';
import { eq, desc, asc, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { CheckSquare, Clock, AlertCircle, ArrowRight, Calendar, FileText, Link as LinkIcon, Key } from 'lucide-react';
import SubProjectCard from 'components/projects/SubProjectCard';
import ProjectLinks from 'components/projects/ProjectLinks';
import ProjectCredentials from 'components/projects/ProjectCredentials';
import ProjectFiles from 'components/projects/ProjectFiles';
import GanttChart from 'components/projects/GanttChart';
import CollapsibleSection from 'components/ui/CollapsibleSection';
import { updateProjectLinks, updateProjectCredentials, updateProjectFiles, updateSubProjectContent } from 'app/actions/project-actions';
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
    const myTasks = [];

    projectSubProjects.forEach(sub => {
        sub.content?.stages?.forEach(stage => {
            stage.items?.forEach(item => {
                totalTasks++;
                if (item.completed) completedTasks++;

                // Collect assigned tasks
                if (item.assignedTo?.includes(clientRecord.id)) {
                    myTasks.push({
                        ...item,
                        subProjectName: sub.name,
                        stageName: stage.name,
                        subProjectId: sub.id,
                        subProjectContent: sub.content // Needed for approval updates
                    });
                }
            });
        });
    });

    // Sort: Pending first, then by Due Date (asc), then Completed
    myTasks.sort((a, b) => {
        if (a.completed === b.completed) {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        }
        return a.completed ? 1 : -1;
    });

    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Decrypt credentials for display
    const decryptedCredentials = (project.credentials || []).map(cred => ({
        ...cred,
        password: cred.password ? decrypt(cred.password) : ''
    }));

    // Fetch Project Owner Client Name if different from current user (or just use project.clientId to find name)
    let projectClientName = clientRecord.name;
    if (project.clientId && project.clientId !== clientRecord.id) {
        const ownerClient = await db.query.clients.findFirst({
            where: eq(clients.id, project.clientId),
            columns: { name: true }
        });
        if (ownerClient) projectClientName = ownerClient.name;
    } else if (!project.clientId) {
        projectClientName = 'Geral';
    }

    // Fetch all clients associated with the project (for displaying other assignees)
    const associatedClients = [];
    if (project.clientId) {
        const ownerClient = await db.query.clients.findFirst({
            where: eq(clients.id, project.clientId),
            columns: { id: true, name: true }
        });
        if (ownerClient) associatedClients.push(ownerClient);
    }
    
    const linkedClients = await db.query.projectClients.findMany({
        where: eq(projectClients.projectId, id),
        with: {
            client: true
        }
    });
    
    linkedClients.forEach(pc => {
        if (pc.client && !associatedClients.find(c => c.id === pc.client.id)) {
            associatedClients.push({ id: pc.client.id, name: pc.client.name });
        }
    });

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

            <section className="grid lg:grid-cols-12 gap-8 items-start">
                
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

                    {/* My Tasks Section */}
                    {myTasks.length > 0 && (
                        <CollapsibleSection
                            id={`mytasks-${id}`}
                            title="Minhas Tarefas"
                            icon={<CheckSquare />}
                            defaultOpen={true}
                            className="border-primary/20"
                            headerRight={
                                <div className="flex gap-2">
                                    <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full" title="Pendentes">
                                        {myTasks.filter(t => !t.completed).length}
                                    </span>
                                    <span className="bg-white/10 text-text-muted text-xs font-bold px-3 py-1 rounded-full" title="Total">
                                        {myTasks.length}
                                    </span>
                                </div>
                            }
                        >
                            <div className="bg-gradient-to-br from-primary/5 to-transparent">
                                <div className="p-5 border-b border-primary/10">
                                    <p className="text-sm text-text-muted">
                                        Acompanhe todas as tarefas atribuídas a você.
                                    </p>
                                </div>
                                <div className="divide-y divide-primary/10 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                                    {myTasks.map((task, idx) => (
                                        <div 
                                            key={`${task.id}-${idx}`} 
                                            className={`p-4 transition-colors flex items-start gap-4 group ${
                                                task.completed ? 'hover:bg-white/5 opacity-60' : 'hover:bg-white/10 bg-white/5'
                                            }`}
                                        >
                                            <div className="mt-1">
                                                <form action={async () => {
                                                    'use server';
                                                    const newContent = JSON.parse(JSON.stringify(task.subProjectContent));
                                                    let found = false;
                                                    if (newContent.stages) {
                                                        for (const stage of newContent.stages) {
                                                            if (stage.items) {
                                                                for (const item of stage.items) {
                                                                    if (item.id === task.id) {
                                                                        item.completed = !item.completed;
                                                                        found = true;
                                                                        break;
                                                                    }
                                                                }
                                                            }
                                                            if (found) break;
                                                        }
                                                    }
                                                    if (found) {
                                                        await updateSubProjectContent(task.subProjectId, newContent, id);
                                                    }
                                                }}>
                                                    <button type="submit" className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                                        task.completed 
                                                            ? 'border-emerald-500 bg-emerald-500/20' 
                                                            : 'border-primary/40 hover:border-primary hover:bg-primary/20'
                                                    }`} title={task.completed ? "Marcar como pendente" : "Marcar como concluído"}>
                                                        {task.completed ? (
                                                            <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                                                        ) : (
                                                            <div className="w-3 h-3 bg-primary rounded-sm opacity-0 hover:opacity-50 transition-opacity"></div>
                                                        )}
                                                    </button>
                                                </form>
                                            </div>
                                            <a href={`#task-${task.id}`} className="flex-1 min-w-0 group-hover:cursor-pointer">
                                                <div className="flex justify-between items-start">
                                                    <h3 className={`font-medium transition-colors ${
                                                        task.completed 
                                                            ? 'text-text-muted line-through decoration-white/20' 
                                                            : 'text-white group-hover:text-primary'
                                                    }`}>
                                                        {task.text}
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        {task.dueDate && !task.completed && (
                                                            <span className={`text-xs font-mono flex items-center gap-1.5 ${
                                                                new Date(task.dueDate) < new Date() ? 'text-red-400 font-bold' : 'text-gray-400'
                                                            }`}>
                                                                <Clock size={12} />
                                                                {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                                                    <span className={`px-2 py-0.5 rounded border ${
                                                        task.completed ? 'bg-white/5 border-white/5' : 'bg-black/20 border-white/10'
                                                    }`}>
                                                        {task.subProjectName}
                                                    </span>
                                                    <span>›</span>
                                                    <span>{task.stageName}</span>
                                                </div>
                                                {task.description && (
                                                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                                                        {task.description}
                                                    </p>
                                                )}
                                            </a>
                                            {!task.completed && (
                                                <div className="flex items-center self-center">
                                                    <form action={async () => {
                                                        'use server';
                                                        const newContent = JSON.parse(JSON.stringify(task.subProjectContent));
                                                        let found = false;
                                                        if (newContent.stages) {
                                                            for (const stage of newContent.stages) {
                                                                if (stage.items) {
                                                                    for (const item of stage.items) {
                                                                        if (item.id === task.id) {
                                                                            item.completed = true;
                                                                            found = true;
                                                                            break;
                                                                        }
                                                                    }
                                                                }
                                                                if (found) break;
                                                            }
                                                        }
                                                        if (found) {
                                                            await updateSubProjectContent(task.subProjectId, newContent, id);
                                                        }
                                                    }}>
                                                        <button 
                                                            type="submit"
                                                            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/50 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 shadow-lg shadow-primary/5"
                                                            title="Concluir esta tarefa"
                                                        >
                                                            <span>✓</span> Concluir
                                                        </button>
                                                    </form>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CollapsibleSection>
                    )}

                    {/* Gantt Chart Section */}
                    <CollapsibleSection
                        id={`gantt-${id}`}
                        title="Cronograma"
                        icon={<Calendar />}
                        defaultOpen={true}
                    >
                        <div className="p-6">
                            <GanttChart subProjects={projectSubProjects} />
                        </div>
                    </CollapsibleSection>

                    {/* Phases Section */}
                    <section className="border-t border-white/5 pt-8">
                        <div className="flex items-center gap-4 mb-8">
                            <h2 className="text-2xl font-bold text-white">Fases do Projeto</h2>
                            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                        </div>
                        
                        <div className="space-y-6">
                            {projectSubProjects.length > 0 ? (
                                projectSubProjects.map(sub => (
                                    <SubProjectCard 
                                        key={sub.id} 
                                        subProject={sub} 
                                        projectId={id} 
                                        readOnly={true} 
                                        projectName={project.name}
                                        clientName={projectClientName}
                                        currentClientId={clientRecord.id}
                                        availableClients={associatedClients}
                                    />
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
                <aside className="lg:col-span-3 space-y-6 sticky top-28 z-30 order-1 lg:order-2">
                    {/* Files Section */}
                    <CollapsibleSection
                        id={`files-${id}`}
                        title="Arquivos"
                        icon={<FileText />}
                        defaultOpen={false}
                        className="bg-surface/30"
                    >
                        <ProjectFiles 
                            title=""
                            initialFiles={project.files}
                            projectId={id}
                            projectName={project.name}
                            clientName={projectClientName}
                            readOnly={false}
                            onSave={async (files) => {
                                'use server';
                                await updateProjectFiles(id, files);
                            }}
                        />
                    </CollapsibleSection>

                    {/* Links Section */}
                    <CollapsibleSection
                        id={`links-${id}`}
                        title="Links"
                        icon={<LinkIcon />}
                        defaultOpen={false}
                        className="bg-surface/30"
                    >
                        <ProjectLinks 
                            title=""
                            initialLinks={project.links}
                            readOnly={false}
                            onSave={async (links) => {
                                'use server';
                                await updateProjectLinks(id, links);
                            }}
                        />
                    </CollapsibleSection>

                    {/* Credentials Section */}
                    <CollapsibleSection
                        id={`creds-${id}`}
                        title="Acessos"
                        icon={<Key />}
                        defaultOpen={false}
                        className="bg-surface/30"
                    >
                        <ProjectCredentials 
                            title=""
                            initialCredentials={decryptedCredentials}
                            readOnly={false}
                            onSave={async (creds) => {
                                'use server';
                                await updateProjectCredentials(id, creds);
                            }}
                        />
                    </CollapsibleSection>
                    
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

            </section>
        </main>
    );
}