'use client';

import { useState } from 'react';
import { updateSubProjectContent, deleteSubProject, updateSubProject, updateSubProjectLinks, updateSubProjectCredentials } from 'app/actions/project-actions';
import TaskDetailModal from './TaskDetailModal';
import ProjectLinks from './ProjectLinks';
import ProjectCredentials from './ProjectCredentials';

export default function SubProjectCard({ subProject, projectId, readOnly = false }) {
    const [isExpanded, setIsExpanded] = useState((subProject.status || 'active') === 'active');
    const [localContent, setLocalContent] = useState(subProject.content || { stages: [] });
    const [isSaving, setIsSaving] = useState(false);
    const [draggedItem, setDraggedItem] = useState(null);
    const [editingItem, setEditingItem] = useState(null); // { sIdx, iIdx }
    const [expandedTasks, setExpandedTasks] = useState({});
    const [isEditingMetadata, setIsEditingMetadata] = useState(false);
    const [metadata, setMetadata] = useState({ name: subProject.name, status: subProject.status || 'active' });
    const [editingStageIdx, setEditingStageIdx] = useState(null);

    const SUBPROJECT_STATUSES = [
        { value: 'active', label: 'Em andamento' },
        { value: 'queued', label: 'Na fila' },
        { value: 'paused', label: 'Pausado' },
        { value: 'completed', label: 'Finalizado' },
        { value: 'cancelled', label: 'Cancelado' }
    ];

    const getStatusLabel = (val) => {
        return SUBPROJECT_STATUSES.find(s => s.value === val)?.label || val;
    };

    // Ensure stages exist
    const stages = localContent.stages || [];

    const toggleTaskChecklist = (sIdx, iIdx, e) => {
        e.stopPropagation();
        const key = `${sIdx}-${iIdx}`;
        setExpandedTasks(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleOpenItem = (sIdx, iIdx) => {
        setEditingItem({ sIdx, iIdx });
    };

    const handleSaveItemDetails = async (updatedItem) => {
        if (!editingItem) return;
        
        const { sIdx, iIdx } = editingItem;
        const newContent = { ...localContent };
        
        // Ensure path exists
        if (newContent.stages[sIdx] && newContent.stages[sIdx].items[iIdx]) {
            newContent.stages[sIdx].items[iIdx] = updatedItem;
            setLocalContent(newContent);
            await saveContent(newContent);
        }
    };

    const handleDragStart = (e, sIdx, iIdx) => {
        if (readOnly) return;
        setDraggedItem({ sIdx, iIdx });
        e.dataTransfer.effectAllowed = 'move';
        // Set transparent drag image or just rely on default
        e.target.style.opacity = '0.5';
    };

    const handleDragEnd = (e) => {
        if (readOnly) return;
        e.target.style.opacity = '1';
        setDraggedItem(null);
    };

    const handleDragOver = (e) => {
        if (readOnly) return;
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, targetStageIdx) => {
        if (readOnly) return;
        e.preventDefault();
        
        if (!draggedItem) return;
        
        const { sIdx: sourceStageIdx, iIdx: sourceItemIdx } = draggedItem;

        // If dropped in the same stage, we might want to reorder (future improvement), 
        // but for now, if it's the same stage, we do nothing unless we implement reordering.
        // The user asked "move items from one stage to another".
        if (sourceStageIdx === targetStageIdx) return;

        const newContent = { ...localContent };
        
        // Remove from source
        const [movedItem] = newContent.stages[sourceStageIdx].items.splice(sourceItemIdx, 1);
        
        // Add to target
        if (!newContent.stages[targetStageIdx].items) {
            newContent.stages[targetStageIdx].items = [];
        }
        newContent.stages[targetStageIdx].items.push(movedItem);

        setLocalContent(newContent);
        await saveContent(newContent);
        setDraggedItem(null);
    };

    const handleSaveMetadata = async () => {
        if (readOnly) return;
        setIsSaving(true);
        try {
            await updateSubProject(subProject.id, metadata, projectId);
            setIsEditingMetadata(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveStageName = async (sIdx, newName) => {
        if (readOnly || !newName) {
            setEditingStageIdx(null);
            return;
        }
        
        const newContent = { ...localContent };
        newContent.stages[sIdx].name = newName;
        setLocalContent(newContent);
        await saveContent(newContent);
        setEditingStageIdx(null);
    };

    const handleAddItem = async (stageIndex) => {
        if (readOnly) return;
        const text = prompt("Nova tarefa:");
        if (!text) return;

        const newContent = { ...localContent };
        if (!newContent.stages) newContent.stages = [];
        
        newContent.stages[stageIndex].items.push({
            id: crypto.randomUUID(),
            text,
            completed: false
        });

        setLocalContent(newContent);
        await saveContent(newContent);
    };

    const handleToggleItem = async (stageIndex, itemIndex) => {
        if (readOnly) return;
        const newContent = { ...localContent };
        newContent.stages[stageIndex].items[itemIndex].completed = !newContent.stages[stageIndex].items[itemIndex].completed;
        setLocalContent(newContent);
        await saveContent(newContent);
    };

    const handleDeleteItem = async (stageIndex, itemIndex) => {
        if (readOnly) return;
        if(!confirm("Excluir item?")) return;
        const newContent = { ...localContent };
        newContent.stages[stageIndex].items.splice(itemIndex, 1);
        setLocalContent(newContent);
        await saveContent(newContent);
    };
    
    const handleAddStage = async () => {
        if (readOnly) return;
        const name = prompt("Nome da nova etapa:");
        if (!name) return;
        
        const newContent = { ...localContent };
        if (!newContent.stages) newContent.stages = [];
        
        newContent.stages.push({
            id: crypto.randomUUID(),
            name,
            items: []
        });
        
        setLocalContent(newContent);
        await saveContent(newContent);
    };

    const handleDeleteSubProject = async () => {
        if (readOnly) return;
        if(!confirm("Tem certeza que deseja excluir este sub-projeto?")) return;
        await deleteSubProject(subProject.id, projectId);
    };

    const saveContent = async (content) => {
        if (readOnly) return;
        setIsSaving(true);
        try {
            await updateSubProjectContent(subProject.id, content, projectId);
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate SubProject Progress
    const totalSubProjectTasks = stages.reduce((acc, stage) => acc + stage.items.length, 0);
    const completedSubProjectTasks = stages.reduce((acc, stage) => 
        acc + stage.items.filter(i => i.completed).length, 0);
    const subProjectProgress = totalSubProjectTasks > 0 
        ? Math.round((completedSubProjectTasks / totalSubProjectTasks) * 100) 
        : 0;
    const isSubProjectComplete = totalSubProjectTasks > 0 && subProjectProgress === 100;

    return (
        <div className={`bg-surface rounded-xl border overflow-hidden transition-all shadow-lg hover:shadow-xl hover:shadow-primary/5 relative ${
            isSubProjectComplete ? 'border-emerald-500/50 shadow-emerald-500/10' : 'border-white/5'
        }`}>
            {/* SubProject Top Progress Bar */}
            {totalSubProjectTasks > 0 && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-10">
                    <div 
                        className={`h-full transition-all duration-500 ${
                            isSubProjectComplete ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-primary'
                        }`}
                        style={{ width: `${subProjectProgress}%` }}
                    />
                </div>
            )}

            {/* Header Card */}
            <div className={`p-5 flex justify-between items-start bg-gradient-to-r pt-6 ${
                isSubProjectComplete ? 'from-emerald-900/20 to-transparent' : 'from-white/5 to-transparent'
            }`}>
                <div className="flex-1 flex gap-4">
                    <div onClick={() => !isEditingMetadata && setIsExpanded(!isExpanded)} className={`cursor-pointer flex-1 ${isEditingMetadata ? 'cursor-default' : ''}`}>
                        {isEditingMetadata ? (
                            <div className="space-y-3 max-w-md" onClick={(e) => e.stopPropagation()}>
                                <input 
                                    type="text" 
                                    value={metadata.name}
                                    onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
                                    className="w-full bg-black/40 border border-primary/50 rounded px-2 py-1 text-white text-lg font-bold focus:outline-none"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleSaveMetadata}
                                        className="text-xs bg-primary text-white px-3 py-1 rounded hover:bg-primary/90"
                                    >
                                        Salvar
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setIsEditingMetadata(false);
                                            setMetadata({ name: subProject.name, status: subProject.status || 'active' });
                                        }}
                                        className="text-xs bg-white/10 text-white px-3 py-1 rounded hover:bg-white/20"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2 group">
                                    <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                                    {subProject.name}
                                    {!readOnly && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsEditingMetadata(true);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 text-xs text-primary hover:underline ml-2"
                                        >
                                            editar
                                        </button>
                                    )}
                                </h3>
                                
                                {readOnly && (
                                    <div className="flex items-center gap-3 mt-1 ml-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-20 h-1.5 bg-black/40 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-500 ${isSubProjectComplete ? 'bg-emerald-500' : 'bg-primary'}`}
                                                    style={{ width: `${subProjectProgress}%` }}
                                                />
                                            </div>
                                            <span className={`text-[10px] font-bold ${isSubProjectComplete ? 'text-emerald-400' : 'text-primary'}`}>
                                                {subProjectProgress}%
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                                            {completedSubProjectTasks} de {totalSubProjectTasks} tarefas
                                        </span>
                                    </div>
                                )}
                                
                                {subProject.description && (
                                    <p className="text-sm text-text-muted mt-2 ml-4">{subProject.description}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isEditingMetadata ? (
                        <select 
                            value={metadata.status}
                            onChange={(e) => setMetadata({ ...metadata, status: e.target.value })}
                            className="bg-black/40 border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none"
                        >
                            {SUBPROJECT_STATUSES.map(s => (
                                <option key={s.value} value={s.value} className="bg-surface">{s.label}</option>
                            ))}
                        </select>
                    ) : (
                        <span className={`text-xs px-2 py-1 rounded-full border ${
                            subProject.status === 'completed' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : subProject.status === 'active'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : subProject.status === 'paused'
                                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                : subProject.status === 'cancelled'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                        }`}>
                            {getStatusLabel(subProject.status)}
                        </span>
                    )}
                    {!readOnly && !isEditingMetadata && (
                        <button 
                            onClick={handleDeleteSubProject}
                            className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                            title="Excluir Sub-projeto"
                        >
                            🗑️
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded Content (Kanban/Stages) */}
            {isExpanded && (
                <div className="p-5 border-t border-white/5 bg-black/20 space-y-6">
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {stages.length === 0 && (
                             <div className="min-w-[280px] flex flex-col justify-center items-center text-text-muted p-4 border border-white/5 border-dashed rounded-lg bg-white/5">
                                <span className="text-2xl mb-2">👋</span>
                                <p className="text-sm text-center mb-3">
                                    {readOnly ? 'Nenhuma etapa definida para este sub-projeto.' : 'Comece criando etapas para este sub-projeto.'}
                                </p>
                                {!readOnly && <p className="text-xs text-center opacity-50">Ex: "A Fazer", "Em Análise", "Concluído"</p>}
                            </div>
                        )}

                        {stages.map((stage, sIdx) => {
                            // Calculate Stage Progress
                            const totalStageTasks = stage.items.length;
                            const completedStageTasks = stage.items.filter(i => i.completed).length;
                            const stageProgress = totalStageTasks > 0 
                                ? Math.round((completedStageTasks / totalStageTasks) * 100) 
                                : 0;
                            const isStageComplete = totalStageTasks > 0 && stageProgress === 100;

                            return (
                            <div 
                                key={stage.id} 
                                className={`min-w-[280px] bg-surface border rounded-lg p-3 pt-5 flex flex-col transition-colors relative overflow-hidden ${
                                    !readOnly && draggedItem ? 'border-dashed border-primary/30 bg-white/5' : ''
                                } ${
                                    isStageComplete ? 'border-emerald-500/30 bg-emerald-900/5' : 'border-white/5'
                                }`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, sIdx)}
                            >
                                {/* Stage Top Progress Bar */}
                                {totalStageTasks > 0 && (
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-black/20">
                                        <div 
                                            className={`h-full transition-all duration-500 ${
                                                isStageComplete ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-primary/70'
                                            }`}
                                            style={{ width: `${stageProgress}%` }}
                                        />
                                    </div>
                                )}
                                
                                <h4 className="font-semibold text-white mb-2 flex justify-between items-center min-h-[28px]">
                                    {editingStageIdx === sIdx ? (
                                        <input
                                            type="text"
                                            defaultValue={stage.name}
                                            autoFocus
                                            onBlur={(e) => handleSaveStageName(sIdx, e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveStageName(sIdx, e.currentTarget.value);
                                                if (e.key === 'Escape') setEditingStageIdx(null);
                                            }}
                                            className="bg-black/40 border border-primary/50 rounded px-2 py-0.5 text-sm text-white w-full mr-2 focus:outline-none"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2 group/title flex-1 min-w-0">
                                            <span 
                                                className={`cursor-pointer truncate ${isStageComplete ? 'text-emerald-400' : ''}`}
                                                onClick={() => !readOnly && setEditingStageIdx(sIdx)}
                                                title={!readOnly ? "Clique para editar o nome da etapa" : stage.name}
                                            >
                                                {stage.name}
                                            </span>
                                            {!readOnly && (
                                                <>
                                                    <button 
                                                        onClick={() => setEditingStageIdx(sIdx)}
                                                        className="opacity-0 group-hover/title:opacity-100 text-[10px] text-primary hover:underline"
                                                    >
                                                        editar
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteStage(sIdx)}
                                                        className="opacity-0 group-hover/title:opacity-100 text-[10px] text-red-400 hover:underline ml-auto mr-2"
                                                        title="Excluir Etapa"
                                                    >
                                                        excluir
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                                        isStageComplete ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-text-muted'
                                    }`}>{stage.items.length}</span>
                                </h4>
                                
                                {!readOnly && (
                                    <div className="mb-3">
                                        <a 
                                            href={`/admin/finance/new?projectId=${projectId}&subProjectId=${subProject.id}&subProjectItemId=${stage.id}`}
                                            className="block w-full py-1.5 px-2 bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 rounded text-[10px] text-primary font-bold uppercase tracking-wider text-center transition-all"
                                        >
                                            + Registrar Custo
                                        </a>
                                    </div>
                                )}
                                
                                <div className="space-y-2 flex-1 min-h-[50px]">
                                    {stage.items.map((item, iIdx) => {
                                        // Calculate Checklist Progress
                                        const totalChecklistItems = (item.checklists || []).reduce((acc, cl) => acc + (cl.items || []).length, 0);
                                        const completedChecklistItems = (item.checklists || []).reduce((acc, cl) => acc + (cl.items || []).filter(i => i.completed).length, 0);
                                        const checklistProgress = totalChecklistItems > 0 ? Math.round((completedChecklistItems / totalChecklistItems) * 100) : 0;
                                        const isChecklistComplete = totalChecklistItems > 0 && checklistProgress === 100;
                                        const taskKey = `${sIdx}-${iIdx}`;
                                        const isChecklistExpanded = expandedTasks[taskKey];
                                        
                                        if (readOnly) {
                                            const hasDates = item.startDate && item.dueDate;
                                            const startDate = item.startDate ? new Date(item.startDate) : null;
                                            const dueDate = item.dueDate ? new Date(item.dueDate) : null;
                                            
                                            let durationDays = 0;
                                            if (startDate && dueDate) {
                                                durationDays = Math.ceil((dueDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                                            }

                                            return (
                                                <div 
                                                    key={item.id}
                                                    className={`p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer ${
                                                        isChecklistComplete 
                                                            ? 'bg-emerald-900/10 border-emerald-500/30' 
                                                            : 'bg-white/5 border-white/5 hover:border-white/10'
                                                    }`}
                                                    onClick={() => handleOpenItem(sIdx, iIdx)}
                                                >
                                                    {/* Header: Title & Date */}
                                                    <div className="flex justify-between items-start gap-3 mb-2">
                                                        <span className={`font-medium text-white text-base leading-snug ${item.completed ? 'line-through opacity-50' : ''}`}>
                                                            {item.text}
                                                        </span>
                                                        {item.dueDate && (
                                                            <div className="flex flex-col items-end gap-1">
                                                                <span className={`text-[10px] px-2 py-1 rounded border font-mono whitespace-nowrap ${
                                                                    new Date(item.dueDate) < new Date() && !item.completed
                                                                        ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                                                        : 'bg-white/5 text-text-muted border-white/10'
                                                                }`}>
                                                                    {new Date(item.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                                </span>
                                                                {durationDays > 0 && (
                                                                    <span className="text-[9px] text-text-muted uppercase tracking-tighter opacity-60">
                                                                        {durationDays} {durationDays === 1 ? 'dia' : 'dias'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Visual Timeline (Mini Gantt for task) */}
                                                    {hasDates && (
                                                        <div className="mb-3 px-1">
                                                            <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden flex">
                                                                <div className="flex-1 flex items-center justify-between px-0.5">
                                                                    <div className={`h-full rounded-full ${item.completed ? 'bg-emerald-500/50' : 'bg-primary/50'}`} style={{ width: '100%' }}></div>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between mt-1 px-0.5">
                                                                <span className="text-[8px] text-text-muted font-mono opacity-50">
                                                                    {startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                                </span>
                                                                <span className="text-[8px] text-text-muted font-mono opacity-50">
                                                                    {dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Description Preview */}
                                                    {item.description && (
                                                        <p className="text-xs text-text-muted line-clamp-2 mb-3 leading-relaxed opacity-80">
                                                            {item.description}
                                                        </p>
                                                    )}

                                                    {/* Checklist Section */}
                                                    {totalChecklistItems > 0 && (
                                                        <div className="mt-3 pt-3 border-t border-white/5">
                                                            {/* Progress Bar & Toggle Header */}
                                                            <div 
                                                                className="flex items-center gap-2 cursor-pointer group select-none"
                                                                onClick={(e) => toggleTaskChecklist(sIdx, iIdx, e)}
                                                            >
                                                                <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                                            isChecklistComplete ? 'bg-emerald-500' : 'bg-primary'
                                                                        }`}
                                                                        style={{ width: `${checklistProgress}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-[10px] text-text-muted font-medium whitespace-nowrap">
                                                                    {completedChecklistItems}/{totalChecklistItems}
                                                                </span>
                                                                <span className={`text-text-muted transition-transform duration-200 text-xs ${isChecklistExpanded ? 'rotate-180' : ''}`}>
                                                                    ▼
                                                                </span>
                                                            </div>

                                                            {/* Expanded Items */}
                                                            {isChecklistExpanded && (
                                                                <div className="mt-3 space-y-2 pl-1 animate-in slide-in-from-top-1 duration-200">
                                                                    {item.checklists.flatMap(cl => cl.items).map((cItem, cIdx) => (
                                                                        <div key={cIdx} className="flex items-start gap-2 text-xs">
                                                                            <span className={`mt-0.5 ${cItem.completed ? "text-emerald-400" : "text-white/20"}`}>
                                                                                {cItem.completed ? "✓" : "○"}
                                                                            </span>
                                                                            <span className={`flex-1 leading-snug ${cItem.completed ? "text-text-muted line-through opacity-60" : "text-gray-300"}`}>
                                                                                {cItem.text}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Attachments & Comments Indicator */}
                                                    <div className="mt-2 flex items-center gap-3 text-[10px] text-text-muted">
                                                        {(item.attachments || []).length > 0 && (
                                                            <div className="flex items-center gap-1">
                                                                 <span>📎</span> {(item.attachments || []).length} anexos
                                                            </div>
                                                        )}
                                                        {(item.comments || []).length > 0 && (
                                                            <div className="flex items-center gap-1 text-primary font-bold animate-pulse">
                                                                 <span>💬</span> {(item.comments || []).length} comentários
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }

                                            const hasDates = item.startDate && item.dueDate;
                                            const startDate = item.startDate ? new Date(item.startDate) : null;
                                            const dueDate = item.dueDate ? new Date(item.dueDate) : null;
                                            
                                            let durationDays = 0;
                                            if (startDate && dueDate) {
                                                durationDays = Math.ceil((dueDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                                            }

                                            return (
                                        <div 
                                            key={item.id} 
                                            className={`p-3 rounded border transition-colors group ${
                                                !readOnly ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                                            } ${
                                                isChecklistComplete 
                                                    ? 'bg-emerald-900/10 border-emerald-500/30 hover:bg-emerald-900/20' 
                                                    : 'bg-white/5 border-white/5 hover:border-primary/30 hover:bg-white/10'
                                            }`}
                                            draggable={!readOnly}
                                            onDragStart={(e) => handleDragStart(e, sIdx, iIdx)}
                                            onDragEnd={handleDragEnd}
                                            onClick={(e) => {
                                                if (e.target.tagName === 'INPUT' || e.target.closest('button')) return;
                                                handleOpenItem(sIdx, iIdx);
                                            }}
                                        >
                                            <div className="flex items-start gap-2 mb-1">
                                                <input 
                                                    type="checkbox" 
                                                    checked={item.completed} 
                                                    onChange={() => !readOnly && handleToggleItem(sIdx, iIdx)}
                                                    disabled={readOnly}
                                                    className={`mt-1 rounded bg-black/20 border-white/10 text-primary focus:ring-primary/50 ${readOnly ? 'cursor-not-allowed opacity-50' : ''}`}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <span className={`text-sm text-gray-300 block break-words font-medium ${item.completed ? 'line-through opacity-50' : ''}`}>
                                                            {item.text}
                                                        </span>
                                                        {durationDays > 0 && (
                                                            <span className="text-[9px] text-text-muted uppercase tracking-tighter opacity-40 shrink-0 mt-0.5">
                                                                {durationDays}d
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Checklist Progress Bar */}
                                                    {totalChecklistItems > 0 && (
                                                        <div className="mt-2 mb-1">
                                                            <div className="flex justify-between text-[10px] text-text-muted mb-0.5">
                                                                <span>Checklist</span>
                                                                <span className={isChecklistComplete ? 'text-emerald-400' : ''}>{completedChecklistItems}/{totalChecklistItems}</span>
                                                            </div>
                                                            <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                                        isChecklistComplete ? 'bg-emerald-500' : 'bg-primary/70'
                                                                    }`}
                                                                    style={{ width: `${checklistProgress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                {!readOnly && (
                                                    <button 
                                                        onClick={() => handleDeleteItem(sIdx, iIdx)}
                                                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity px-1"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>

                                            {/* Metadata Badges */}
                                            <div className="flex items-center gap-3 pl-7 text-[10px] text-text-muted mt-1">
                                                {item.description && <span title="Tem descrição">📝</span>}
                                                {(item.attachments || []).length > 0 && (
                                                    <span title="Anexos">📎 {(item.attachments || []).length}</span>
                                                )}
                                                {(item.comments || []).length > 0 && (
                                                    <span title="Comentários" className="text-primary font-bold animate-pulse flex items-center gap-0.5">
                                                        💬 {(item.comments || []).length}
                                                    </span>
                                                )}
                                                {item.dueDate && (
                                                     <span title={`Entrega: ${item.dueDate}`} className={`flex items-center gap-1 font-mono ${new Date(item.dueDate) < new Date() && !item.completed ? 'text-red-400' : ''}`}>
                                                        📅 {startDate ? `${new Date(startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} → ` : ''}
                                                        {new Date(item.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )})}
                                </div>

                                {!readOnly && (
                                    <button 
                                        onClick={() => handleAddItem(sIdx)}
                                        className="mt-3 w-full py-2 border border-dashed border-white/10 rounded text-sm text-text-muted hover:text-white hover:border-primary/50 hover:bg-primary/5 transition-all"
                                    >
                                        + Adicionar Item
                                    </button>
                                )}
                            </div>
                        )})}

                        {/* Add Stage Button */}
                        {!readOnly && (
                            <div className="min-w-[280px] flex items-start">
                                <button 
                                    onClick={handleAddStage}
                                    className="w-full py-3 border border-dashed border-white/10 rounded-lg text-text-muted hover:text-white hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                                >
                                    <span>+</span> Nova Etapa
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {isSaving && (
                        <div className="text-xs text-primary mt-2 flex items-center gap-1 animate-pulse">
                            <span>💾</span> Salvando alterações...
                        </div>
                    )}

                    {/* SubProject Links & Credentials - Footer */}
                    <div className="mt-6 pt-4 border-t border-white/5 space-y-4">
                        <div className="flex flex-wrap items-center gap-6">
                            <ProjectLinks 
                                title="Links"
                                initialLinks={subProject.links}
                                readOnly={readOnly}
                                variant="slim"
                                onSave={async (links) => {
                                    await updateSubProjectLinks(subProject.id, links, projectId);
                                }}
                            />

                            {!readOnly && (
                                <ProjectCredentials 
                                    title="Acessos"
                                    initialCredentials={subProject.credentials}
                                    readOnly={readOnly}
                                    variant="slim"
                                    onSave={async (creds) => {
                                        await updateSubProjectCredentials(subProject.id, creds, projectId);
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Task Detail Modal */}
            <TaskDetailModal 
                isOpen={!!editingItem}
                onClose={() => setEditingItem(null)}
                task={editingItem ? stages[editingItem.sIdx].items[editingItem.iIdx] : null}
                onSave={handleSaveItemDetails}
                readOnly={readOnly}
                projectId={projectId}
                subProjectId={subProject.id}
            />
        </div>
    );
}