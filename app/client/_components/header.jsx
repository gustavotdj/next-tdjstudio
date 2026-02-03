'use client';

import Link from 'next/link';
import { AuthButton } from 'components/auth-button';

export function ClientHeader() {
    return (
        <nav className="flex flex-wrap items-center gap-4 py-6 px-4 md:px-8 border-b border-surface bg-background/50 backdrop-blur-md sticky top-0 z-50">
            <Link href="/client/dashboard" className="flex items-center gap-2 font-bold text-xl text-white tracking-tight group">
                <div className="w-9 h-9 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <img src="/icone-tdj.png" alt="TDJs Logo" className="w-full h-full object-contain" />
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">TDJs</span>
            </Link>
            
            <div className="ml-8 flex items-center gap-6">
                <Link href="/client/dashboard" className="text-sm font-medium text-text-muted hover:text-white transition-colors">
                    Dashboard
                </Link>
                <Link href="/client/projects" className="text-sm font-medium text-text-muted hover:text-white transition-colors">
                    Projetos
                </Link>
                <Link href="/client/budgets" className="text-sm font-medium text-text-muted hover:text-white transition-colors">
                    Orçamentos
                </Link>
            </div>

            <div className="ml-auto flex items-center gap-4">
                <AuthButton />
            </div>
        </nav>
    );
}