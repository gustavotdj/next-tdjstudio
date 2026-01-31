'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteTransaction } from 'app/actions/finance-actions';
import { Trash2, Loader2 } from 'lucide-react';

export default function DeleteTransactionButton({ id }) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.')) return;

        setIsDeleting(true);
        try {
            await deleteTransaction(id);
            // Router refresh is handled by the server action revalidatePath, 
            // but we call it here to ensure client state updates if needed
            router.refresh(); 
        } catch (error) {
            alert('Erro ao excluir transação: ' + error.message);
            setIsDeleting(false);
        }
    };

    return (
        <button 
            onClick={handleDelete} 
            disabled={isDeleting}
            className="text-text-muted hover:text-red-400 transition-colors p-2 hover:bg-red-400/10 rounded-lg"
            title="Excluir transação"
        >
            {isDeleting ? (
                <Loader2 size={18} className="animate-spin" />
            ) : (
                <Trash2 size={18} />
            )}
        </button>
    );
}
