'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTransaction, updateTransaction, deleteTransaction } from 'app/actions/finance-actions';
import { 
    DollarSign, 
    Calendar, 
    Tag, 
    FileText, 
    Briefcase, 
    User, 
    Loader2,
    CheckCircle2,
    AlertCircle,
    Trash2
} from 'lucide-react';

export default function TransactionForm({ 
    projects = [], 
    clients = [],
    initialProjectId = '',
    initialSubProjectId = '',
    initialSubProjectItemId = '',
    initialData = null
}) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState(null);

    const isEdit = !!initialData;

    const [formData, setFormData] = useState({
        description: initialData?.description || '',
        amount: initialData?.amount ? (initialData.amount / 100).toString() : '',
        type: initialData?.type || 'income',
        category: initialData?.category || 'Serviço',
        projectId: initialData?.projectId || initialProjectId,
        subProjectId: initialData?.subProjectId || initialSubProjectId,
        subProjectItemId: initialData?.subProjectItemId || initialSubProjectItemId,
        clientId: initialData?.clientId || '',
        date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: initialData?.status || 'completed'
    });

    const selectedProject = projects.find(p => p.id === formData.projectId);
    const subProjects = selectedProject?.subProjects || [];
    const selectedSubProject = subProjects.find(sp => sp.id === formData.subProjectId);
    
    // Get stages from subproject content
    const subProjectStages = selectedSubProject?.content?.stages || [];

    const categories = [
        'Serviço',
        'Material',
        'Imposto',
        'Pro-labore',
        'Aluguel',
        'Software/SaaS',
        'Marketing',
        'Equipamento',
        'Outros'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        try {
            if (isEdit) {
                await updateTransaction(initialData.id, formData);
            } else {
                await createTransaction(formData);
            }
            router.push('/admin/finance');
            router.refresh();
        } catch (err) {
            setError(err.message);
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Tem certeza que deseja excluir esta transação?')) return;
        
        setIsDeleting(true);
        setError(null);

        try {
            await deleteTransaction(initialData.id);
            router.push('/admin/finance');
            router.refresh();
        } catch (err) {
            setError(err.message);
            setIsDeleting(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Type Selection */}
                <div className="col-span-full">
                    <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Tipo de Transação</label>
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, type: 'income' }))}
                            className={`flex-1 p-4 rounded-xl border transition-all flex items-center justify-center gap-3 ${
                                formData.type === 'income' 
                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10' 
                                : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20'
                            }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.type === 'income' ? 'bg-emerald-500 text-white' : 'bg-white/10'}`}>
                                <DollarSign size={16} />
                            </div>
                            <span className="font-bold">Entrada / Receita</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
                            className={`flex-1 p-4 rounded-xl border transition-all flex items-center justify-center gap-3 ${
                                formData.type === 'expense' 
                                ? 'bg-red-500/10 border-red-500/50 text-red-400 shadow-lg shadow-red-500/10' 
                                : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20'
                            }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.type === 'expense' ? 'bg-red-500 text-white' : 'bg-white/10'}`}>
                                <DollarSign size={16} />
                            </div>
                            <span className="font-bold">Saída / Despesa</span>
                        </button>
                    </div>
                </div>

                {/* Description */}
                <div className="col-span-full">
                    <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                        <FileText size={14} className="text-primary" /> Descrição
                    </label>
                    <input
                        type="text"
                        name="description"
                        required
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Ex: Pagamento Parcela 01 - Projeto X"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                        <DollarSign size={14} className="text-primary" /> Valor (R$)
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-mono">R$</span>
                        <input
                            type="number"
                            step="0.01"
                            name="amount"
                            required
                            value={formData.amount}
                            onChange={handleChange}
                            placeholder="0,00"
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                        />
                    </div>
                </div>

                {/* Date */}
                <div>
                    <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Calendar size={14} className="text-primary" /> Data
                    </label>
                    <input
                        type="date"
                        name="date"
                        required
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                </div>

                {/* Category */}
                <div>
                    <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Tag size={14} className="text-primary" /> Categoria
                    </label>
                    <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none"
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat} className="bg-surface text-white">{cat}</option>
                        ))}
                    </select>
                </div>

                {/* Status */}
                <div>
                    <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-primary" /> Status
                    </label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none"
                    >
                        <option value="completed" className="bg-surface text-white">Efetivado / Pago</option>
                        <option value="pending" className="bg-surface text-white">Pendente / Agendado</option>
                    </select>
                </div>

                {/* Project Relation */}
                <div className={formData.projectId ? 'md:col-span-1' : 'col-span-full md:col-span-1'}>
                    <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Briefcase size={14} className="text-primary" /> Vincular a Projeto (Opcional)
                    </label>
                    <div className="space-y-4">
                        <select
                            name="projectId"
                            value={formData.projectId}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFormData(prev => ({ ...prev, projectId: val, subProjectId: '', subProjectItemId: '' }));
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none"
                        >
                            <option value="" className="bg-surface text-white">Nenhum projeto</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id} className="bg-surface text-white">{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* SubProject Relation - Only shown if project is selected */}
                {formData.projectId && (
                    <div className="space-y-4 col-span-full md:col-span-1">
                        <div>
                            <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Tag size={14} className="text-primary" /> Subprojeto (Opcional)
                            </label>
                            <select
                                name="subProjectId"
                                value={formData.subProjectId}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData(prev => ({ ...prev, subProjectId: val, subProjectItemId: '' }));
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none"
                            >
                                <option value="" className="bg-surface text-white">Projeto Geral (Sem subprojeto)</option>
                                {subProjects.map(sp => (
                                    <option key={sp.id} value={sp.id} className="bg-surface text-white">{sp.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* SubProject Item/Stage Relation - Only shown if subproject is selected and has stages */}
                        {formData.subProjectId && subProjectStages.length > 0 && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Tag size={14} className="text-primary/70" /> Etapa/Item do Subprojeto
                                </label>
                                <select
                                    name="subProjectItemId"
                                    value={formData.subProjectItemId}
                                    onChange={handleChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none"
                                >
                                    <option value="" className="bg-surface text-white">Nenhuma etapa específica</option>
                                    {subProjectStages.map(stage => (
                                        <optgroup key={stage.id} label={stage.name} className="bg-surface text-primary/70 font-bold not-italic">
                                            <option value={stage.id} className="bg-surface text-white font-normal italic">— Vincular à Etapa Inteira</option>
                                            {stage.items?.map(item => (
                                                <option key={item.id} value={item.id} className="bg-surface text-white font-normal">— {item.text}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {/* Client Relation */}
                <div>
                    <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                        <User size={14} className="text-primary" /> Vincular a Cliente (Opcional)
                    </label>
                    <select
                        name="clientId"
                        value={formData.clientId}
                        onChange={handleChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none"
                    >
                        <option value="" className="bg-surface text-white">Nenhum cliente</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id} className="bg-surface text-white">{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                {isEdit ? (
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting || isSaving}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        Excluir Lançamento
                    </button>
                ) : (
                    <div />
                )}
                
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-3 rounded-xl text-sm font-medium text-text-muted hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving || isDeleting}
                        className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            'Salvar Transação'
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
}
