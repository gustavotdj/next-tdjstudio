'use client';

import { createPortal } from 'react-dom';
import { X, Calendar, ArrowRight, MessageSquare, Paperclip } from 'lucide-react';
import Link from 'next/link';

export default function TaskPreviewModal({ 
    isOpen, 
    onClose, 
    task, 
    projectName, 
    subProjectName,
    projectId
}) {
    if (!isOpen || !task) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-surface border border-white/10 rounded-xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-start bg-white/5 rounded-t-xl">
                    <div>
                        <div className="text-xs text-primary font-bold uppercase tracking-wider mb-2">
                            {projectName} › {subProjectName}
                        </div>
                        <h2 className="text-xl font-bold text-white leading-tight">
                            {task.text}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-white p-1">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Description */}
                    <div className="bg-white/5 rounded-lg p-4 text-gray-300 text-sm whitespace-pre-wrap min-h-[80px] border border-white/5">
                        {task.description || "Nenhuma descrição disponível."}
                    </div>

                    {/* Meta Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/[0.02] p-3 rounded-lg border border-white/5">
                            <span className="text-[10px] text-text-muted uppercase font-bold block mb-1">Status</span>
                            <span className={`text-sm font-medium ${task.completed ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                {task.completed ? 'Concluído' : 'Em andamento'}
                            </span>
                        </div>
                        <div className="bg-white/[0.02] p-3 rounded-lg border border-white/5">
                            <span className="text-[10px] text-text-muted uppercase font-bold block mb-1">Entrega</span>
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <Calendar size={14} className="text-primary" />
                                {task.dueDate 
                                    ? new Date(task.dueDate).toLocaleDateString('pt-BR') 
                                    : 'Sem data'
                                }
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 text-sm text-text-muted">
                        <div className="flex items-center gap-1.5">
                            <Paperclip size={14} /> {(task.attachments || []).length} anexos
                        </div>
                        <div className="flex items-center gap-1.5">
                            <MessageSquare size={14} /> {(task.comments || []).length} comentários
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-white/5 rounded-b-xl flex justify-end">
                    <Link 
                        href={`/admin/projects/${projectId}`} 
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-primary/20"
                    >
                        Abrir Projeto <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </div>,
        document.body
    );
}
