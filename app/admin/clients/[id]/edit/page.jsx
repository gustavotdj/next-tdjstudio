import { db } from 'db/index';
import { clients } from 'db/schema';
import { eq } from 'drizzle-orm';
import { updateClient } from 'app/actions/client-actions';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DeleteClientButton from '../../_components/delete-client-button';
import AvatarPicker from 'components/ui/AvatarPicker';

export default async function EditClientPage({ params }) {
    const { id } = await params;
    
    const client = await db.query.clients.findFirst({
        where: eq(clients.id, id),
    });

    if (!client) {
        notFound();
    }

    return (
        <main className="w-full max-w-2xl mx-auto p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link 
                    href={`/admin/clients/${id}`} 
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                    ←
                </Link>
                <h1 className="text-3xl font-bold text-white">Editar Cliente</h1>
            </div>

            <form action={updateClient.bind(null, id)} className="space-y-6 bg-surface p-8 rounded-xl border border-white/5">
                <div className="space-y-2">
                    <label className="text-sm text-gray-400">Avatar</label>
                    <AvatarPicker initialValue={client.avatar} clientName={client.name} />
                </div>

                <div className="space-y-2">
                    <label htmlFor="name" className="text-sm text-gray-400">Nome do Cliente</label>
                    <input 
                        type="text" 
                        name="name" 
                        id="name"
                        defaultValue={client.name}
                        required
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="email" className="text-sm text-gray-400">E-mail</label>
                    <input 
                        type="email" 
                        name="email" 
                        id="email"
                        defaultValue={client.email || ''}
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm text-gray-400">Telefone / WhatsApp</label>
                    <input 
                        type="text" 
                        name="phone" 
                        id="phone"
                        defaultValue={client.phone || ''}
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                </div>

                <div className="pt-4 flex justify-between items-center">
                    <DeleteClientButton clientId={id} />
                    
                    <div className="flex gap-3">
                        <Link 
                            href={`/admin/clients/${id}`}
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
