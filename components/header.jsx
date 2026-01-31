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
                <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436A6.75 6.75 0 019.75 22.5a.75.75 0 01-.75-.75v-4.131A15.838 15.838 0 016.382 15H2.25a.75.75 0 01-.75-.75 6.75 6.75 0 017.815-6.666zM15 6.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" clipRule="evenodd" />
                        <path d="M5.26 17.242a.75.75 0 10-.897-1.203 5.243 5.243 0 00-2.05 5.022.75.75 0 00.625.627 5.243 5.243 0 005.022-2.051.75.75 0 10-1.202-.897 3.744 3.744 0 01-3.008 1.51c0-1.23.592-2.323 1.51-3.008z" />
                    </svg>
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">TDJ Studio</span>
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
