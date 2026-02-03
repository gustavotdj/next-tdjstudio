import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import FileManager from 'components/admin/FileManager';
import Link from 'next/link';
import { db } from 'db/index';
import { projects, subProjects } from 'db/schema';
import { desc } from 'drizzle-orm';

export const metadata = {
    title: 'Gerenciador de Arquivos | Admin',
};

export default async function AdminFilesPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
        redirect('/api/auth/signin');
    }

    // Fetch all projects and subprojects to build context map
    const allProjects = await db.query.projects.findMany({
        with: {
            subProjects: true
        }
    });

    // Flatten data for FileManager
    const allProjectFiles = allProjects.flatMap(p => 
        (p.files || []).map(f => ({ ...f, projectId: p.id, projectName: p.name }))
    );

    const allSubProjects = allProjects.flatMap(p => 
        (p.subProjects || []).map(sp => ({ ...sp, projectId: p.id, projectName: p.name }))
    );

    return (
        <main className="w-full px-6 py-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Gerenciador de Arquivos</h1>
                    <p className="text-text-muted">
                        Visualize e gerencie todos os arquivos do sistema (bucket R2).
                    </p>
                </div>
                <Link href="/admin/dashboard" className="text-sm text-primary hover:underline">
                    Voltar ao Dashboard
                </Link>
            </div>

            <FileManager 
                initialPath="" 
                title="Todos os Arquivos" 
                projectFiles={allProjectFiles}
                projectSubProjects={allSubProjects}
            />
        </main>
    );
}
