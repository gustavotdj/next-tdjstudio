import { db } from 'db/index';
import { transactions, projects, clients } from 'db/schema';
import { eq, desc, sum } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { 
    TrendingUp, 
    TrendingDown, 
    DollarSign, 
    Plus, 
    Filter, 
    ArrowUpRight, 
    ArrowDownRight,
    Calendar,
    Briefcase,
    User,
    ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export default async function AdminFinancePage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') redirect('/api/auth/signin');

    const allTransactions = await db.query.transactions.findMany({
        with: {
            project: true,
            subProject: true,
            client: true
        },
        orderBy: desc(transactions.date)
    });

    // Helper to find subproject item name
    const getSubProjectItemName = (transaction) => {
        const { project, subProject, subProjectItemId } = transaction;
        if (!subProjectItemId) return null;
        
        // 1. Check SubProject stages and items
        if (subProject && subProject.content?.stages) {
            for (const stage of subProject.content.stages) {
                if (stage.id === subProjectItemId) return stage.title || stage.name;
                if (stage.items) {
                    const item = stage.items.find(i => i.id === subProjectItemId);
                    if (item) return item.title || item.name || item.description;
                }
            }
        }

        return null;
    };

    const stats = {
        totalIncome: allTransactions
            .filter(t => t.type === 'income')
            .reduce((acc, t) => acc + t.amount, 0) / 100,
        totalExpense: allTransactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => acc + t.amount, 0) / 100,
    };
    stats.balance = stats.totalIncome - stats.totalExpense;

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(val);
    };

    return (
        <main className="w-full px-6 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Gestão Financeira</h1>
                    <p className="text-text-muted mt-1">Visão geral de entradas e saídas da empresa.</p>
                </div>
                <div className="flex gap-3">
                    <Link 
                        href="/admin/finance/new" 
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 text-sm font-medium"
                    >
                        <Plus size={18} /> Nova Transação
                    </Link>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-surface p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={80} />
                    </div>
                    <p className="text-text-muted text-xs uppercase tracking-widest mb-1">Saldo Total</p>
                    <h2 className={`text-3xl font-black ${stats.balance >= 0 ? 'text-white' : 'text-red-400'}`}>
                        {formatCurrency(stats.balance)}
                    </h2>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-text-muted bg-white/5 px-2 py-1 rounded-full w-fit">
                        <TrendingUp size={12} className="text-emerald-400" />
                        Fluxo de caixa saudável
                    </div>
                </div>

                <div className="bg-surface p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ArrowUpRight size={80} className="text-emerald-400" />
                    </div>
                    <p className="text-text-muted text-xs uppercase tracking-widest mb-1 text-emerald-400/70">Total Entradas</p>
                    <h2 className="text-3xl font-black text-emerald-400">
                        {formatCurrency(stats.totalIncome)}
                    </h2>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-400 bg-emerald-400/5 px-2 py-1 rounded-full w-fit">
                        <Plus size={12} /> Receitas acumuladas
                    </div>
                </div>

                <div className="bg-surface p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-red-400">
                        <ArrowDownRight size={80} />
                    </div>
                    <p className="text-text-muted text-xs uppercase tracking-widest mb-1 text-red-400/70">Total Saídas</p>
                    <h2 className="text-3xl font-black text-red-400">
                        {formatCurrency(stats.totalExpense)}
                    </h2>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-red-400 bg-red-400/5 px-2 py-1 rounded-full w-fit">
                        <TrendingDown size={12} /> Despesas e investimentos
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="flex gap-1 mb-6 bg-surface p-1 rounded-xl border border-white/5 w-fit">
                <button className="px-6 py-2 rounded-lg text-sm font-medium bg-primary text-white shadow-lg shadow-primary/20">
                    Transações
                </button>
                <Link href="/admin/finance/projects" className="px-6 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-white transition-colors">
                    Projetos
                </Link>
            </div>

            {/* Transactions Table */}
            <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/2">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Calendar size={18} className="text-primary" />
                        Últimas Transações
                    </h3>
                    <button className="text-xs text-text-muted hover:text-white flex items-center gap-1 transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                        <Filter size={14} /> Filtrar
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-[10px] uppercase tracking-widest text-text-muted border-b border-white/5">
                                <th className="px-6 py-4 font-semibold">Data</th>
                                <th className="px-6 py-4 font-semibold">Descrição / Categoria</th>
                                <th className="px-6 py-4 font-semibold">Relacionado a</th>
                                <th className="px-6 py-4 font-semibold text-right">Valor</th>
                                <th className="px-6 py-4 font-semibold text-center">Status</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {allTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-text-muted italic">
                                        Nenhuma transação registrada.
                                    </td>
                                </tr>
                            ) : (
                                allTransactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-white/2 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-white font-medium">
                                                {new Date(t.date).toLocaleDateString('pt-BR')}
                                            </div>
                                            <div className="text-[10px] text-text-muted">
                                                {new Date(t.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-white font-bold group-hover:text-primary transition-colors">{t.description}</div>
                                            <div className="text-[10px] text-text-muted flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
                                                {t.category || 'Sem categoria'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {t.project ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[11px] text-white flex items-center gap-1 font-medium">
                                                        <Briefcase size={10} className="text-primary/70" /> {t.project.name}
                                                    </span>
                                                    <div className="flex flex-wrap gap-1 items-center">
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
                                                    {t.client && (
                                                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                                                            <User size={10} /> {t.client.name}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : t.client ? (
                                                <span className="text-[11px] text-white flex items-center gap-1">
                                                    <User size={10} className="text-primary/70" /> {t.client.name}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-text-muted italic">Geral</span>
                                            )}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-mono font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount / 100)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[9px] px-2 py-0.5 rounded-full border ${
                                                t.status === 'completed' 
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                                {t.status === 'completed' ? 'Efetivado' : 'Pendente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-text-muted hover:text-white transition-colors">
                                                <ChevronRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}
