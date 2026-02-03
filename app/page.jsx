import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/route';
import { AuthButton } from '../components/auth-button';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

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
            redirect('/client/dashboard');
        } else {
            redirect('/admin/dashboard');
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>
            <div className="z-10 text-center p-8 max-w-md w-full bg-surface/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                <div className="w-24 h-24 mx-auto mb-8 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <img src="/icone-tdj.png" alt="TDJs Logo" className="w-full h-full object-contain drop-shadow-2xl" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">TDJs</h1>
                
                {error && (
                    <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-left overflow-auto max-h-60">
                        <p className="font-bold mb-1">Erro de Inicialização:</p>
                        <p className="mb-2">{error}</p>
                        <p className="text-xs opacity-70 mb-3">Verifique as variáveis de ambiente (NEXTAUTH_SECRET, DATABASE_URL) no painel do Netlify.</p>
                        <a 
                            href="/api/debug/db" 
                            target="_blank"
                            className="inline-block px-3 py-1 bg-red-500/30 hover:bg-red-500/50 rounded text-xs text-white font-bold transition-colors"
                        >
                            Verificar Diagnóstico →
                        </a>
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