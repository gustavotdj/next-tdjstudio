import { db } from 'db/index';
import { projects, clients, subProjects, projectClients, transactions } from 'db/schema';
import { eq, asc, and, desc } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect, notFound } from 'next/navigation';
import ProjectBudget from 'components/projects/ProjectBudget';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, ShieldCheck } from 'lucide-react';

export default async function ClientBudgetDetailPage({ params }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/api/auth/signin');

    const { id } = await params;

    // First find the client record to ensure security
    const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.email, session.user.email),
        with: {
            projects: {
                where: eq(projectClients.projectId, id)
            }
        }
    });

    // Security check: must be admin OR a client linked to THIS project
    const isOwner = clientRecord && clientRecord.projects.length > 0;
    const isAdmin = session.user.role === 'admin';

    if (!isOwner && !isAdmin) {
        return (
            <main className="w-full px-6 py-12 text-center">
                <h1 className="text-2xl font-bold text-white mb-2">Acesso Negado</h1>
                <p className="text-text-muted">Você não tem permissão para visualizar este orçamento.</p>
            </main>
        );
    }

    const project = await db.query.projects.findFirst({
        where: eq(projects.id, id),
        with: {
            subProjects: {
                orderBy: asc(subProjects.position)
            },
            transactions: {
                where: eq(transactions.status, 'completed'),
                orderBy: desc(transactions.date)
            }
        }
    });

    if (!project) notFound();

    return (
        <main className="w-full max-w-7xl mx-auto px-4 py-8">
            <div className="mb-8">
                <Link 
                    href="/client/budgets" 
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-white transition-colors mb-6 group bg-white/5 px-3 py-1.5 rounded-lg border border-white/5"
                >
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                    Voltar
                </Link>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-surface/40 p-6 rounded-[2rem] border border-white/5 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full -mr-32 -mt-32"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                <ShieldCheck size={10} /> Orçamento Aprovado
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">{project.name}</h1>
                        
                        <div className="flex items-center gap-4 text-text-muted text-[10px] font-bold uppercase tracking-widest">
                            <div className="flex items-center gap-1.5">
                                <Calendar size={12} className="text-primary/70" />
                                {new Date(project.updatedAt).toLocaleDateString('pt-BR')}
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-col sm:flex-row gap-4 lg:gap-8 items-start sm:items-center">
                        <div className="text-left sm:text-right">
                            <p className="text-[9px] text-text-muted uppercase tracking-[0.2em] mb-1 font-black">Total do Investimento</p>
                            <p className="text-3xl font-black text-white font-mono tracking-tighter">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.budget?.total || 0)}
                            </p>
                        </div>
                        <div className="w-px h-10 bg-white/5 hidden sm:block"></div>
                        <div className="text-left sm:text-right">
                            <p className="text-[9px] text-primary uppercase tracking-[0.2em] mb-1 font-black">Saldo a Pagar</p>
                            <p className="text-3xl font-black text-primary font-mono tracking-tighter">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                    Math.max(0, (project.budget?.total || 0) - (project.transactions?.reduce((sum, t) => sum + t.amount, 0) / 100))
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {/* Main Budget Section */}
                <section className="bg-surface/20 rounded-[2.5rem] border border-white/5 overflow-hidden">
                    <div className="p-8 pb-0">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"></div>
                            <h2 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Detalhamento Geral</h2>
                        </div>
                    </div>
                    
                    <div className="p-8 pt-0">
                        <ProjectBudget 
                            initialBudget={project.budget}
                            subProjects={project.subProjects}
                            transactions={project.transactions}
                            readOnly={true}
                            perspective="client"
                        />
                    </div>
                </section>

                {/* Sub-projects Detailing */}
                {project.subProjects && project.subProjects.length > 0 && project.subProjects.some(sp => sp.budget?.total > 0) && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 px-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]"></div>
                            <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Resumo por Etapa</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {project.subProjects.filter(sp => sp.budget?.total > 0).map(sub => {
                                const subTransactions = project.transactions?.filter(t => t.subProjectId === sub.id) || [];
                                const hasTransactions = subTransactions.length > 0;
                                
                                return (
                                    <div key={sub.id} className="bg-surface/30 rounded-[2rem] border border-white/5 p-6 hover:border-white/10 transition-all group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-accent/10 transition-all"></div>
                                        
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className="font-black text-white text-lg tracking-tight mb-1 group-hover:text-accent transition-colors">
                                                        {sub.name}
                                                    </h4>
                                                    <p className="text-[10px] text-text-muted line-clamp-1 max-w-[200px] font-medium">{sub.description || 'Etapa do projeto'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] text-text-muted uppercase tracking-[0.2em] mb-0.5 font-black">Total da Etapa</p>
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
                                                perspective="client"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
