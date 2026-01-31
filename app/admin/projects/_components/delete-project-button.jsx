'use client';

import { useState } from 'react';
import { deleteProject } from 'app/actions/project-actions';
import { Trash2, Loader2 } from 'lucide-react';

export default function DeleteProjectButton({ projectId }) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!window.confirm('Tem certeza que deseja excluir este projeto? Esta ação excluirá todos os subprojetos e transações vinculadas e não pode ser desfeita.')) {
            return;
        }

        setIsDeleting(true);
        try {
            await deleteProject(projectId);
        } catch (error) {
            alert('Erro ao excluir projeto: ' + error.message);
            setIsDeleting(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
            {isDeleting ? (
                <Loader2 size={16} className="animate-spin" />
            ) : (
                <Trash2 size={16} />
            )}
            Excluir Projeto
        </button>
    );
}
