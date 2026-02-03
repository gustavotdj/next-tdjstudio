import { db } from 'db/index';
import { clients, projects, projectClients, subProjects } from 'db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, CheckSquare, Clock, ArrowRight, Calendar } from 'lucide-react';

import TaskList from '../../admin/dashboard/_components/TaskList';

export default async function ClientDashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/api/auth/signin');

    const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.email, session.user.email)
    });

    if (!clientRecord) {
        // If not a client, maybe admin trying to view? Redirect to admin dashboard
        if (session.user.role !== 'client') {
            redirect('/admin/dashboard');
        }
        return <div className="p-8 text-white">Acesso negado.</div>;
    }

    // 1. Fetch Projects linked to this client
    // Direct ownership
    const ownedProjects = await db.query.projects.findMany({
        where: eq(projects.clientId, clientRecord.id),
        with: {
            subProjects: true
        }
    });

    // Linked via many-to-many
    const linkedRelations = await db.query.projectClients.findMany({
        where: eq(projectClients.clientId, clientRecord.id),
        with: {
            project: {
                with: {
                    subProjects: true
                }
            }
        }
    });

    const linkedProjects = linkedRelations.map(r => r.project).filter(Boolean);
    
    // Combine and deduplicate
    const allProjectsMap = new Map();
    [...ownedProjects, ...linkedProjects].forEach(p => allProjectsMap.set(p.id, p));
    const myProjects = Array.from(allProjectsMap.values());

    // 2. Aggregate Tasks
    let totalTasks = 0;
    let pendingTasks = 0;
    let completedTasks = 0;
    const myPendingTasksList = [];
    let nextDeadline = null;

    myProjects.forEach(project => {
        if (project.subProjects) {
            project.subProjects.forEach(sub => {
                if (sub.content?.stages) {
                    sub.content.stages.forEach(stage => {
                        if (stage.items) {
                            stage.items.forEach(item => {
                                // Check if assigned to me
                                const isAssigned = item.assignedTo?.includes(clientRecord.id);
                                
                                if (isAssigned) {
                                    totalTasks++;
                                    if (item.completed) {
                                        completedTasks++;
                                    } else {
                                        pendingTasks++;
                                        
                                        // Track next deadline
                                        if (item.dueDate) {
                                            const dueDate = new Date(item.dueDate);
                                            if (!nextDeadline || dueDate < nextDeadline) {
                                                nextDeadline = dueDate;
                                            }
                                        }
                                    }
                                    
                                    // Add ALL assigned tasks regardless of status
                                    myPendingTasksList.push({
                                        ...item,
                                        projectName: project.name,
                                        projectId: project.id,
                                        projectStatus: project.status,
                                        subProjectName: sub.name,
                                        stageName: stage.name,
                                        subProjectId: sub.id,
                                        subProjectContent: sub.content
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });

    // Sort pending tasks by due date
    myPendingTasksList.sort((a, b) => {
        // Active/Pending first
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        // Then by due date
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
    });

    // Group Tasks by Project
    const tasksByProject = myPendingTasksList.reduce((acc, task) => {
        if (!acc[task.projectId]) {
            acc[task.projectId] = {
                projectName: task.projectName,
                projectStatus: task.projectStatus,
                tasks: []
            };
        }
        acc[task.projectId].tasks.push(task);
        return acc;
    }, {});

    return (
        <main className="w-full px-6 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Olá, {clientRecord.name}</h1>
                    <p className="text-text-muted">Acompanhe o progresso dos seus projetos.</p>
                </div>
                <div className="text-sm text-text-muted flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                    <Calendar size={14} />
                    <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-surface border border-white/5 rounded-xl p-6 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Briefcase size={64} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Meus Projetos</p>
                        <h3 className="text-3xl font-bold text-white mt-1">{myProjects.length}</h3>
                        <Link href="/client/projects" className="mt-4 flex items-center gap-2 text-xs text-primary hover:underline">
                            Ver todos <ArrowRight size={12} />
                        </Link>
                    </div>
                </div>

                <div className="bg-surface border border-white/5 rounded-xl p-6 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckSquare size={64} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Tarefas Pendentes</p>
                        <h3 className="text-3xl font-bold text-white mt-1">{pendingTasks}</h3>
                        <div className="mt-4 w-full bg-white/10 rounded-full h-1.5">
                            <div 
                                className="bg-orange-500 h-1.5 rounded-full" 
                                style={{ width: `${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-text-muted mt-2">{completedTasks} concluídas de {totalTasks}</p>
                    </div>
                </div>

                <div className="bg-surface border border-white/5 rounded-xl p-6 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock size={64} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Próxima Entrega</p>
                        <h3 className="text-xl font-bold text-white mt-2">
                            {nextDeadline 
                                ? nextDeadline.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) 
                                : 'Sem prazos'}
                        </h3>
                        {nextDeadline && (
                            <div className={`mt-3 text-xs font-bold px-2 py-1 rounded inline-block ${
                                nextDeadline < new Date() ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                                {Math.ceil((nextDeadline - new Date()) / (1000 * 60 * 60 * 24))} dias restantes
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Pending Tasks List */}
                <div className="lg:col-span-2 bg-surface border border-white/5 rounded-xl p-6 shadow-lg h-full flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 shrink-0">
                        <CheckSquare size={20} className="text-primary" />
                        Minhas Tarefas
                    </h3>
                    
                    <TaskList tasksByProject={tasksByProject} userRole="client" />
                </div>

                {/* Projects Summary */}
                <div className="lg:col-span-1 bg-surface border border-white/5 rounded-xl p-6 shadow-lg flex flex-col h-full">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 shrink-0">
                        <Briefcase size={20} className="text-primary" />
                        Projetos Ativos
                    </h3>
                    <div className="space-y-4 flex-1">
                        {myProjects.filter(p => p.status === 'active').map(project => {
                            // Calculate real progress for this project
                            let pTotalTasks = 0;
                            let pCompletedTasks = 0;
                            if (project.subProjects) {
                                project.subProjects.forEach(sub => {
                                    if (sub.content?.stages) {
                                        sub.content.stages.forEach(stage => {
                                            if (stage.items) {
                                                stage.items.forEach(item => {
                                                    // Count only tasks relevant to the client? Or all tasks?
                                                    // Usually client wants to see overall project progress or their part.
                                                    // Let's show overall progress for simplicity and transparency.
                                                    pTotalTasks++;
                                                    if (item.completed) pCompletedTasks++;
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                            const pProgress = pTotalTasks > 0 ? Math.round((pCompletedTasks / pTotalTasks) * 100) : 0;

                            return (
                            <Link 
                                key={project.id}
                                href={`/client/projects/${project.id}`}
                                className="block p-4 bg-white/5 border border-white/5 rounded-lg hover:border-primary/30 transition-all"
                            >
                                <div className="font-semibold text-white mb-1">{project.name}</div>
                                <div className="text-xs text-text-muted mb-3 line-clamp-1">{project.description || 'Sem descrição'}</div>
                                {/* Mini Progress Bar */}
                                <div className="flex justify-between text-[10px] text-text-muted mb-1">
                                    <span>Progresso</span>
                                    <span>{pProgress}%</span>
                                </div>
                                <div className="w-full bg-black/40 h-1 rounded-full overflow-hidden">
                                    <div className="bg-primary h-full transition-all duration-500" style={{ width: `${pProgress}%` }}></div>
                                </div>
                            </Link>
                        )})}
                        {myProjects.filter(p => p.status === 'active').length === 0 && (
                            <div className="text-center text-text-muted italic py-4">
                                Nenhum projeto ativo no momento.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
