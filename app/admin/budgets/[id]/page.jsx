import { db } from 'db/index';
import { projects, clients, subProjects, transactions } from 'db/schema';
import { eq, asc, desc } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect, notFound } from 'next/navigation';
import ProjectBudget from 'components/projects/ProjectBudget';
import { updateProjectBudget, updateSubProjectBudget } from 'app/actions/project-actions';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, Plus, Briefcase, ExternalLink, Settings } from 'lucide-react';

export default async function AdminBudgetDetailPage({ params }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/api/auth/signin');

    const { id } = await params;

    const project = await db.query.projects.findFirst({
        where: eq(projects.id, id),
        with: {
            clients: {
                with: {
                    client: true
                }
            },
            subProjects: {
                orderBy: asc(subProjects.position)
            },
            transactions: {
                orderBy: desc(transactions.date)
            }
        }
    });

    if (!project) notFound();

    const totalBudget = project.budget?.total || 0;
    const totalReceived = (project.transactions || [])
        .filter(t => t.type === 'income' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0) / 100;
    const remainingToReceive = Math.max(0, totalBudget - totalReceived);

    // Helper to find subproject item name
    const getSubProjectItemName = (subProjectId, itemId) => {
        if (!itemId) return null;
        
        // 1. Check SubProject stages and items
        const subProject = project.subProjects?.find(s => s.id === subProjectId);
        if (subProject) {
            if (subProject.content?.stages) {
                for (const stage of subProject.content.stages) {
                    if (stage.id === itemId) return stage.title || stage.name;
                    if (stage.items) {
                        const item = stage.items.find(i => i.id === itemId);
                        if (item) return item.title || item.name || item.text || item.description;
                    }
                }
            }
        }

        return null;
    };

    return (
        <main className="w-full px-6 py-8 max-w-7xl mx-auto">
            {/* Header Slim */}
            <div className="mb-10">
                <Link 
                    href="/admin/budgets" 
                    className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-all mb-6 group bg-white/5 px-3 py-1.5 rounded-full border border-white/5"
                >
                    <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
                    Voltar
                </Link>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-surface/40 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-2xl shadow-primary/20">
                            <Briefcase size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <Link href={`/admin/projects/${project.id}`} className="group flex items-center gap-3">
                                    <h1 className="text-3xl font-black text-white tracking-tight group-hover:text-primary transition-colors">{project.name}</h1>
                                    <ExternalLink size={18} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Link>
                                <Link 
                                    href={`/admin/projects/${project.id}/edit`}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-all border border-white/5" 
                                    title="Editar Projeto"
                                >
                                    <Settings size={14} />
                                </Link>
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${
                                    project.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-text-muted border border-white/10'
                                }`}>
                                    {project.status === 'active' ? 'Ativo' : project.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-text-muted">
                                {project.clients && project.clients.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <User size={12} />
                                        <span>{project.clients.map(pc => pc.client.name).join(', ')}</span>
                                    </div>
                                )}
                                <div className="w-1 h-1 rounded-full bg-white/10"></div>
                                <div className="flex items-center gap-2">
                                    <Calendar size={12} />
                                    <span>Criado em {new Date(project.createdAt).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 pl-8 lg:border-l border-white/10">
                        <div className="text-right">
                            <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] mb-1 font-bold">Total Recebido</p>
                            <p className="text-2xl font-black text-emerald-400 leading-none tracking-tighter">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceived)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] mb-1 font-bold">A Receber</p>
                            <p className="text-2xl font-black text-primary leading-none tracking-tighter">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(remainingToReceive)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] mb-1 font-bold">Orçamento Total</p>
                            <p className="text-3xl font-black text-white leading-none tracking-tighter">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBudget)}
                            </p>
                            {project.budget?.type === 'dynamic' && (
                                <p className="text-[9px] text-primary mt-1.5 font-bold uppercase tracking-wider flex items-center justify-end gap-1">
                                    <div className="w-1 h-1 rounded-full bg-primary animate-pulse"></div>
                                    Soma das Etapas
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Budget Section */}
                <div className="lg:col-span-12 space-y-12">
                    <section className="bg-surface/30 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl shadow-black/20">
                        <div className="p-8">
                            <ProjectBudget 
                                projectId={project.id}
                                initialBudget={project.budget}
                                subProjects={project.subProjects}
                                transactions={project.transactions}
                                hideStats={false}
                                onSave={async (budgetData) => {
                                    'use server';
                                    await updateProjectBudget(project.id, budgetData);
                                }}
                            />
                        </div>
                    </section>

                    {/* Sub-projects Detailing Slim */}
                    {project.subProjects && project.subProjects.length > 0 && (
                        <section className="space-y-8">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                                    <div className="w-2 h-8 rounded-full bg-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]"></div>
                                    Detalhamento por Etapas
                                </h3>
                                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                                    <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">
                                        {project.subProjects.length} Etapas
                                    </span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {project.subProjects.map(sub => {
                                    const subTransactions = project.transactions?.filter(t => t.subProjectId === sub.id) || [];
                                    const hasTransactions = subTransactions.length > 0;
                                    
                                    return (
                                        <div key={sub.id} className="bg-surface/40 rounded-[2rem] border border-white/5 p-6 hover:border-white/10 transition-all group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-accent/10 transition-all"></div>
                                            
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4 className="font-black text-white text-lg tracking-tight mb-1 group-hover:text-accent transition-colors">
                                                            {sub.name}
                                                        </h4>
                                                        <p className="text-[10px] text-text-muted line-clamp-1 max-w-[200px]">{sub.description || 'Sem descrição definida'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[8px] text-text-muted uppercase tracking-widest mb-0.5 font-bold">Total da Etapa</p>
                                                        <span className="text-lg font-black text-emerald-400 font-mono tracking-tighter">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sub.budget?.total || 0)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {hasTransactions && <div className="h-px bg-white/5 w-full mb-4"></div>}

                                                <ProjectBudget 
                                                    projectId={project.id}
                                                    subProjectId={sub.id}
                                                    initialBudget={sub.budget}
                                                    transactions={project.transactions}
                                                    isSubProject={true}
                                                    variant="slim"
                                                    readOnly={true}
                                                    onSave={async (budgetData) => {
                                                        'use server';
                                                        await updateSubProjectBudget(sub.id, budgetData, project.id);
                                                    }}
                                                />

                                                <div className="mt-4 flex justify-end">
                                                    <Link 
                                                        href={`/admin/finance/new?projectId=${project.id}&subProjectId=${sub.id}`}
                                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/10 text-[9px] font-black uppercase tracking-widest text-text-muted hover:text-emerald-400 border border-white/5 hover:border-emerald-500/20 transition-all"
                                                    >
                                                        <Plus size={12} />
                                                        Lançar Recebimento
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </main>
    );
}
