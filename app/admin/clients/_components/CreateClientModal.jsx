'use client';

import { useState } from 'react';
import { createClient } from 'app/actions/client-actions';
import { Plus, X, User } from 'lucide-react';
import AvatarPicker from 'components/ui/AvatarPicker';

export function CreateClientModal() {
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-lg shadow-primary/20"
            >
                <Plus size={18} />
                Novo Cliente
            </button>
        );
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998] transition-opacity" onClick={() => setIsOpen(false)} />
            
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-surface w-full max-w-lg rounded-xl shadow-2xl border border-white/10 pointer-events-auto flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(255,107,0,0.2)]">
                                <User size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-white">Novo Cliente</h2>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-text-muted hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto">
                        <form action={async (formData) => {
                            await createClient(formData);
                            setIsOpen(false);
                        }} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Avatar</label>
                                <AvatarPicker />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Nome da Empresa/Cliente</label>
                                <input 
                                    name="name" 
                                    required 
                                    type="text" 
                                    autoFocus
                                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-500 transition-all text-sm"
                                    placeholder="Ex: Tech Solutions Ltda"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Email Principal</label>
                                <input 
                                    name="email" 
                                    required 
                                    type="email" 
                                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-500 transition-all text-sm"
                                    placeholder="contato@empresa.com"
                                />
                                <p className="text-xs text-text-muted mt-1.5 flex items-center gap-1">
                                    <span>ℹ️</span> Este email será usado para login do cliente.
                                </p>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Telefone (Opcional)</label>
                                <input 
                                    name="phone" 
                                    type="text" 
                                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-500 transition-all text-sm"
                                    placeholder="(11) 99999-9999"
                                />
                            </div>
                            
                            <button 
                                type="submit" 
                                className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary/90 transition-all font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center gap-2 mt-4 group"
                            >
                                <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                Cadastrar Cliente
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
