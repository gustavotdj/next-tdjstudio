import { db } from 'db/index';
import { projects, transactions, subProjects } from 'db/schema';
import { desc, isNotNull, asc } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { 
    Briefcase, 
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Filter,
    Search,
    Plus,
    ChevronDown,
    ChevronRight,
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default async function FinanceProjectsPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') redirect('/api/auth/signin');

    // Buscar projetos que tenham transações ou orçamento definido
    const projectsWithData = await db.query.projects.findMany({
        with: {
            clients: {
                with: {
                    client: true
                }
            },
            subProjects: {
                orderBy: asc(subProjects.position),
                with: {
                    transactions: {
                        orderBy: desc(transactions.date),
                        with: {
                            client: true
                        }
                    }
                }
            },
            transactions: {
                orderBy: desc(transactions.date),
                with: {
                    client: true,
                    subProject: true
                }
            }
        },
        orderBy: desc(projects.updatedAt)
    });

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(val);
    };

    const getSubProjectItemName = (transaction) => {
        const { project, subProject, subProjectItemId } = transaction;
        if (!subProjectItemId) return null;
        
        // 1. Check SubProject stages and items
        if (subProject && subProject.content?.stages) {
            for (const stage of subProject.content.stages) {
                if (stage.id === subProjectItemId) return stage.title || stage.name;
                if (stage.items) {
                    const item = stage.items.find(i => i.id === subProjectItemId);
                    if (item) return item.title || item.name || item.text || item.description;
                }
            }
        }

        return null;
    };

    return (
        <main className="w-full px-6 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Gestão Financeira por Projeto</h1>
                    <p className="text-text-muted mt-1">Acompanhamento de orçamento vs. execução real.</p>
                </div>
                <Link 
                    href="/admin/finance/new" 
                    className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 font-bold"
                >
                    <Plus size={20} /> Nova Transação
                </Link>
            </div>

            {/* Content Tabs */}
            <div className="flex gap-1 mb-10 bg-surface p-1 rounded-xl border border-white/5 w-fit">
                <Link href="/admin/finance" className="px-6 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-white transition-colors">
                    Fluxo de Caixa Geral
                </Link>
                <button className="px-6 py-2 rounded-lg text-sm font-medium bg-primary text-white shadow-lg shadow-primary/20">
                    Visão por Projeto
                </button>
            </div>

            <div className="space-y-8">
                {projectsWithData.map((project) => {
                    const projectIncome = project.transactions
                        .filter(t => t.type === 'income' && t.status === 'completed')
                        .reduce((acc, t) => acc + t.amount, 0) / 100;
                    const projectExpense = project.transactions
                        .filter(t => t.type === 'expense' && t.status === 'completed')
                        .reduce((acc, t) => acc + t.amount, 0) / 100;
                    const projectBalance = projectIncome - projectExpense;
                    
                    const budgetTotal = project.budget?.total || 0;
                    const budgetProgress = budgetTotal > 0 ? (projectIncome / budgetTotal) * 100 : 0;

                    return (
                        <div key={project.id} className="bg-surface rounded-3xl border border-white/5 overflow-hidden shadow-2xl flex flex-col">
                            {/* Project Header & Stats */}
                            <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                                <div className="flex flex-col lg:flex-row justify-between gap-8">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                                <Briefcase size={24} />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black text-white">{project.name}</h2>
                                                <p className="text-sm text-text-muted">
                                                    {project.clients?.map(c => c.client.name).join(', ') || 'Sem cliente vinculado'}
                                                </p>
                                            </div>
                                            <span className={`ml-auto lg:ml-4 text-[10px] px-3 py-1 rounded-full border uppercase font-bold tracking-wider ${
                                                project.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                            }`}>
                                                {project.status === 'active' ? 'Ativo' : project.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                                <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Recebido</p>
                                                <p className="text-xl font-black text-emerald-400">{formatCurrency(projectIncome)}</p>
                                            </div>
                                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                                <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Custos</p>
                                                <p className="text-xl font-black text-red-400">{formatCurrency(projectExpense)}</p>
                                            </div>
                                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                                <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Saldo</p>
                                                <p className={`text-xl font-black ${projectBalance >= 0 ? 'text-white' : 'text-red-400'}`}>{formatCurrency(projectBalance)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:w-80 space-y-6">
                                        <div>
                                            <div className="flex justify-between text-[10px] uppercase tracking-widest text-text-muted mb-2">
                                                <span>Progresso do Orçamento</span>
                                                <span className="font-bold text-white">{budgetProgress.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-500 ${budgetProgress >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                                                    style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-[9px] text-text-muted mt-2 text-right">Meta: {formatCurrency(budgetTotal)}</p>
                                        </div>

                                        <div className="flex gap-2">
                                            <Link 
                                                href={`/admin/budgets/${project.id}`}
                                                className="flex-1 flex items-center justify-center gap-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary hover:text-white px-4 py-3 rounded-xl transition-all border border-primary/20"
                                            >
                                                Gerenciar Orçamento <ArrowRight size={14} />
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                {/* Subprojects Row */}
                                {project.subProjects && project.subProjects.length > 0 && (
                                    <div className="mt-8 pt-6 border-t border-white/5">
                                        <p className="text-[10px] text-text-muted uppercase tracking-widest mb-4">Detalhamento por Etapa</p>
                                        <div className="flex flex-wrap gap-3">
                                            {project.subProjects.map(sp => {
                                                const spIncome = sp.transactions
                                                    ?.filter(t => t.type === 'income' && t.status === 'completed')
                                                    .reduce((acc, t) => acc + t.amount, 0) / 100 || 0;
                                                const spExpense = sp.transactions
                                                    ?.filter(t => t.type === 'expense' && t.status === 'completed')
                                                    .reduce((acc, t) => acc + t.amount, 0) / 100 || 0;
                                                const spBalance = spIncome - spExpense;
                                                
                                                return (
                                                    <div key={sp.id} className="bg-white/5 px-4 py-3 rounded-2xl border border-white/5 min-w-[160px]">
                                                        <p className="text-[11px] font-bold text-white truncate mb-1">{sp.name}</p>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[9px] text-text-muted uppercase">Saldo</span>
                                                            <span className={`text-xs font-black ${spBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                {formatCurrency(spBalance)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Project Transactions Table */}
                            <div className="p-0 overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-text-muted border-b border-white/5">
                                            <th className="px-8 py-4 font-semibold">Data</th>
                                            <th className="px-8 py-4 font-semibold">Descrição / Item</th>
                                            <th className="px-8 py-4 font-semibold">Categoria</th>
                                            <th className="px-8 py-4 font-semibold text-right">Valor</th>
                                            <th className="px-8 py-4 font-semibold text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {project.transactions.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-8 py-10 text-center text-text-muted italic text-sm">
                                                    Nenhuma transação registrada para este projeto.
                                                </td>
                                            </tr>
                                        ) : (
                                            project.transactions.map((t) => (
                                                <tr key={t.id} className="hover:bg-white/[0.01] transition-colors group">
                                                    <td className="px-8 py-4">
                                                        <div className="text-sm text-white font-medium">
                                                            {new Date(t.date).toLocaleDateString('pt-BR')}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <div className="text-sm text-white font-bold group-hover:text-primary transition-colors">{t.description}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {t.subProject && (
                                                                <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                                                                    {t.subProject.name}
                                                                </span>
                                                            )}
                                                            {t.subProjectItemId && (
                                                                <span className="text-[9px] bg-white/5 text-text-muted px-1.5 py-0.5 rounded font-medium border border-white/5">
                                                                    {getSubProjectItemName(t) || 'Item'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <span className="text-xs text-text-muted">{t.category || '—'}</span>
                                                    </td>
                                                    <td className={`px-8 py-4 text-right font-mono font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount / 100)}
                                                    </td>
                                                    <td className="px-8 py-4 text-center">
                                                        <span className={`text-[9px] px-2 py-0.5 rounded-full border ${
                                                            t.status === 'completed' 
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                        }`}>
                                                            {t.status === 'completed' ? 'Efetivado' : 'Pendente'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}

                {projectsWithData.length === 0 && (
                    <div className="py-20 text-center bg-surface rounded-3xl border border-dashed border-white/10">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-text-muted">
                            <Briefcase size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Nenhum projeto encontrado</h3>
                        <p className="text-text-muted">Comece criando um projeto ou registrando transações.</p>
                    </div>
                )}
            </div>
        </main>
    );
}
