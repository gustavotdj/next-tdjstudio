import { db } from 'db/index';
import { users, clients } from 'db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Image from 'next/image';

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/api/auth/signin');
    }

    const isClient = session.user.role === 'client' || !!(await db.query.clients.findFirst({
        where: eq(clients.email, session.user.email)
    }));

    if (isClient) {
        redirect('/client/projects');
    }

    const allUsers = await db.select().from(users);

    return (
        <main className="w-full px-6 py-8">
            <div className="flex justify-between items-center mb-10">
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <div className="text-sm text-text-muted flex items-center gap-2">
                    Logado como: <span className="font-semibold text-primary">{session.user.email}</span>
                    <span className="text-xs bg-white/10 px-2 py-1 rounded border border-white/5 uppercase tracking-wider">{session.user.role || 'user'}</span>
                </div>
            </div>

            <div className="bg-surface rounded-xl shadow-lg border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">Usuários Cadastrados ({allUsers.length})</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-6 py-4 font-medium text-text-muted uppercase tracking-wider text-xs">Usuário</th>
                                <th className="px-6 py-4 font-medium text-text-muted uppercase tracking-wider text-xs">Email</th>
                                <th className="px-6 py-4 font-medium text-text-muted uppercase tracking-wider text-xs">Role</th>
                                <th className="px-6 py-4 font-medium text-text-muted uppercase tracking-wider text-xs">ID</th>
                                <th className="px-6 py-4 font-medium text-text-muted uppercase tracking-wider text-xs">Data Cadastro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {allUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {user.image ? (
                                                <Image 
                                                    src={user.image} 
                                                    alt={user.name || 'User'} 
                                                    width={32} 
                                                    height={32} 
                                                    className="rounded-full ring-2 ring-primary/20"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                                                    {user.name?.[0] || '?'}
                                                </div>
                                            )}
                                            <span className="font-medium text-white">{user.name || 'Sem nome'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-text-muted">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                            user.role === 'admin' 
                                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        }`}>
                                            {user.role || 'user'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{user.id.substring(0, 8)}...</td>
                                    <td className="px-6 py-4 text-gray-500">
                                        -
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}
