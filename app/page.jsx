import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/route';
import { AuthButton } from '../components/auth-button';
import { redirect } from 'next/navigation';

export default async function Page() {
    let session = null;
    let error = null;

    try {
        session = await getServerSession(authOptions);
    } catch (e) {
        console.error("Error fetching session:", e);
        error = e.message;
    }

    if (session) {
        if (session.user.role === 'client') {
            redirect('/client/projects');
        } else {
            redirect('/admin/dashboard');
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>
            <div className="z-10 text-center p-8 max-w-md w-full bg-surface/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg shadow-primary/30 mx-auto mb-8">
                    ⚡
                </div>
                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">TDJ Studio</h1>
                
                {error && (
                    <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-left overflow-auto max-h-40">
                        <p className="font-bold mb-1">Erro de Inicialização:</p>
                        <p>{error}</p>
                        <p className="mt-2 text-xs opacity-70">Verifique as variáveis de ambiente (NEXTAUTH_SECRET, DATABASE_URL) no painel do Netlify.</p>
                    </div>
                )}

                <p className="text-text-muted mb-8 text-sm leading-relaxed">
                    Plataforma exclusiva para gestão de projetos e clientes.
                    Acesso restrito a usuários autorizados.
                </p>
                <div className="flex justify-center">
                    <AuthButton />
                </div>
            </div>
        </div>
    );
}