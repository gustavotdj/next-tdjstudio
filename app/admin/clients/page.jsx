import { db } from 'db/index';
import { clients, users } from 'db/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { CreateClientModal } from './_components/CreateClientModal';
import ClientAvatar from 'components/ui/ClientAvatar';
import { Users, Mail, Phone, Calendar, ArrowRight, UserCheck, MessageCircle, AlertCircle } from 'lucide-react';

export default async function AdminClientsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/api/auth/signin');

    const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.email, session.user.email)
    });
    
    // Admin check: cannot be a client
    if (clientRecord || session.user.role === 'client') {
        redirect('/client/projects');
    }

    const allClients = await db.query.clients.findMany({
        with: {
            projects: {
                with: {
                    project: {
                        with: {
                            transactions: true,
                            subProjects: true
                        }
                    }
                }
            }
        },
        orderBy: desc(clients.createdAt)
    });

    // Fetch all users to check for matches
    const allUsers = await db.select({ 
        email: users.email,
        image: users.image 
    }).from(users);
    
    const userEmails = new Set(allUsers.map(u => u.email));

    return (
        <main className="w-full px-6 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Gerenciar Clientes</h1>
                    <p className="text-text-muted text-sm">Visão geral e cadastro de clientes e parceiros.</p>
                </div>
                
                <div className="flex gap-4 items-center">
                    <CreateClientModal />
                    
                    {/* Stats Summary */}
                    <div className="flex gap-4 pl-4 border-l border-white/5">
                        <div className="bg-surface px-4 py-2 rounded-lg border border-white/5 flex items-center gap-3">
                            <div className="bg-primary/10 p-1.5 rounded-md text-primary">
                                <Users size={16} />
                            </div>
                            <div>
                                <div className="text-xs text-text-muted uppercase tracking-wider font-bold">Total</div>
                                <div className="text-lg font-bold text-white leading-none">{allClients.length}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {allClients.length === 0 ? (
                    <div className="col-span-full bg-surface p-12 text-center rounded-xl border border-white/5 text-text-muted border-dashed">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl opacity-50">👥</div>
                        <h3 className="text-lg font-medium text-white mb-1">Nenhum cliente ainda</h3>
                        <p>Cadastre o primeiro cliente usando o botão acima.</p>
                    </div>
                ) : (
                    allClients.map(client => {
                        const isRegisteredUser = client.email && userEmails.has(client.email);
                        
                        // Calculate Financials
                        let totalIncome = 0;
                        let totalBudget = 0;
                        let unreadComments = 0;

                        client.projects.forEach(pc => {
                            const project = pc.project;
                            const budget = project.budget?.total || 0;
                            const transactions = project.transactions || [];
                            
                            const projectIncome = transactions
                                .filter(t => t.type === 'income')
                                .reduce((acc, t) => acc + (t.amount / 100), 0);

                            // Use budget if set, otherwise use income as a proxy for "total value" if budget is 0 (estimate)
                            totalBudget += (budget > 0 ? budget : projectIncome);
                            totalIncome += projectIncome;

                            // Check for comments (simplified logic: counting all comments for now, 
                            // ideally we'd track "unread" state per user, but for admin view showing activity is good enough)
                            if (project.subProjects) {
                                project.subProjects.forEach(sp => {
                                    if (sp.content?.stages) {
                                        sp.content.stages.forEach(stage => {
                                            if (stage.items) {
                                                stage.items.forEach(item => {
                                                    if (item.comments) {
                                                        // Check if last comment is from client (role check simplified)
                                                        // In a real app we'd check message author role
                                                        unreadComments += item.comments.length; 
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });

                        const remainingBalance = Math.max(0, totalBudget - totalIncome);
                        
                        return (
                            <div 
                                key={client.id}
                                className="group bg-surface p-5 rounded-xl border border-white/5 hover:border-primary/30 transition-all shadow-lg hover:shadow-xl hover:shadow-primary/5 flex flex-col h-full relative overflow-hidden"
                            >
                                {/* Alerts & Badges */}
                                <div className="absolute top-0 right-0 p-2 flex flex-col gap-1 items-end">
                                    {isRegisteredUser && (
                                        <div className="bg-emerald-500/10 text-emerald-400 p-1.5 rounded-md border border-emerald-500/20" title="Usuário Cadastrado no Sistema">
                                            <UserCheck size={14} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-start gap-4 mb-4">
                                    <ClientAvatar seed={client.avatar} size="w-14 h-14" className="shrink-0 ring-2 ring-white/5" />
                                    <div className="min-w-0 flex-1 pt-1">
                                        <h3 className="text-lg font-bold text-white truncate group-hover:text-primary transition-colors pr-6">
                                            {client.name}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-xs text-text-muted mt-1 truncate">
                                            <Mail size={12} />
                                            <span className="truncate">{client.email}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-4 flex-1">
                                    {client.phone && (
                                        <div className="flex items-center gap-2 text-xs text-gray-400 bg-black/20 p-2 rounded-lg">
                                            <Phone size={12} className="text-text-muted" />
                                            {client.phone}
                                        </div>
                                    )}
                                    
                                    {client.projects && client.projects.length > 0 ? (
                                        <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Projetos Ativos</span>
                                                <div className="flex gap-1">
                                                    {unreadComments > 0 && (
                                                        <span className="text-xs font-bold text-white bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-400 flex items-center gap-1" title="Novos Comentários">
                                                            <MessageCircle size={10} /> {unreadComments}
                                                        </span>
                                                    )}
                                                    <span className="text-xs font-bold text-white bg-primary/20 px-1.5 py-0.5 rounded text-primary">
                                                        {client.projects.length}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                {client.projects.map(pc => (
                                                    <Link 
                                                        key={pc.project.id} 
                                                        href={`/admin/projects/${pc.project.id}`} 
                                                        className="text-xs text-gray-300 hover:text-primary transition-colors truncate flex items-center gap-1.5"
                                                    >
                                                        <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                                                        {pc.project.name}
                                                    </Link>
                                                ))}
                                            </div>
                                            
                                            {totalBudget > 0 && (
                                                <div className="mt-2 pt-2 border-t border-white/5 flex flex-col gap-1">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-text-muted">Total Investido</span>
                                                        <span className="text-emerald-400 font-bold">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBudget)}
                                                        </span>
                                                    </div>
                                                    {remainingBalance > 0 && (
                                                        <div className="flex justify-between items-center text-xs bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                                                            <span className="text-amber-400/80 font-medium flex items-center gap-1">
                                                                <AlertCircle size={10} /> A Receber
                                                            </span>
                                                            <span className="text-amber-400 font-bold">
                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(remainingBalance)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-white/5 rounded-lg p-4 text-center border border-dashed border-white/10">
                                            <p className="text-xs text-text-muted">Nenhum projeto vinculado</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto pt-3 border-t border-white/5 flex justify-between items-center text-xs text-text-muted">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={12} />
                                        {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                                    </div>
                                    <Link 
                                        href={`/admin/clients/${client.id}`}
                                        className="group-hover:translate-x-1 transition-transform text-primary flex items-center gap-1 font-medium"
                                    >
                                        Detalhes <ArrowRight size={12} />
                                    </Link>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </main>
    );
}
