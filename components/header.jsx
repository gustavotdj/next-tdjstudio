'use client';

import Link from 'next/link';
import { AuthButton } from './auth-button';
import { useSession } from 'next-auth/react';

export function Header() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.role !== 'client';

    const navItems = [
        { linkText: 'Dashboard', href: '/dashboard', requiredAdmin: true },
        { linkText: 'Clientes', href: '/clients', requiredAdmin: true },
        { linkText: 'Projetos', href: '/projects', requiredAdmin: false },
    ];

    return (
        <nav className="flex flex-wrap items-center gap-4 py-6 px-4 md:px-8 border-b border-surface bg-background/50 backdrop-blur-md sticky top-0 z-50">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white tracking-tight group">
                <div className="w-9 h-9 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <img src="/icone-tdj.png" alt="TDJs Logo" className="w-full h-full object-contain" />
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">TDJs</span>
            </Link>
            
            <ul className="flex flex-wrap gap-x-8 gap-y-2 ml-8">
                {navItems.map((item, index) => {
                    if (item.requiredAdmin && !isAdmin) return null;
                    
                    return (
                        <li key={index}>
                            <Link 
                                href={item.href} 
                                className="inline-flex py-2 text-sm font-medium text-text-muted hover:text-primary transition-colors relative group"
                            >
                                {item.linkText}
                                <span className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-primary/0 via-primary/70 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                            </Link>
                        </li>
                    );
                })}
            </ul>

            <div className="ml-auto flex items-center gap-4">
                <AuthButton />
            </div>
        </nav>
    );
}
