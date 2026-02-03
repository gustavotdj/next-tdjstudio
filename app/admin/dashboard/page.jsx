import { db } from 'db/index';
import { users, clients, projects, subProjects, transactions } from 'db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { 
    Users, Briefcase, CheckSquare, DollarSign, 
    TrendingUp, Activity, Calendar, PieChart, ArrowRight, Clock 
} from 'lucide-react';
import Link from 'next/link';
import { DashboardCharts } from './charts'; // Client component for charts

import { updateSubProjectContent } from 'app/actions/project-actions';

import TaskList from './_components/TaskList';

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/api/auth/signin');
    }

    const isClient = session.user.role === 'client' || !!(await db.query.clients.findFirst({
        where: eq(clients.email, session.user.email)
    }));

    if (isClient) {
        redirect('/client/dashboard');
    }

    // Fetch Data
    const allClients = await db.query.clients.findMany();
    const allProjects = await db.query.projects.findMany({
        with: {
            subProjects: true
        },
        orderBy: [desc(projects.updatedAt)]
    });
    const allTransactions = await db.query.transactions.findMany();

    // Calculate Metrics
    const totalClients = allClients.length;
    const totalProjects = allProjects.length;
    const activeProjects = allProjects.filter(p => p.status === 'active').length;
    
    // Task Calculations
    let totalTasks = 0;
    let completedTasks = 0;
    const allPendingTasks = [];
    
    allProjects.forEach(p => {
        p.subProjects.forEach(sp => {
            if (sp.content?.stages) {
                sp.content.stages.forEach(stage => {
                    if (stage.items) {
                        stage.items.forEach(item => {
                            totalTasks++;
                            if (item.completed) {
                                completedTasks++;
                            }
                            
                            // Add ALL tasks to the list, regardless of status
                            allPendingTasks.push({
                                ...item,
                                projectName: p.name,
                                projectId: p.id,
                                projectStatus: p.status,
                                subProjectName: sp.name,
                                subProjectId: sp.id,
                                subProjectContent: sp.content,
                                isCompleted: item.completed // explicit flag
                            });
                        });
                    }
                });
            }
        });
    });

    // Group Pending Tasks by Project
    const tasksByProject = allPendingTasks.reduce((acc, task) => {
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

    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Financials
    const totalIncome = allTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + (t.amount || 0), 0);
    
    const totalExpense = allTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + (t.amount || 0), 0);

    // Chart Data Preparation
    const projectsByStatus = [
        { name: 'Em Andamento', value: activeProjects, color: '#10B981' },
        { name: 'Pausados', value: allProjects.filter(p => p.status === 'paused').length, color: '#F59E0B' },
        { name: 'Concluídos', value: allProjects.filter(p => p.status === 'completed').length, color: '#3B82F6' },
        { name: 'Arquivados', value: allProjects.filter(p => p.status === 'archived').length, color: '#6B7280' },
    ];

    return (
        <main className="w-full px-6 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Visão Geral</h1>
                    <p className="text-text-muted">Bem-vindo de volta, {session.user.name || 'Admin'}.</p>
                </div>
                <div className="text-sm text-text-muted flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                    <Calendar size={14} />
                    <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-surface border border-white/5 rounded-xl p-6 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Briefcase size={64} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Projetos Ativos</p>
                        <h3 className="text-3xl font-bold text-white mt-1">{activeProjects} <span className="text-sm text-text-muted font-normal">/ {totalProjects}</span></h3>
                        <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400">
                            <Activity size={14} />
                            <span>Em produção</span>
                        </div>
                    </div>
                </div>

                <div className="bg-surface border border-white/5 rounded-xl p-6 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users size={64} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Clientes</p>
                        <h3 className="text-3xl font-bold text-white mt-1">{totalClients}</h3>
                        <div className="mt-4 flex items-center gap-2 text-xs text-blue-400">
                            <TrendingUp size={14} />
                            <span>Total registrados</span>
                        </div>
                    </div>
                </div>

                <div className="bg-surface border border-white/5 rounded-xl p-6 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckSquare size={64} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Tarefas Concluídas</p>
                        <h3 className="text-3xl font-bold text-white mt-1">{taskCompletionRate}%</h3>
                        <div className="mt-4 w-full bg-white/10 rounded-full h-1.5">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${taskCompletionRate}%` }}></div>
                        </div>
                        <p className="text-xs text-text-muted mt-2">{completedTasks} de {totalTasks} tarefas</p>
                    </div>
                </div>

                <div className="bg-surface border border-white/5 rounded-xl p-6 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={64} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Receita Total</p>
                        <h3 className="text-3xl font-bold text-emerald-400 mt-1">
                            {(totalIncome / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </h3>
                        <p className="text-xs text-red-400 mt-1">
                            Saídas: {(totalExpense / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
                
                {/* Charts Section */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-surface border border-white/5 rounded-xl p-6 shadow-lg">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <PieChart size={20} className="text-primary" />
                            Distribuição de Projetos
                        </h3>
                        <div className="h-[300px] w-full">
                            <DashboardCharts data={projectsByStatus} />
                        </div>
                    </div>

                    {/* Tasks Grouped by Project */}
                    <div className="bg-surface border border-white/5 rounded-xl p-6 shadow-lg flex flex-col h-full">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 shrink-0">
                            <CheckSquare size={20} className="text-primary" />
                            Tarefas por Projeto
                        </h3>
                        <TaskList tasksByProject={tasksByProject} userRole="admin" />
                    </div>
                </div>

                {/* Recent Projects List */}
                <div className="lg:col-span-1 bg-surface border border-white/5 rounded-xl p-6 shadow-lg flex flex-col h-full">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Activity size={20} className="text-primary" />
                        Projetos Recentes
                    </h3>
                    <div className="flex-1 space-y-4">
                        {allProjects.slice(0, 5).map(project => (
                            <Link 
                                key={project.id} 
                                href={`/admin/projects/${project.id}`}
                                className="block p-4 rounded-lg bg-white/5 border border-white/5 hover:border-primary/30 hover:bg-white/10 transition-all group"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-white group-hover:text-primary transition-colors truncate">{project.name}</h4>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold ${
                                        project.status === 'active' 
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                            : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                    }`}>
                                        {project.status === 'active' ? 'Ativo' : project.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-text-muted">
                                    <span>{new Date(project.updatedAt).toLocaleDateString('pt-BR')}</span>
                                    <span>{project.subProjects.length} fases</span>
                                </div>
                            </Link>
                        ))}
                        {allProjects.length === 0 && (
                            <div className="text-center text-text-muted py-8 italic">
                                Nenhum projeto encontrado.
                            </div>
                        )}
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/5">
                        <Link href="/admin/projects" className="text-sm text-primary hover:underline flex items-center justify-center gap-1">
                            Ver todos os projetos →
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
