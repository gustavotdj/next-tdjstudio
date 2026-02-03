'use client';

import { useState } from 'react';
import { createProject } from 'app/actions/project-actions';
import { Plus, X } from 'lucide-react';
import Link from 'next/link';

export function CreateProjectModal({ allClients }) {
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-lg shadow-primary/20"
            >
                <Plus size={18} />
                Novo Projeto
            </button>
        );
    }

    return (
        <>
            {/* Trigger Button - hidden when open but kept for layout stability if needed, or we can just render the modal portal */}
            
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998] transition-opacity" onClick={() => setIsOpen(false)} />
            
            {/* Modal */}
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-surface w-full max-w-lg rounded-xl shadow-2xl border border-white/10 pointer-events-auto flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(255,107,0,0.2)]">
                                <Plus size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-white">Novo Projeto</h2>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-text-muted hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto">
                        <form action={async (formData) => {
                            await createProject(formData);
                            setIsOpen(false);
                        }} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Nome do Projeto</label>
                                <input 
                                    name="name" 
                                    required 
                                    type="text" 
                                    autoFocus
                                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-500 transition-all text-sm"
                                    placeholder="Ex: Website Redesign"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Clientes Responsáveis</label>
                                <div className="bg-black/20 border border-white/10 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                    {allClients.length > 0 ? (
                                        allClients.map(client => (
                                            <label key={client.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-md transition-colors cursor-pointer group">
                                                <input 
                                                    type="checkbox" 
                                                    name="clientIds" 
                                                    value={client.id}
                                                    className="w-4 h-4 rounded border-white/20 bg-black/40 text-primary focus:ring-primary/50 cursor-pointer"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors font-medium">{client.name}</span>
                                                </div>
                                            </label>
                                        ))
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-xs text-text-muted mb-2">Nenhum cliente cadastrado.</p>
                                            <Link href="/admin/clients" className="text-xs text-primary hover:underline">
                                                Cadastrar Clientes
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Descrição</label>
                                <textarea 
                                    name="description" 
                                    rows="4"
                                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-500 transition-all resize-none text-sm"
                                    placeholder="Detalhes principais do escopo e objetivos..."
                                ></textarea>
                            </div>
                            
                            <button 
                                type="submit" 
                                className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary/90 transition-all font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center gap-2 mt-2 group"
                            >
                                <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                Criar Projeto
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
