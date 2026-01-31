import { AdminHeader } from './_components/header';
import { Footer } from 'components/footer';

export default function AdminLayout({ children }) {
    return (
        <div className="min-h-screen flex flex-col">
            <AdminHeader />
            <div className="flex-1 flex flex-col">
                {children}
            </div>
            <Footer />
        </div>
    );
}