'use client';

import Link from 'next/link';
import { AuthButton } from 'components/auth-button';

export function AdminHeader() {
    const navItems = [
        { linkText: 'Dashboard', href: '/admin/dashboard' },
        { linkText: 'Clientes', href: '/admin/clients' },
        { linkText: 'Projetos', href: '/admin/projects' },
        { linkText: 'Arquivos', href: '/admin/files' },
        { linkText: 'Orçamentos', href: '/admin/budgets' },
        { linkText: 'Financeiro', href: '/admin/finance' },
    ];

    return (
        <nav className="flex flex-wrap items-center gap-4 py-6 px-4 md:px-8 border-b border-surface bg-background/50 backdrop-blur-md sticky top-0 z-50">
            <Link href="/admin/dashboard" className="flex items-center gap-2 font-bold text-xl text-white tracking-tight group">
                <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform">
                    <span className="text-xs font-black">ADMIN</span>
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">TDJ Admin</span>
            </Link>
            
            <ul className="flex flex-wrap gap-x-8 gap-y-2 ml-8">
                {navItems.map((item, index) => (
                    <li key={index}>
                        <Link 
                            href={item.href} 
                            className="inline-flex py-2 text-sm font-medium text-text-muted hover:text-primary transition-colors relative group"
                        >
                            {item.linkText}
                            <span className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-primary/0 via-primary/70 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                        </Link>
                    </li>
                ))}
            </ul>

            <div className="ml-auto flex items-center gap-4">
                <AuthButton />
            </div>
        </nav>
    );
}