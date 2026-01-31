'use client';

import { useState } from 'react';
import { deleteClient } from 'app/actions/client-actions';
import { Trash2, Loader2 } from 'lucide-react';

export default function DeleteClientButton({ clientId }) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!window.confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
            return;
        }

        setIsDeleting(true);
        try {
            await deleteClient(clientId);
        } catch (error) {
            alert('Erro ao excluir cliente: ' + error.message);
            setIsDeleting(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
            {isDeleting ? (
                <Loader2 size={16} className="animate-spin" />
            ) : (
                <Trash2 size={16} />
            )}
            Excluir Cliente
        </button>
    );
}
