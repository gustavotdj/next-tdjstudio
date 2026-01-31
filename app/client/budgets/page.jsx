import { db } from 'db/index';
import { projects, clients } from 'db/schema';
import { eq, desc } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Folder, ArrowRight, Clock } from 'lucide-react';

export default async function ClientBudgetsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/api/auth/signin');

    const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.email, session.user.email),
        with: {
            projects: {
                with: {
                    project: true
                }
            }
        }
    });

    if (!clientRecord) {
        if (session.user.role === 'admin') redirect('/admin/budgets');
        return (
            <main className="w-full px-6 py-12 text-center">
                <h1 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h1>
                <p className="text-text-muted">Não encontramos um registro de cliente vinculado ao seu email.</p>
            </main>
        );
    }

    const myProjects = clientRecord.projects.map(pc => pc.project);

    return (
        <main className="w-full px-6 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Meus Orçamentos</h1>
                    <p className="text-text-muted mt-1">Selecione um projeto para ver o detalhamento financeiro.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myProjects.length === 0 ? (
                    <div className="col-span-full bg-surface p-12 text-center rounded-xl border border-white/5 text-text-muted">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">💰</div>
                        <h3 className="text-lg font-medium text-white mb-1">Nenhum orçamento disponível</h3>
                        <p>Você ainda não possui projetos com orçamentos cadastrados.</p>
                    </div>
                ) : (
                    myProjects.map((project) => (
                        <Link 
                            key={project.id} 
                            href={`/client/budgets/${project.id}`}
                            className="group bg-surface hover:bg-white/5 rounded-2xl border border-white/5 hover:border-primary/30 transition-all p-6 flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <Folder size={20} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Status</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                            project.status === 'active' 
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                            : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                        }`}>
                                            {project.status === 'active' ? 'Ativo' : project.status}
                                        </span>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors mb-2 line-clamp-1">
                                    {project.name}
                                </h3>
                                
                                <div className="flex items-center gap-2 text-text-muted text-[10px] mb-6">
                                    <Clock size={10} />
                                    Última atualização: {new Date(project.updatedAt).toLocaleDateString('pt-BR')}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Total Aprovado</p>
                                    <p className="text-xl font-black text-emerald-400">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.budget?.total || 0)}
                                    </p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white group-hover:bg-primary group-hover:text-white transition-all">
                                    <ArrowRight size={16} />
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </main>
    );
}
