import { db } from 'db/index';
import { projects, clients, subProjects, projectClients } from 'db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, FileText, Link as LinkIcon, Key, Folder, Briefcase } from 'lucide-react';
import SubProjectList from 'components/projects/SubProjectList';
import ProjectLinks from 'components/projects/ProjectLinks';
import GanttChart from 'components/projects/GanttChart';
import ProjectCredentials from 'components/projects/ProjectCredentials';
import { createSubProject, updateProjectLinks, updateProjectCredentials, updateProjectFiles } from 'app/actions/project-actions';
import { decrypt } from 'lib/crypto';
import ProjectFiles from 'components/projects/ProjectFiles';
import FileManager from 'components/admin/FileManager';
import { normalizePath } from 'lib/utils';
import { TaskNavigationProvider } from 'components/projects/TaskNavigationContext';
import TaskHashNavigator from 'components/projects/TaskHashNavigator';
import CollapsibleSection from 'components/ui/CollapsibleSection';
import CreateSubProjectForm from 'components/projects/CreateSubProjectForm';

export default async function AdminProjectDetailsPage({ params }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/api/auth/signin');

    const { id } = await params;
    
    // Admin check: cannot be a client
    const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.email, session.user.email)
    });
    
    if (clientRecord || session.user.role === 'client') {
        redirect(`/client/projects/${id}`);
    }

    const project = await db.query.projects.findFirst({
        where: eq(projects.id, id),
    });

    if (!project) {
        notFound();
    }

    // Decrypt credentials for display
    const decryptedCredentials = (project.credentials || []).map(cred => ({
        ...cred,
        password: cred.password ? decrypt(cred.password) : ''
    }));

    // Fetch Client manually or try to infer from project name/context if not directly linked (fallback)
    let client = null;
    let projectClientName = 'Geral'; // Default folder if no client found

    if (project.clientId) {
        client = await db.query.clients.findFirst({
            where: eq(clients.id, project.clientId),
        });
        if (client) {
            projectClientName = client.name;
        }
    }

    // Fetch all clients associated with the project (for task assignment)
    // 1. Owner
    const associatedClients = [];
    if (client) {
        associatedClients.push({ id: client.id, name: client.name });
    }
    // 2. Linked Clients (Many-to-Many)
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

    // Fetch SubProjects
    const rawSubProjects = await db.query.subProjects.findMany({
        where: eq(subProjects.projectId, id),
        orderBy: [asc(subProjects.position), desc(subProjects.createdAt)],
    });

    // Decrypt sub-project credentials
    const projectSubProjects = rawSubProjects.map(sub => ({
        ...sub,
        credentials: (sub.credentials || []).map(cred => ({
            ...cred,
            password: cred.password ? decrypt(cred.password) : ''
        }))
    }));

    return (
        <TaskNavigationProvider>
            <TaskHashNavigator subProjects={projectSubProjects} />
            <main className="w-full px-4 py-6 md:px-6 md:py-8">
                {/* Header / Back Link */}
            <div className="mb-8">
                <Link 
                    href="/admin/projects" 
                    className="text-text-muted hover:text-white transition-colors flex items-center gap-2 mb-4"
                >
                    <span>←</span> Voltar para Projetos
                </Link>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl font-bold text-white">{project.name}</h1>
                            <span className={`text-sm px-3 py-1 rounded-full border ${
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
                            <p className="text-xl text-text-muted max-w-3xl leading-relaxed">
                                {project.description}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Link 
                            href={`/admin/projects/${id}/edit`}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all text-sm font-medium"
                        >
                            Editar Projeto
                        </Link>
                    </div>
                </div>
            </div>

            {/* Gantt Chart Section */}
            <div className="mb-10">
                <CollapsibleSection
                    id={`admin-gantt-${id}`}
                    title="Cronograma"
                    icon={<Calendar />}
                    defaultOpen={true}
                >
                    <div className="p-4 md:p-6">
                        <GanttChart subProjects={projectSubProjects} />
                    </div>
                </CollapsibleSection>
            </div>

            {/* Content Grid */}
            <div className="grid md:grid-cols-3 gap-8">
                
                {/* Main Content: Sub-projects / Details */}
                <div className="md:col-span-2 space-y-8">
                    <CollapsibleSection
                        id={`admin-subprojects-${id}`}
                        title="Sub-projetos & Tarefas"
                        icon={<Briefcase />}
                        defaultOpen={true}
                        headerRight={<CreateSubProjectForm projectId={id} />}
                    >
                        <div className="p-6">
                            <SubProjectList 
                                initialSubProjects={projectSubProjects} 
                                projectId={id} 
                                projectName={project.name}
                                clientName={projectClientName} 
                                availableClients={associatedClients}
                            />
                        </div>
                    </CollapsibleSection>

                    {/* Full Project File Explorer */}
                    <div className="mt-8">
                        <CollapsibleSection
                            id={`admin-filemanager-${id}`}
                            title={`Arquivos do Projeto: ${project.name}`}
                            icon={<Folder />}
                            defaultOpen={true}
                        >
                            <div className="p-4 md:p-6">
                                <FileManager 
                                    initialPath={`${normalizePath(projectClientName)}/${normalizePath(project.name)}/`} 
                                    title=""
                                    projectSubProjects={projectSubProjects}
                                    projectFiles={project.files}
                                />
                            </div>
                        </CollapsibleSection>
                    </div>
                </div>

                {/* Sidebar: Client Info & Meta */}
                <div className="md:col-span-1 space-y-6">
                    {/* Client Card */}
                    <CollapsibleSection
                        id={`admin-client-${id}`}
                        title="Cliente"
                        defaultOpen={true}
                        className="bg-surface"
                    >
                        <div className="p-6">
                            {client ? (
                                <div>
                                    <Link href={`/admin/clients/${client.id}`} className="block group">
                                        <div className="text-lg font-bold text-white group-hover:text-primary transition-colors mb-1">
                                            {client.name}
                                        </div>
                                        <div className="text-sm text-text-muted group-hover:text-white/80 transition-colors">
                                            Ver detalhes do cliente →
                                        </div>
                                    </Link>
                                    <div className="mt-4 pt-4 border-t border-white/5 space-y-2 text-sm">
                                        {client.email && (
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <span>✉️</span> {client.email}
                                            </div>
                                        )}
                                        {client.phone && (
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <span>📱</span> {client.phone}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-text-muted italic">
                                    Nenhum cliente vinculado.
                                </div>
                            )}
                        </div>
                    </CollapsibleSection>

                    {/* Project Files */}
                    <CollapsibleSection
                        id={`admin-files-${id}`}
                        title="Arquivos Gerais"
                        icon={<FileText size={18} />}
                        defaultOpen={false}
                        className="bg-surface"
                    >
                        <ProjectFiles 
                            projectId={id}
                            projectName={project.name}
                            clientName={projectClientName}
                            initialFiles={project.files} 
                            title=""
                            onSave={async (files) => {
                                'use server';
                                await updateProjectFiles(id, files);
                            }}
                        />
                    </CollapsibleSection>

                    {/* Project Links */}
                    <CollapsibleSection
                        id={`admin-links-${id}`}
                        title="Links"
                        icon={<LinkIcon />}
                        defaultOpen={false}
                        className="bg-surface"
                    >
                        <ProjectLinks 
                            projectId={id} 
                            initialLinks={project.links} 
                            title=""
                            onSave={async (links) => {
                                'use server';
                                await updateProjectLinks(id, links);
                            }}
                        />
                    </CollapsibleSection>

                    {/* Project Credentials */}
                    <CollapsibleSection
                        id={`admin-creds-${id}`}
                        title="Acessos"
                        icon={<Key />}
                        defaultOpen={false}
                        className="bg-surface"
                    >
                        <ProjectCredentials 
                            initialCredentials={decryptedCredentials}
                            title=""
                            onSave={async (creds) => {
                                'use server';
                                await updateProjectCredentials(id, creds);
                            }}
                        />
                    </CollapsibleSection>

                    {/* Project Meta */}
                    <CollapsibleSection
                        id={`admin-meta-${id}`}
                        title="Detalhes"
                        defaultOpen={false}
                        className="bg-surface"
                    >
                        <div className="p-4 md:p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Criado em</span>
                                <span className="text-white font-mono text-sm">
                                    {project.createdAt ? new Date(project.createdAt).toLocaleDateString('pt-BR') : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Última atualização</span>
                                <span className="text-white font-mono text-sm">
                                    {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString('pt-BR') : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">ID do Projeto</span>
                                <span className="text-white font-mono text-xs" title={project.id}>
                                    {project.id.substring(0, 8)}...
                                </span>
                            </div>
                        </div>
                    </CollapsibleSection>
                </div>
            </div>
            </main>
        </TaskNavigationProvider>
    );
}