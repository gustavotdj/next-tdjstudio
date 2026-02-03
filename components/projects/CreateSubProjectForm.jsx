'use client';

import { createSubProject } from 'app/actions/project-actions';

export default function CreateSubProjectForm({ projectId }) {
    return (
        <form 
            action={createSubProject.bind(null, projectId)} 
            className="flex gap-2" 
            onClick={e => e.stopPropagation()}
        >
            <input 
                name="name" 
                type="text" 
                placeholder="Novo Sub-projeto" 
                className="px-3 py-1.5 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-500 text-sm w-48"
                required
            />
            <button type="submit" className="text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
                + Criar
            </button>
        </form>
    );
}
