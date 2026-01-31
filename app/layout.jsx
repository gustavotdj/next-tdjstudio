import '../styles/globals.css';
import { AuthProvider } from '../components/auth-provider';

export const metadata = {
    title: {
        template: '%s | TDJ Studio',
        default: 'TDJ Studio'
    }
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/favicon.svg" sizes="any" />
            </head>
            <body className="antialiased bg-background text-text-primary">
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}