'use client';

import { useState, useEffect } from 'react';
import { updateSubProjectContent, deleteSubProject, updateSubProject, updateSubProjectLinks, updateSubProjectCredentials } from 'app/actions/project-actions';
import TaskDetailModal from './TaskDetailModal';
import ProjectLinks from './ProjectLinks';
import ProjectCredentials from './ProjectCredentials';
import { useTaskNavigation } from './TaskNavigationContext';
import { Layout, List as ListIcon, Calendar, CheckSquare, Paperclip, MessageSquare } from 'lucide-react';

export default function SubProjectCard({ subProject, projectId, readOnly = false, projectName, clientName, availableClients = [], currentClientId = null }) {
    const { openTaskRequest, clearRequest } = useTaskNavigation();
    const [isExpanded, setIsExpanded] = useState((subProject.status || 'active') === 'active');
    const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
    const [localContent, setLocalContent] = useState(subProject.content || { stages: [] });
    const [isSaving, setIsSaving] = useState(false);
    const [draggedItem, setDraggedItem] = useState(null);
    const [editingItem, setEditingItem] = useState(null); // { sIdx, iIdx }
    const [expandedTasks, setExpandedTasks] = useState({});
    const [isEditingMetadata, setIsEditingMetadata] = useState(false);
    const [metadata, setMetadata] = useState({ name: subProject.name, status: subProject.status || 'active' });
    const [editingStageIdx, setEditingStageIdx] = useState(null);

    // Listen for open task requests from FileManager
    useEffect(() => {
        if (openTaskRequest && openTaskRequest.subProjectId === subProject.id) {
            const stages = localContent.stages || [];
            for (let sIdx = 0; sIdx < stages.length; sIdx++) {
                const stage = stages[sIdx];
                const iIdx = stage.items.findIndex(item => item.id === openTaskRequest.taskId);
                if (iIdx !== -1) {
                    setEditingItem({ sIdx, iIdx });
                    setIsExpanded(true);
                    
                    // Optional: scroll into view logic if needed, but opening modal is primary
                    const element = document.getElementById(`task-${openTaskRequest.taskId}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }

                    if (clearRequest) clearRequest();
                    break;
                }
            }
        }
    }, [openTaskRequest, subProject.id, localContent, clearRequest]);

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
            completed: false,
            assignedTo: currentClientId ? [currentClientId] : []
        });

        setLocalContent(newContent);
        await saveContent(newContent);
    };

    const handleToggleItem = async (stageIndex, itemIndex) => {
        // Allow toggle if not readOnly OR if assigned to current user
        const item = localContent.stages[stageIndex].items[itemIndex];
        const isAssignedToMe = currentClientId && (item.assignedTo || []).includes(currentClientId);
        
        if (readOnly && !isAssignedToMe) return;

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

    const handleDeleteStage = async (sIdx) => {
        if (readOnly) return;
        if(!confirm("Excluir esta etapa e todas as suas tarefas?")) return;
        
        const newContent = { ...localContent };
        newContent.stages.splice(sIdx, 1);
        setLocalContent(newContent);
        await saveContent(newContent);
    };

    const handleDeleteSubProject = async () => {
        if (readOnly) return;
        if(!confirm("Tem certeza que deseja excluir este sub-projeto?")) return;
        await deleteSubProject(subProject.id, projectId);
    };

    const saveContent = async (content) => {
        // Allow save if not readOnly OR if we are modifying a task assigned to current user
        // Note: For finer granularity, we rely on the specific handlers to block unauthorized edits.
        // But the saveContent itself usually needs to proceed if called by a valid handler.
        if (readOnly && !currentClientId) return; 

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

                    <div className="flex flex-col items-end gap-2">
                         {!isEditingMetadata ? (
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
                        ) : (
                            <select 
                                value={metadata.status}
                                onChange={(e) => setMetadata({ ...metadata, status: e.target.value })}
                                className="bg-black/40 border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none"
                            >
                                {SUBPROJECT_STATUSES.map(s => (
                                    <option key={s.value} value={s.value} className="bg-surface">{s.label}</option>
                                ))}
                            </select>
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
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="p-5 border-t border-white/5 bg-black/20 space-y-6">
                    
                    {/* View Mode Toggle */}
                    <div className="flex justify-end mb-2">
                        <div className="flex bg-black/20 rounded-lg p-1 border border-white/5">
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-white'}`}
                                title="Kanban"
                            >
                                <Layout size={14} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-white'}`}
                                title="Lista"
                            >
                                <ListIcon size={14} />
                            </button>
                        </div>
                    </div>

                    {stages.length === 0 && (
                            <div className="min-w-[280px] flex flex-col justify-center items-center text-text-muted p-4 border border-white/5 border-dashed rounded-lg bg-white/5">
                            <span className="text-2xl mb-2">👋</span>
                            <p className="text-sm text-center mb-3">
                                {readOnly ? 'Nenhuma etapa definida para este sub-projeto.' : 'Comece criando etapas para este sub-projeto.'}
                            </p>
                            {!readOnly && <p className="text-xs text-center opacity-50">Ex: "A Fazer", "Em Análise", "Concluído"</p>}
                        </div>
                    )}

                    {viewMode === 'list' ? (
                        <>
                            {/* Mobile List View */}
                            <div className="md:hidden space-y-3">
                                {stages.flatMap((stage, sIdx) => 
                                    stage.items.map((item, iIdx) => {
                                        const totalChecklistItems = (item.checklists || []).reduce((acc, cl) => acc + (cl.items || []).length, 0);
                                        const completedChecklistItems = (item.checklists || []).reduce((acc, cl) => acc + (cl.items || []).filter(i => i.completed).length, 0);
                                        const isChecklistComplete = totalChecklistItems > 0 && totalChecklistItems === completedChecklistItems;
                                        const isAssignedToMe = currentClientId && (item.assignedTo || []).includes(currentClientId);

                                        return (
                                            <div 
                                                key={item.id}
                                                onClick={() => handleOpenItem(sIdx, iIdx)}
                                                className={`p-4 rounded-lg border bg-surface space-y-3 ${
                                                    isAssignedToMe ? 'bg-primary/5 border-primary/20' : 'border-white/5'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={item.completed} 
                                                        onChange={() => (isAssignedToMe || !readOnly) && handleToggleItem(sIdx, iIdx)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        disabled={readOnly && !isAssignedToMe}
                                                        className="mt-1 w-4 h-4 rounded bg-black/20 border-white/10 text-primary focus:ring-primary/50"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-white text-sm break-words">
                                                            <span className={item.completed ? 'line-through text-text-muted' : ''}>{item.text}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-text-muted">
                                                                {stage.name}
                                                            </span>
                                                            {item.dueDate && (
                                                                <span className={`text-[10px] flex items-center gap-1 ${new Date(item.dueDate) < new Date() && !item.completed ? 'text-red-400' : 'text-text-muted'}`}>
                                                                    <Calendar size={10} />
                                                                    {new Date(item.dueDate).toLocaleDateString('pt-BR')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex -space-x-1">
                                                            {(item.assignedTo || []).map(clientId => {
                                                                const client = availableClients.find(c => c.id === clientId);
                                                                if (!client) return null;
                                                                return (
                                                                    <div key={`${clientId}-${iIdx}`} className="w-5 h-5 rounded-full bg-surface border border-white/10 flex items-center justify-center text-[8px] font-bold text-primary uppercase">
                                                                        {client.name.substring(0, 2)}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        {(item.attachments?.length > 0 || item.comments?.length > 0) && (
                                                            <div className="flex items-center gap-2 text-text-muted text-[10px]">
                                                                {item.attachments?.length > 0 && <span className="flex items-center gap-1"><Paperclip size={10} /> {item.attachments.length}</span>}
                                                                {item.comments?.length > 0 && <span className="flex items-center gap-1"><MessageSquare size={10} /> {item.comments.length}</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {totalChecklistItems > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-12 h-1 bg-black/20 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full ${isChecklistComplete ? 'bg-emerald-500' : 'bg-primary'}`} 
                                                                    style={{ width: `${(completedChecklistItems/totalChecklistItems)*100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] text-text-muted">{completedChecklistItems}/{totalChecklistItems}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block w-full bg-surface border border-white/5 rounded-xl overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/5 text-xs font-bold text-text-muted uppercase tracking-wider">
                                        <th className="p-4 w-1/3">Tarefa</th>
                                        <th className="p-4">Etapa</th>
                                        <th className="p-4">Entrega</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Responsáveis</th>
                                        <th className="p-4 text-center">Anexos</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {stages.flatMap((stage, sIdx) => 
                                        stage.items.map((item, iIdx) => {
                                            const totalChecklistItems = (item.checklists || []).reduce((acc, cl) => acc + (cl.items || []).length, 0);
                                            const completedChecklistItems = (item.checklists || []).reduce((acc, cl) => acc + (cl.items || []).filter(i => i.completed).length, 0);
                                            const isChecklistComplete = totalChecklistItems > 0 && totalChecklistItems === completedChecklistItems;
                                            const isAssignedToMe = currentClientId && (item.assignedTo || []).includes(currentClientId);

                                            return (
                                                <tr 
                                                    key={item.id} 
                                                    onClick={() => handleOpenItem(sIdx, iIdx)}
                                                    id={`task-${item.id}`} 
                                                    className={`group hover:bg-white/5 cursor-pointer transition-colors ${
                                                        isAssignedToMe ? 'bg-primary/5 hover:bg-primary/10' : ''
                                                    }`}
                                                >
                                                    <td className="p-4">
                                                        <div className="font-medium text-white flex items-center gap-2">
                                                            <input 
                                                        type="checkbox" 
                                                        checked={item.completed} 
                                                        onChange={() => (isAssignedToMe || !readOnly) && handleToggleItem(sIdx, iIdx)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        disabled={readOnly && !isAssignedToMe}
                                                        className={`w-4 h-4 rounded bg-black/20 border-white/10 text-primary focus:ring-primary/50 ${readOnly && !isAssignedToMe ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                                    />
                                                            <span className={item.completed ? 'line-through text-text-muted' : ''}>{item.text}</span>
                                                        </div>
                                                        {item.description && (
                                                            <p className="text-xs text-text-muted mt-1 line-clamp-1 ml-5">{item.description}</p>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-text-muted whitespace-nowrap">
                                                            {stage.name}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        {item.dueDate ? (
                                                            <div className={`flex items-center gap-1.5 text-xs font-mono ${new Date(item.dueDate) < new Date() && !item.completed ? 'text-red-400' : 'text-gray-300'}`}>
                                                                <Calendar size={12} />
                                                                {new Date(item.dueDate).toLocaleDateString('pt-BR')}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-text-muted">-</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        {totalChecklistItems > 0 ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-16 h-1.5 bg-black/20 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className={`h-full ${isChecklistComplete ? 'bg-emerald-500' : 'bg-primary'}`} 
                                                                        style={{ width: `${(completedChecklistItems/totalChecklistItems)*100}%` }}
                                                                    ></div>
                                                                </div>
                                                                <span className="text-xs font-mono text-text-muted">
                                                                    {completedChecklistItems}/{totalChecklistItems}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-text-muted">-</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex -space-x-1">
                                                            {(item.assignedTo || []).map(clientId => {
                                                                const client = availableClients.find(c => c.id === clientId);
                                                                if (!client) return null;
                                                                return (
                                                                    <div key={`${clientId}-${iIdx}`} className="w-6 h-6 rounded-full bg-surface border border-white/10 flex items-center justify-center text-[10px] font-bold text-primary uppercase" title={client.name}>
                                                                        {client.name.substring(0, 2)}
                                                                    </div>
                                                                );
                                                            })}
                                                            {(item.assignedTo || []).length === 0 && <span className="text-xs text-text-muted">-</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className="flex items-center justify-center gap-3 text-text-muted">
                                                            {(item.attachments || []).length > 0 && (
                                                                <span className="flex items-center gap-1 text-xs" title={`${(item.attachments || []).length} anexos`}>
                                                                    <Paperclip size={12} /> {(item.attachments || []).length}
                                                                </span>
                                                            )}
                                                            {(item.comments || []).length > 0 && (
                                                                <span className="flex items-center gap-1 text-xs" title={`${(item.comments || []).length} comentários`}>
                                                                    <MessageSquare size={12} /> {(item.comments || []).length}
                                                                </span>
                                                            )}
                                                            {(item.attachments || []).length === 0 && (item.comments || []).length === 0 && (
                                                                <span className="text-xs">-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                    {stages.every(s => s.items.length === 0) && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-text-muted italic">
                                                Nenhuma tarefa neste subprojeto.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col md:flex-row gap-4 md:overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
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
                                    className={`w-full md:w-auto md:min-w-[280px] bg-surface border rounded-lg p-3 pt-5 flex flex-col transition-colors relative overflow-hidden ${
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
                                                    onClick={(e) => {
                                                        if (!readOnly) {
                                                            e.stopPropagation();
                                                            setEditingStageIdx(sIdx);
                                                        }
                                                    }}
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
                                    
                                    <div className="space-y-2 flex-1 min-h-[50px] overflow-y-visible">
                                        {stage.items.map((item, iIdx) => {
                                            // Calculate Checklist Progress
                                            const totalChecklistItems = (item.checklists || []).reduce((acc, cl) => acc + (cl.items || []).length, 0);
                                            const completedChecklistItems = (item.checklists || []).reduce((acc, cl) => acc + (cl.items || []).filter(i => i.completed).length, 0);
                                            const checklistProgress = totalChecklistItems > 0 ? Math.round((completedChecklistItems / totalChecklistItems) * 100) : 0;
                                            const isChecklistComplete = totalChecklistItems > 0 && checklistProgress === 100;
                                            const taskKey = `${sIdx}-${iIdx}`;
                                            const isChecklistExpanded = expandedTasks[taskKey];
                                            
                                            const hasDates = item.startDate && item.dueDate;
                                            const startDate = item.startDate ? new Date(item.startDate) : null;
                                            const dueDate = item.dueDate ? new Date(item.dueDate) : null;

                                            // Check if task is assigned to current client
                                            const isAssignedToMe = currentClientId && (item.assignedTo || []).includes(currentClientId);
                                            
                                            let durationDays = 0;
                                            if (startDate && dueDate) {
                                                durationDays = Math.ceil((dueDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                                            }

                                            return (
                                            <div 
                                                key={item.id}
                                                id={`task-${item.id}`} 
                                                className={`p-3 rounded border transition-colors group ${
                                                    !readOnly ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                                                } ${
                                                    isChecklistComplete 
                                                        ? 'bg-emerald-900/10 border-emerald-500/30 hover:bg-emerald-900/20' 
                                                        : isAssignedToMe
                                                            ? 'bg-primary/20 border-primary hover:bg-primary/25 shadow-[0_0_10px_rgba(255,107,0,0.1)]'
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
                                                        onChange={() => (isAssignedToMe || !readOnly) && handleToggleItem(sIdx, iIdx)}
                                                        disabled={readOnly && !isAssignedToMe}
                                                        className={`mt-1 rounded bg-black/20 border-white/10 text-primary focus:ring-primary/50 ${readOnly && !isAssignedToMe ? 'cursor-not-allowed opacity-50' : ''}`}
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

                                                        {/* Assigned Clients Tags */}
                                                        <div className="flex flex-wrap items-center gap-1 mb-1 mt-1">
                                                            {(item.assignedTo || []).length > 0 && (
                                                                <>
                                                                    {isAssignedToMe && (
                                                                        <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded uppercase font-bold tracking-wider flex items-center gap-1 shadow-sm">
                                                                            👤 Para você
                                                                        </span>
                                                                    )}
                                                                    {(item.assignedTo || []).filter(id => id !== currentClientId).map(clientId => {
                                                                        const client = availableClients.find(c => c.id === clientId);
                                                                        if (!client) return null;
                                                                        return (
                                                                            <span key={`${clientId}-${iIdx}`} className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                                                                {client.name}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </>
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
                                                         <span title={`Entrega: ${item.dueDate}`} className={`flex items-center gap-1 font-mono ${new Date(item.dueDate) < new Date() && !item.completed ? 'text-red-400' : ''}`} suppressHydrationWarning>
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
                                );
                            })}

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
                    )}
                    
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
                projectName={projectName}
                subProjectId={subProject.id}
                subProjectName={subProject.name}
                clientName={clientName}
                availableClients={availableClients}
                currentClientId={currentClientId}
            />
        </div>
    );
}
