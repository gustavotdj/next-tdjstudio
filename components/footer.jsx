import Link from 'next/link';

export function Footer() {
    return (
        <footer className="pt-16 pb-12 sm:pt-24 sm:pb-16 border-t border-white/5 mt-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-text-muted">
                    &copy; {new Date().getFullYear()} TDJs. All rights reserved.
                </p>
                <p className="text-sm text-text-muted flex items-center gap-1">
                    Powered by <span className="text-white font-semibold">Next.js</span> & <span className="text-white font-semibold">Neon</span>
                </p>
            </div>
        </footer>
    );
}
