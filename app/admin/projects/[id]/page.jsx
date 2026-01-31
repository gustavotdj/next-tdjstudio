import { db } from 'db/index';
import { projects, clients, subProjects } from 'db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import SubProjectList from 'components/projects/SubProjectList';
import ProjectLinks from 'components/projects/ProjectLinks';
import GanttChart from 'components/projects/GanttChart';
import ProjectCredentials from 'components/projects/ProjectCredentials';
import { createSubProject, updateProjectLinks, updateProjectCredentials } from 'app/actions/project-actions';
import { decrypt } from 'lib/crypto';

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

    // Fetch Client manually
    let client = null;
    if (project.clientId) {
        client = await db.query.clients.findFirst({
            where: eq(clients.id, project.clientId),
        });
    }

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
        <main className="w-full px-6 py-8">
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
                <GanttChart subProjects={projectSubProjects} />
            </div>

            {/* Content Grid */}
            <div className="grid md:grid-cols-3 gap-8">
                
                {/* Main Content: Sub-projects / Details */}
                <div className="md:col-span-2 space-y-8">
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">Sub-projetos & Tarefas</h2>
                            <form action={createSubProject.bind(null, id)} className="flex gap-2">
                                <input 
                                    name="name" 
                                    type="text" 
                                    placeholder="Novo Sub-projeto (ex: Identidade)" 
                                    className="px-4 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-500 text-sm w-64"
                                    required
                                />
                                <button type="submit" className="text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                                    + Criar
                                </button>
                            </form>
                        </div>
                        
                        <div className="space-y-4">
                            <SubProjectList initialSubProjects={projectSubProjects} projectId={id} />
                        </div>
                    </section>
                </div>

                {/* Sidebar: Client Info & Meta */}
                <div className="md:col-span-1 space-y-6">
                    {/* Client Card */}
                    <div className="bg-surface p-6 rounded-xl shadow-lg border border-white/5">
                        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Cliente</h3>
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

                    {/* Project Links */}
                    <ProjectLinks 
                        projectId={id} 
                        initialLinks={project.links} 
                        onSave={async (links) => {
                            'use server';
                            await updateProjectLinks(id, links);
                        }}
                    />

                    {/* Project Credentials */}
                    <ProjectCredentials 
                        initialCredentials={decryptedCredentials}
                        onSave={async (creds) => {
                            'use server';
                            await updateProjectCredentials(id, creds);
                        }}
                    />

                    {/* Project Meta */}
                    <div className="bg-surface p-6 rounded-xl shadow-lg border border-white/5">
                        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Detalhes</h3>
                        <div className="space-y-4">
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
                    </div>
                </div>
            </div>
        </main>
    );
}