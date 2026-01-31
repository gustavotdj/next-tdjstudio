'use client';

import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";

export function AuthButton() {
    const { data: session } = useSession();

    if (session) {
        return (
            <div className="flex items-center gap-4">
                {session.user.image && (
                    <Image
                        src={session.user.image}
                        alt={session.user.name}
                        width={32}
                        height={32}
                        className="rounded-full shadow-md border border-white/20"
                    />
                )}
                <div className="flex flex-col items-start text-xs">
                    <span className="font-bold opacity-90">{session.user.name}</span>
                    <button
                        onClick={() => signOut()}
                        className="text-red-400 hover:text-red-300 transition-colors"
                    >
                        Sair
                    </button>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={() => signIn('google')}
            className="btn btn-sm bg-white text-blue-900 hover:bg-white/90"
        >
            Entrar com Google
        </button>
    );
}
