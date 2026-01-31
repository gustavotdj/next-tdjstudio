import { ClientHeader } from './_components/header';
import { Footer } from 'components/footer';

export default function ClientLayout({ children }) {
    return (
        <div className="min-h-screen flex flex-col">
            <ClientHeader />
            <div className="flex-1 flex flex-col">
                {children}
            </div>
            <Footer />
        </div>
    );
}