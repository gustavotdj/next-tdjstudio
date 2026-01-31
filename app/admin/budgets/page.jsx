import { db } from 'db/index';
import { projects, clients } from 'db/schema';
import { eq, desc } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DollarSign, ArrowRight, User, Folder } from 'lucide-react';

export default async function AdminBudgetsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/api/auth/signin');

    const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.email, session.user.email)
    });
    
    // Admin check
    if (clientRecord || session.user.role === 'client') {
        redirect('/client/projects');
    }

    const allProjects = await db.query.projects.findMany({
        with: {
            clients: {
                with: {
                    client: true
                }
            },
            transactions: true,
            subProjects: true
        },
        orderBy: desc(projects.createdAt)
    });

    return (
        <main className="w-full px-6 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Gestão Financeira</h1>
                    <p className="text-text-muted mt-1">Selecione um projeto para gerenciar o orçamento detalhado.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allProjects.length === 0 ? (
                    <div className="col-span-full bg-surface p-12 text-center rounded-xl border border-white/5 text-text-muted">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">💰</div>
                        <h3 className="text-lg font-medium text-white mb-1">Nenhum projeto encontrado</h3>
                        <p>Crie projetos para começar a gerenciar orçamentos.</p>
                    </div>
                ) : (
                    allProjects.map((project) => {
                        const projectTransactions = project.transactions || [];
                        const totalIncome = projectTransactions
                            .filter(t => t.type === 'income')
                            .reduce((acc, t) => acc + (t.amount / 100), 0);
                        
                        const totalExpense = projectTransactions
                            .filter(t => t.type === 'expense')
                            .reduce((acc, t) => acc + (t.amount / 100), 0);

                        const profit = totalIncome - totalExpense;
                        
                        const budgetTotal = project.budget?.total || 0;
                        const remainingToReceive = Math.max(0, budgetTotal - totalIncome);
                        const displayValue = budgetTotal > 0 ? budgetTotal : totalIncome;
                        const isEstimate = budgetTotal === 0 && totalIncome > 0;

                        // Financial Progress (Payments)
                        const financialProgress = budgetTotal > 0 ? Math.min(100, Math.round((totalIncome / budgetTotal) * 100)) : 0;

                        // Progress calculation
                        let totalTasks = 0;
                        let completedTasks = 0;
                        project.subProjects?.forEach(sub => {
                            sub.content?.stages?.forEach(stage => {
                                stage.items?.forEach(item => {
                                    totalTasks++;
                                    if (item.completed) completedTasks++;
                                });
                            });
                        });
                        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                        return (
                        <Link 
                            key={project.id} 
                            href={`/admin/budgets/${project.id}`}
                            className="group bg-surface hover:bg-white/5 rounded-2xl border border-white/5 hover:border-primary/30 transition-all p-6 flex flex-col justify-between relative overflow-hidden"
                        >
                            {/* Background Progress Glow (Physical Progress) */}
                            <div 
                                className="absolute bottom-0 left-0 h-1 bg-primary/20 transition-all duration-1000 z-10" 
                                style={{ width: `${progress}%` }}
                            />
                            {/* Financial Progress Bar (Overlay) */}
                            <div 
                                className="absolute bottom-0 left-0 h-1 bg-emerald-500/30 transition-all duration-1000 z-20" 
                                style={{ width: `${financialProgress}%` }}
                            />

                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <Folder size={20} />
                                    </div>
                                    <div className="text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                                project.status === 'active' 
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                            }`}>
                                                {project.status === 'active' ? 'Ativo' : project.status}
                                            </span>
                                            <div className="flex gap-2">
                                                <span className="text-[9px] font-bold text-primary/60 uppercase">
                                                    🏗️ {progress}%
                                                </span>
                                                <span className="text-[9px] font-bold text-emerald-400/60 uppercase">
                                                    💰 {financialProgress}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors mb-2 line-clamp-1">
                                    {project.name}
                                </h3>

                                {project.clients && project.clients.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {project.clients.map(pc => (
                                            <span key={pc.client.id} className="text-[10px] text-text-muted bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <User size={10} /> {pc.client.name}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Financial Quick Stats */}
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                                        <p className="text-[9px] text-text-muted uppercase tracking-tighter mb-1">Total Pago</p>
                                        <p className="text-xs font-bold text-white">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncome)}
                                        </p>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-2 border border-white/5 relative overflow-hidden">
                                        <p className="text-[9px] text-text-muted uppercase tracking-tighter mb-1">A Receber</p>
                                        <p className={`text-xs font-bold ${remainingToReceive > 0 ? 'text-amber-400' : 'text-emerald-400/50'}`}>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(remainingToReceive)}
                                        </p>
                                        {remainingToReceive > 0 && budgetTotal > 0 && (
                                            <div className="absolute bottom-0 left-0 h-0.5 bg-amber-500/20 w-full" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">
                                        {profit >= 0 ? 'Lucro Atual' : 'Saldo Devedor'}
                                    </p>
                                    <p className={`text-xl font-black ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profit)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] text-text-muted uppercase tracking-tighter mb-1">Budget Total</p>
                                    <p className="text-sm font-bold text-white/60">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayValue)}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    );
                })
                )}
            </div>
        </main>
    );
}
