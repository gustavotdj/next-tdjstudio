import { db } from 'db/index';
import { projects, clients } from 'db/schema';
import { eq } from 'drizzle-orm';
import { updateProject } from 'app/actions/project-actions';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DeleteProjectButton from '../../_components/delete-project-button';
import { Calculator } from 'lucide-react';

export default async function EditProjectPage({ params }) {
    const { id } = await params;
    
    const project = await db.query.projects.findFirst({
        where: eq(projects.id, id),
        with: {
            clients: true
        }
    });

    if (!project) {
        notFound();
    }

    const allClients = await db.query.clients.findMany();
    
    // Get array of associated client IDs
    const associatedClientIds = project.clients.map(pc => pc.clientId);
    
    // Include legacy clientId if present (backward compatibility)
    if (project.clientId && !associatedClientIds.includes(project.clientId)) {
        associatedClientIds.push(project.clientId);
    }

    return (
        <main className="w-full max-w-2xl mx-auto p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link 
                    href={`/admin/projects/${id}`} 
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                    ←
                </Link>
                <h1 className="text-3xl font-bold text-white">Editar Projeto</h1>
            </div>

            <form action={updateProject.bind(null, id)} className="space-y-6 bg-surface p-8 rounded-xl border border-white/5">
                <div className="space-y-2">
                    <label htmlFor="name" className="text-sm text-gray-400">Nome do Projeto</label>
                    <input 
                        type="text" 
                        name="name" 
                        id="name"
                        defaultValue={project.name}
                        required
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="description" className="text-sm text-gray-400">Descrição</label>
                    <textarea 
                        name="description" 
                        id="description"
                        defaultValue={project.description || ''}
                        rows={4}
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Budget Section Callout */}
                    <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 border border-emerald-500/20 rounded-lg p-6 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <Calculator size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold mb-1">Gestão Financeira</h3>
                                <div className="text-sm text-gray-400">
                                    <span className="block">Orçamento Atual: <strong className="text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.budget?.total || 0)}</strong></span>
                                    <span className="text-xs">Para editar valores e itens, acesse o painel financeiro.</span>
                                </div>
                            </div>
                        </div>
                        <Link 
                            href={`/admin/budgets/${id}`}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors whitespace-nowrap"
                        >
                            Gerenciar Orçamento
                        </Link>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="status" className="text-sm text-gray-400">Status</label>
                        <select 
                            name="status" 
                            id="status"
                            defaultValue={project.status}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                        >
                            <option value="active">Em Andamento</option>
                            <option value="completed">Concluído</option>
                            <option value="archived">Arquivado</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400 block mb-2">Clientes Responsáveis</label>
                        <div className="bg-black/20 border border-white/10 rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                            {allClients.length > 0 ? (
                                allClients.map(client => (
                                    <label key={client.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded transition-colors cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            name="clientIds" 
                                            value={client.id}
                                            defaultChecked={associatedClientIds.includes(client.id)}
                                            className="w-4 h-4 rounded border-white/20 bg-black/40 text-primary focus:ring-primary/50"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm text-white font-medium">{client.name}</span>
                                            <span className="text-xs text-text-muted">{client.email}</span>
                                        </div>
                                    </label>
                                ))
                            ) : (
                                <p className="text-sm text-text-muted text-center py-2">Nenhum cliente cadastrado.</p>
                            )}
                        </div>
                        <p className="text-xs text-text-muted">Selecione um ou mais clientes que terão acesso a este projeto.</p>
                    </div>
                </div>

                <div className="pt-4 flex justify-between items-center">
                    <DeleteProjectButton projectId={id} />
                    
                    <div className="flex gap-3">
                        <Link 
                            href={`/admin/projects/${id}`}
                            className="px-6 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-gray-300"
                        >
                            Cancelar
                        </Link>
                        <button 
                            type="submit"
                            className="px-6 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg font-medium transition-colors"
                        >
                            Salvar Alterações
                        </button>
                    </div>
                </div>
            </form>
        </main>
    );
}
