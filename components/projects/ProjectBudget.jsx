'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calculator, Save, X, Plus, Edit3, Trash2 } from 'lucide-react';
import { deleteTransaction } from 'app/actions/finance-actions';

export default function ProjectBudget({ 
    projectId,
    subProjectId = null,
    initialBudget = { total: 0, items: [], type: 'manual' }, 
    subProjects = [],
    transactions = [],
    onSave, 
    title = "Orçamento do Projeto",
    readOnly = false,
    isSubProject = false,
    variant = 'default',
    hideStats = false,
    perspective = 'admin' // 'admin' or 'client'
}) {
    const [budget, setBudget] = useState(initialBudget || { total: 0, items: [], type: 'manual', notes: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const isClient = perspective === 'client';

    // Filter transactions: 
    // If it's a subproject, show only its transactions.
    // If it's the main project, show all transactions of the project (including subprojects).
    const filteredTransactions = isSubProject 
        ? transactions.filter(t => t.subProjectId === subProjectId)
        : transactions;

    // Get subproject item/stage names for transaction descriptions
    const getSubProjectItemName = (subProjectId, itemId) => {
        if (!itemId) return null;
        
        // Find the specific subproject
        const sp = subProjects.find(s => s.id === subProjectId);
        if (!sp || !sp.content?.stages) return null;
        
        // Search in stages and their items
        for (const stage of sp.content.stages) {
            if (stage.id === itemId) return stage.title || stage.name;
            if (stage.items) {
                const item = stage.items.find(i => i.id === itemId);
                if (item) return item.title || item.name || item.text || item.description;
            }
        }
        return null;
    };

    // Calculate subproject specific stats if needed
    const subProjectStages = isSubProject && subProjectId 
        ? subProjects.find(sp => sp.id === subProjectId)?.content?.stages || []
        : [];

    const actualIncome = filteredTransactions
        .filter(t => t.type === 'income' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0) / 100;
    
    const actualExpense = filteredTransactions
        .filter(t => t.type === 'expense' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0) / 100;

    const budgetProgress = budget.total > 0 ? (actualIncome / budget.total) * 100 : 0;

    // If project type is dynamic, calculate total from subprojects
    useEffect(() => {
        if (!isSubProject && budget.type === 'dynamic') {
            const subProjectsTotal = subProjects.reduce((sum, sp) => {
                const spTotal = sp.budget?.total || 0;
                return sum + spTotal;
            }, 0);
            
            if (subProjectsTotal !== budget.total) {
                setBudget(prev => ({ ...prev, total: subProjectsTotal }));
            }
        }
    }, [subProjects, budget.type, isSubProject, budget.total]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (onSave) {
                await onSave(budget);
            }
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to save budget:', error);
            alert('Erro ao salvar orçamento');
        } finally {
            setIsSaving(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    };

    const handleDeleteTransaction = async (id) => {
        if (confirm('Tem certeza que deseja excluir esta transação?')) {
            try {
                await deleteTransaction(id);
                // The page will refresh via server action
            } catch (error) {
                console.error('Failed to delete transaction:', error);
                alert('Erro ao excluir transação');
            }
        }
    };

    return (
        <section className={`${readOnly ? 'bg-transparent border-none mb-0 shadow-none' : ''} ${variant === 'slim' ? 'bg-transparent border-none mb-0 shadow-none p-0' : ''}`}>
            {/* Header Slimmer */}
            <div className={`flex justify-between items-center mb-8 ${readOnly || variant === 'slim' || hideStats ? 'hidden' : ''}`}>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                        <Calculator size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight leading-none mb-1">
                            {title}
                        </h3>
                        <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">Gestão Financeira</p>
                    </div>
                </div>
                
                {!readOnly && (
                    <div className="flex items-center gap-3">
                        {!isSubProject && (
                            <div className="hidden sm:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                                <button 
                                    onClick={() => isEditing && setBudget(prev => ({ ...prev, type: 'manual' }))}
                                    disabled={!isEditing}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${budget.type === 'manual' ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-white disabled:opacity-50'}`}
                                >
                                    Manual
                                </button>
                                <button 
                                    onClick={() => isEditing && setBudget(prev => ({ ...prev, type: 'dynamic' }))}
                                    disabled={!isEditing}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${budget.type === 'dynamic' ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-white disabled:opacity-50'}`}
                                >
                                    Dinâmico
                                </button>
                            </div>
                        )}

                        {!isEditing ? (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
                            >
                                Editar Orçamento
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className="p-2.5 text-text-muted hover:text-white transition-colors bg-white/5 rounded-xl border border-white/10"
                                >
                                    <X size={18} />
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-white hover:bg-emerald-500 transition-all bg-emerald-500/10 rounded-xl border border-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Save size={16} />
                                    Salvar
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div>
                {/* Budget Breakdown & Notes - EDIT MODE */}
                {isEditing && !readOnly && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
                        {/* Breakdown */}
                        <div className="bg-white/[0.03] p-8 rounded-[2rem] border border-white/5 shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">Detalhamento</h4>
                                    <p className="text-[9px] text-text-muted">Descreva os itens do orçamento</p>
                                </div>
                                <button 
                                    onClick={() => setBudget(prev => ({ 
                                        ...prev, 
                                        items: [...(prev.items || []), { id: crypto.randomUUID(), description: '', amount: 0 }] 
                                    }))}
                                    className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl transition-all border border-primary/20"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                            
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {(budget.items || []).map((item, index) => (
                                    <div key={item.id || index} className="flex gap-3 items-center bg-white/5 p-3 rounded-2xl border border-white/5 group">
                                        <input 
                                            type="text" 
                                            placeholder="Ex: Identidade Visual"
                                            value={item.description}
                                            onChange={(e) => {
                                                const newItems = [...budget.items];
                                                newItems[index].description = e.target.value;
                                                setBudget(prev => ({ ...prev, items: newItems }));
                                            }}
                                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder-white/20 p-0"
                                        />
                                        <div className="flex items-center gap-1 bg-black/20 px-3 py-1.5 rounded-xl border border-white/5">
                                            <span className="text-[10px] text-primary font-black">R$</span>
                                            <input 
                                                type="number" 
                                                value={item.amount}
                                                onChange={(e) => {
                                                    const newItems = [...budget.items];
                                                    newItems[index].amount = Number(e.target.value);
                                                    
                                                    // Auto-calculate total if it's manual and there are items
                                                    const newTotal = newItems.reduce((sum, i) => sum + (i.amount || 0), 0);
                                                    
                                                    setBudget(prev => ({ 
                                                        ...prev, 
                                                        items: newItems,
                                                        total: prev.type === 'manual' && newTotal > 0 ? newTotal : prev.total
                                                    }));
                                                }}
                                                className="w-24 bg-transparent border-none focus:ring-0 text-sm font-bold text-white p-0 text-right"
                                            />
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const newItems = budget.items.filter((_, i) => i !== index);
                                                setBudget(prev => ({ ...prev, items: newItems }));
                                            }}
                                            className="p-2 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {(!budget.items || budget.items.length === 0) && (
                                    <div className="text-center py-8 border border-dashed border-white/10 rounded-2xl">
                                        <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest italic">Nenhum item detalhado</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="bg-white/[0.03] p-8 rounded-[2rem] border border-white/5 shadow-2xl">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-6">Observações Gerais</h4>
                            <textarea 
                                value={budget.notes || ''}
                                onChange={(e) => setBudget(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Notas sobre prazos, formas de pagamento, parcelamento..."
                                className="w-full h-[230px] bg-black/20 border border-white/10 rounded-2xl p-5 text-sm text-white placeholder-white/20 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none"
                            ></textarea>
                        </div>
                    </div>
                )}

                {/* Budget Breakdown & Notes - VIEW MODE */}
                {!isEditing && (budget.items?.length > 0 || budget.notes) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 animate-in fade-in duration-500">
                        {/* Breakdown View */}
                        {budget.items?.length > 0 && (
                            <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-primary"></div>
                                    Detalhamento do Orçamento
                                </h4>
                                <div className="space-y-4">
                                    {budget.items.map((item, index) => (
                                        <div key={item.id || index} className="flex justify-between items-center pb-3 border-b border-white/[0.03] last:border-0">
                                            <span className="text-sm text-white/70">{item.description}</span>
                                            <span className="text-sm font-bold text-white font-mono">{formatCurrency(item.amount)}</span>
                                        </div>
                                    ))}
                                    <div className="pt-2 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Total Planejado</span>
                                        <span className="text-lg font-black text-primary tracking-tighter">{formatCurrency(budget.total)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notes View */}
                        {budget.notes && (
                            <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-primary"></div>
                                    Observações
                                </h4>
                                <div className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
                                    {budget.notes}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Dashboard Stats Grouped */}
                {variant !== 'slim' && (!hideStats || isEditing) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Planejamento */}
                        <div className="bg-white/[0.03] p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all"></div>
                            
                            <h4 className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold mb-4 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
                                {isClient ? 'Investimento' : 'Planejamento'}
                            </h4>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-text-muted mb-1">{isClient ? 'Total do Investimento' : 'Orçamento Total'}</p>
                                    {isEditing && budget.type === 'manual' && !readOnly ? (
                                        <div className="flex items-center gap-1 bg-black/20 rounded-xl px-3 py-2 border border-white/10 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
                                            <span className="text-sm text-primary font-bold">R$</span>
                                            <input 
                                                type="number" 
                                                value={budget.total}
                                                onChange={(e) => setBudget(prev => ({ ...prev, total: Number(e.target.value) }))}
                                                className="w-full bg-transparent border-none focus:ring-0 text-3xl font-black text-white p-0 placeholder-white/20"
                                                placeholder="0,00"
                                            />
                                            <Edit3 size={14} className="text-text-muted ml-2" />
                                        </div>
                                    ) : (
                                        <p className="text-3xl font-black text-white tracking-tighter">{formatCurrency(budget.total)}</p>
                                    )}
                                </div>
                                
                                <div className="h-px bg-white/5 w-full"></div>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-text-muted">Status</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                        budget.total > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-text-muted'
                                    }`}>
                                        {budget.total > 0 ? 'Definido' : 'Pendente'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Execução / Realizado */}
                        <div className="bg-white/[0.03] p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all"></div>

                            <h4 className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold mb-4 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                {isClient ? 'Pagamentos' : 'Execução'}
                            </h4>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1 font-bold">{isClient ? 'Pago' : 'Recebido'}</p>
                                    <p className="text-xl font-black text-emerald-400 tracking-tight">{formatCurrency(actualIncome)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1 font-bold">{isClient ? 'A Pagar' : 'A Receber'}</p>
                                    <p className="text-xl font-black text-primary tracking-tight">{formatCurrency(Math.max(0, budget.total - actualIncome))}</p>
                                </div>
                                {!isClient && (
                                    <div className="col-span-2 pt-4 mt-2 border-t border-white/5 flex justify-between items-center">
                                        <span className="text-xs text-text-muted">Custos Operacionais</span>
                                        <span className="text-sm font-bold text-red-400 font-mono">- {formatCurrency(actualExpense)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress Bar Slim - Hidden in slim variant */}
                {variant !== 'slim' && !hideStats && (
                    <div className="mb-10 bg-white/[0.03] p-6 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-end mb-3">
                            <div>
                                <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">
                                    {isClient ? 'Progresso dos Pagamentos' : 'Execução Financeira'}
                                </span>
                                <p className="text-xs text-white/50 mt-0.5">
                                    {isClient ? 'Valores liquidados em relação ao total acordado' : 'Recebimentos vs Orçamento Planejado'}
                                </p>
                            </div>
                            <span className="text-lg font-black text-white tracking-tighter">{budgetProgress.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-1000 rounded-full ${budgetProgress >= 100 ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'bg-primary shadow-[0_0_12px_rgba(239,68,68,0.3)]'}`}
                                style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Single View: Transactions Only */}
                {(filteredTransactions.length > 0 || variant !== 'slim') && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center px-2">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                {isClient ? 'Histórico de Pagamentos' : 'Histórico de Transações (Realizado)'}
                            </h4>
                            {!readOnly && (
                                <Link 
                                    href={`/admin/finance/new?projectId=${projectId}${isSubProject ? `&subProjectId=${subProjectId}` : ''}`}
                                    className="text-[9px] bg-white/5 text-text-muted hover:text-white px-3 py-1.5 rounded-lg border border-white/10 transition-all font-black uppercase tracking-widest"
                                >
                                    + Novo Lançamento
                                </Link>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20).map((t) => {
                                    const itemName = getSubProjectItemName(t.subProjectId, t.subProjectItemId);
                                    return (
                                        <div key={t.id} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                    t.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                                }`}>
                                                    {t.type === 'income' ? <Plus size={14} /> : <X size={14} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white/80 tracking-tight leading-none mb-1">{t.description}</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[9px] text-text-muted uppercase font-bold tracking-widest">
                                                            {new Date(t.date).toLocaleDateString('pt-BR')}
                                                        </p>
                                                        {itemName && (
                                                            <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">
                                                                {itemName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-4">
                                                <span className={`text-sm font-black font-mono tracking-tighter ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount / 100)}
                                                </span>
                                                
                                                {/* Admin Actions */}
                                                {!readOnly && (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 border-l border-white/5 pl-2">
                                                        <Link 
                                                            href={`/admin/finance/edit/${t.id}`}
                                                            className="p-1.5 text-text-muted hover:text-white hover:bg-white/5 rounded-md transition-all"
                                                            title="Editar"
                                                        >
                                                            <Edit3 size={12} />
                                                        </Link>
                                                        <button 
                                                            onClick={() => handleDeleteTransaction(t.id)}
                                                            className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/5 rounded-md transition-all"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-full text-center py-12 bg-white/[0.01] rounded-3xl border border-dashed border-white/10">
                                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest italic">Sem lançamentos financeiros registrados</p>
                                </div>
                            )}

                            {filteredTransactions.length > 20 && (
                                <Link 
                                    href="/admin/finance" 
                                    className="col-span-full text-center py-2 text-[10px] text-primary hover:underline font-bold uppercase"
                                >
                                    Ver todas as transações
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
