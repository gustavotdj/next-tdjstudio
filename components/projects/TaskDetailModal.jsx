'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { MessageSquare, Send, Calendar, Clock, DollarSign } from 'lucide-react';
import Link from 'next/link';
import R2Uploader from 'components/R2Uploader';

export default function TaskDetailModal({  
    isOpen, 
    onClose, 
    task, 
    onSave, 
    readOnly = false,
    projectId = null,
    subProjectId = null,
    projectName = null,
    subProjectName = null,
    clientName = null,
    availableClients = [],
    currentClientId = null
}) {
    const { data: session } = useSession();
    const [localTask, setLocalTask] = useState(task);
    const [newChecklistTitle, setNewChecklistTitle] = useState('');
    const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
    const [newAttachmentName, setNewAttachmentName] = useState('');
    const [newComment, setNewComment] = useState('');
    const [mounted, setMounted] = useState(false);
    const commentsEndRef = useRef(null);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        setLocalTask(task);
    }, [task]);

    useEffect(() => {
        if (localTask?.comments?.length > 0) {
            commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [localTask?.comments]);

    if (!isOpen || !localTask || !mounted) return null;

    const handleSave = () => {
        onSave(localTask);
        onClose();
    };

    const updateField = (field, value) => {
        setLocalTask(prev => ({ ...prev, [field]: value }));
    };

    // Comment Management
    const addComment = () => {
        if (!newComment.trim()) return;
        
        const comment = {
            id: crypto.randomUUID(),
            text: newComment,
            userName: session?.user?.name || 'Usuário',
            userImage: session?.user?.image,
            userId: session?.user?.id,
            userRole: session?.user?.role || 'client',
            createdAt: new Date().toISOString()
        };

        setLocalTask(prev => ({
            ...prev,
            comments: [...(prev.comments || []), comment]
        }));
        setNewComment('');
    };

    // Checklist Management
    const addChecklist = () => {
        if (readOnly || !newChecklistTitle.trim()) return;
        const newChecklist = {
            id: crypto.randomUUID(),
            title: newChecklistTitle,
            items: []
        };
        setLocalTask(prev => ({
            ...prev,
            checklists: [...(prev.checklists || []), newChecklist]
        }));
        setNewChecklistTitle('');
    };

    const addChecklistItem = (checklistId, text) => {
        if (readOnly || !text.trim()) return;
        setLocalTask(prev => ({
            ...prev,
            checklists: prev.checklists.map(cl => 
                cl.id === checklistId 
                    ? { 
                        ...cl, 
                        items: [...cl.items, { id: crypto.randomUUID(), text, completed: false }] 
                      }
                    : cl
            )
        }));
    };

    const toggleChecklistItem = (checklistId, itemId) => {
        // Allow clients to check items if assigned to them or if not readOnly
        const isAssignedToMe = (currentClientId && (localTask.assignedTo || []).includes(currentClientId)) || 
                               (session?.user?.id && (localTask.assignedTo || []).includes(session.user.id));
        
        if (readOnly && !isAssignedToMe) return;
        
        setLocalTask(prev => ({
            ...prev,
            checklists: prev.checklists.map(cl => 
                cl.id === checklistId 
                    ? {
                        ...cl,
                        items: cl.items.map(item => 
                            item.id === itemId ? { ...item, completed: !item.completed } : item
                        )
                      }
                    : cl
            )
        }));
    };

    const deleteChecklistItem = (checklistId, itemId) => {
        if (readOnly) return;
        setLocalTask(prev => ({
            ...prev,
            checklists: prev.checklists.map(cl => 
                cl.id === checklistId 
                    ? { ...cl, items: cl.items.filter(i => i.id !== itemId) }
                    : cl
            )
        }));
    };

    // Attachment Management
    const addAttachment = () => {
        if (readOnly || !newAttachmentUrl.trim()) return;
        const name = newAttachmentName.trim() || newAttachmentUrl;
        const newAttachment = {
            id: crypto.randomUUID(),
            name,
            url: newAttachmentUrl,
            type: 'link' // For now default to link
        };
        setLocalTask(prev => ({
            ...prev,
            attachments: [...(prev.attachments || []), newAttachment]
        }));
        setNewAttachmentUrl('');
        setNewAttachmentName('');
    };

    const removeAttachment = async (id) => {
        if (readOnly) return;
        
        const attachment = localTask.attachments.find(a => a.id === id);
        
        // If it's a file (uploaded to R2), try to delete it from bucket
        if (attachment && attachment.type === 'file' && attachment.url) {
            try {
                await fetch('/api/upload/delete', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: attachment.url })
                });
            } catch (err) {
                console.error("Erro ao deletar arquivo do bucket:", err);
            }
        }

        setLocalTask(prev => ({
            ...prev,
            attachments: (prev.attachments || []).filter(a => a.id !== id)
        }));
    };

    const toggleClientAssignment = (clientId) => {
        if (readOnly) return;
        const currentAssignments = localTask.assignedTo || [];
        let newAssignments;
        
        if (currentAssignments.includes(clientId)) {
            newAssignments = currentAssignments.filter(id => id !== clientId);
        } else {
            newAssignments = [...currentAssignments, clientId];
        }
        
        setLocalTask(prev => ({
            ...prev,
            assignedTo: newAssignments
        }));
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-surface border border-white/10 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
                
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-start bg-white/5">
                    <div className="flex-1 mr-4">
                        <div className="flex items-center gap-4">
                            <input
                                type="text"
                                value={localTask.text || ''}
                                onChange={(e) => updateField('text', e.target.value)}
                                disabled={readOnly}
                                className="flex-1 bg-transparent text-2xl font-bold text-white border-none focus:ring-0 p-0 placeholder-white/30"
                                placeholder="Título da Tarefa"
                            />
                        </div>
                        <div className="text-sm text-text-muted mt-1">
                            Na lista: <span className="text-primary">Sub-projeto atual</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-white p-2">
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    
                    {/* Description */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            📝 Descrição
                        </h3>
                        {readOnly ? (
                            <div className="bg-white/5 rounded-lg p-4 text-gray-300 min-h-[60px] whitespace-pre-wrap">
                                {localTask.description || "Nenhuma descrição."}
                            </div>
                        ) : (
                            <textarea
                                value={localTask.description || ''}
                                onChange={(e) => updateField('description', e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-gray-300 min-h-[120px] focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                                placeholder="Adicione uma descrição mais detalhada..."
                            />
                        )}
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-text-muted flex items-center gap-2 uppercase tracking-wider">
                                <Clock size={16} className="text-primary" /> Data de Início
                            </h3>
                            <input
                                type="date"
                                value={localTask.startDate || ''}
                                onChange={(e) => updateField('startDate', e.target.value)}
                                disabled={readOnly}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                            />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-text-muted flex items-center gap-2 uppercase tracking-wider">
                                <Calendar size={16} className="text-primary" /> Data de Entrega
                            </h3>
                            <input
                                type="date"
                                value={localTask.dueDate || ''}
                                onChange={(e) => updateField('dueDate', e.target.value)}
                                disabled={readOnly}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Assigned Clients - New Section */}
                    {!readOnly && availableClients.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-white/10">
                             <h3 className="text-sm font-semibold text-text-muted flex items-center gap-2 uppercase tracking-wider">
                                👥 Responsáveis / Clientes
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {availableClients.map(client => {
                                    const isAssigned = (localTask.assignedTo || []).includes(client.id);
                                    return (
                                        <button
                                            key={client.id}
                                            onClick={() => toggleClientAssignment(client.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${
                                                isAssigned 
                                                ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(255,107,0,0.3)]' 
                                                : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:text-white'
                                            }`}
                                        >
                                            {isAssigned ? '✓' : '+'} {client.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Finance Actions */}
                    {!readOnly && projectId && (
                        <div className="pt-4 border-t border-white/10">
                            <Link 
                                href={`/admin/finance/new?projectId=${projectId}${subProjectId ? `&subProjectId=${subProjectId}` : ''}&subProjectItemId=${localTask.id}&description=${encodeURIComponent(localTask.text || '')}&type=expense`}
                                className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-white bg-emerald-400/10 hover:bg-emerald-500 px-4 py-2 rounded-lg transition-all border border-emerald-500/20 shadow-lg shadow-emerald-500/5"
                                target="_blank"
                            >
                                <DollarSign size={14} /> Registrar Custo/Receita desta Tarefa
                            </Link>
                        </div>
                    )}

                    {/* Checklists */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                ✅ Checklists
                            </h3>
                        </div>

                        {/* Existing Checklists */}
                        {(localTask.checklists || []).map(checklist => (
                            <div key={checklist.id} className="bg-white/5 rounded-lg p-4 border border-white/5">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-medium text-white">{checklist.title}</h4>
                                    {/* Progress Bar */}
                                    <div className="text-xs text-text-muted">
                                        {Math.round((checklist.items.filter(i => i.completed).length / (checklist.items.length || 1)) * 100)}%
                                    </div>
                                </div>
                                
                                {/* Progress Bar Visual */}
                                <div className="w-full bg-black/40 h-1.5 rounded-full mb-4 overflow-hidden">
                                    <div 
                                        className="bg-primary h-full transition-all duration-300"
                                        style={{ width: `${Math.round((checklist.items.filter(i => i.completed).length / (checklist.items.length || 1)) * 100)}%` }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    {checklist.items.map(item => (
                                        <div key={item.id} className="flex items-center gap-2 group">
                                            <input
                                                type="checkbox"
                                                checked={item.completed}
                                                onChange={() => toggleChecklistItem(checklist.id, item.id)}
                                                disabled={readOnly && !((currentClientId && (localTask.assignedTo || []).includes(currentClientId)) || (session?.user?.id && (localTask.assignedTo || []).includes(session.user.id)))}
                                                className={`rounded bg-black/20 border-white/10 text-primary focus:ring-primary/50 ${
                                                    readOnly && !((currentClientId && (localTask.assignedTo || []).includes(currentClientId)) || (session?.user?.id && (localTask.assignedTo || []).includes(session.user.id)))
                                                    ? 'cursor-not-allowed opacity-50' 
                                                    : 'cursor-pointer'
                                                }`}
                                            />
                                            <span className={`flex-1 text-sm ${item.completed ? 'line-through text-text-muted' : 'text-gray-300'}`}>
                                                {item.text}
                                            </span>
                                            {!readOnly && (
                                                <button 
                                                    onClick={() => deleteChecklistItem(checklist.id, item.id)}
                                                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {!readOnly && (
                                    <div className="mt-3 flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Adicionar item..."
                                            className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-primary/50"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    addChecklistItem(checklist.id, e.target.value);
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Add New Checklist */}
                        {!readOnly && (
                            <div className="flex gap-2 items-center mt-2">
                                <input
                                    type="text"
                                    value={newChecklistTitle}
                                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                                    placeholder="Nome da nova checklist..."
                                    className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary/50"
                                />
                                <button
                                    onClick={addChecklist}
                                    disabled={!newChecklistTitle.trim()}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm text-white transition-colors disabled:opacity-50"
                                >
                                    Adicionar Checklist
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Attachments */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            📎 Anexos
                        </h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(localTask.attachments || []).map(att => (
                                <div key={att.id} className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors group">
                                    <div className="bg-primary/10 p-2 rounded text-xl">
                                        🔗
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white truncate">{att.name}</div>
                                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
                                            {att.url}
                                        </a>
                                    </div>
                                    {!readOnly && (
                                        <button 
                                            onClick={() => removeAttachment(att.id)}
                                            className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Upload Section - Always visible for authenticated users */}
                        <div className="bg-white/5 rounded-lg p-4 border border-dashed border-white/10 mt-2">
                            <div className="flex flex-col gap-2">
                                <div className="mb-2">
                                        <label className="block text-xs text-text-muted mb-1">Upload de Arquivo</label>
                                        <R2Uploader 
                                            folderPath={
                                                clientName && projectName && subProjectName 
                                                ? `${clientName}/${projectName}/${subProjectName}` 
                                                : projectName && subProjectName 
                                                    ? `${projectName}/${subProjectName}`
                                                    : (projectName || 'uploads')
                                            }
                                            onUploadComplete={(url, fileName) => {
                                                // Auto-attach upon upload completion
                                                const newAttachment = {
                                                    id: crypto.randomUUID(),
                                                    name: fileName,
                                                    url: url,
                                                    type: 'file'
                                                };
                                                setLocalTask(prev => ({
                                                    ...prev,
                                                    attachments: [...(prev.attachments || []), newAttachment]
                                                }));
                                                // Clear inputs just in case
                                                setNewAttachmentUrl('');
                                                setNewAttachmentName('');
                                            }}
                                        />
                                    </div>

                                <div className="border-t border-white/5 my-2"></div>
                                
                                <label className="block text-xs text-text-muted">Ou adicione um link manualmente</label>
                                <input
                                    type="text"
                                    value={newAttachmentName}
                                    onChange={(e) => setNewAttachmentName(e.target.value)}
                                    placeholder="Nome do anexo (opcional)"
                                    className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary/50"
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={newAttachmentUrl}
                                        onChange={(e) => setNewAttachmentUrl(e.target.value)}
                                        placeholder="Cole o link aqui (Google Drive, Figma, etc)..."
                                        className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary/50"
                                    />
                                    <button
                                        onClick={addAttachment}
                                        disabled={!newAttachmentUrl.trim()}
                                        className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 rounded text-sm transition-colors disabled:opacity-50"
                                    >
                                        Anexar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Comments Section - Trello Style */}
                    <div className="space-y-4 pt-4 border-t border-white/10">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <MessageSquare size={20} className="text-primary" /> Comentários
                        </h3>

                        {/* Comment Input */}
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 space-y-2">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Escreva um comentário..."
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-gray-300 min-h-[80px] focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none"
                                />
                                <div className="flex justify-end">
                                    <button
                                        onClick={addComment}
                                        disabled={!newComment.trim()}
                                        className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primary/90 text-white text-sm rounded-lg font-medium transition-all disabled:opacity-50"
                                    >
                                        <Send size={14} /> Comentar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Comments List */}
                        <div className="space-y-6 mt-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {(localTask.comments || []).slice().reverse().map(comment => (
                                <div key={comment.id} className="flex gap-3 group">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 text-xs font-bold shrink-0 overflow-hidden border border-white/5">
                                        {comment.userImage ? (
                                            <img src={comment.userImage} alt={comment.userName} className="w-full h-full object-cover" />
                                        ) : (
                                            comment.userName?.[0]?.toUpperCase() || 'U'
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-white">{comment.userName}</span>
                                            <span className="text-[10px] text-text-muted" suppressHydrationWarning>
                                                {new Date(comment.createdAt).toLocaleString('pt-BR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                            {comment.userRole === 'admin' && (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded uppercase font-bold">Admin</span>
                                            )}
                                        </div>
                                        <div className="bg-white/5 border border-white/5 rounded-lg p-3 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                                            {comment.text}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!localTask.comments || localTask.comments.length === 0) && (
                                <div className="text-center py-8 text-text-muted text-sm italic">
                                    Nenhum comentário ainda. Seja o primeiro a comentar!
                                </div>
                            )}
                            <div ref={commentsEndRef} />
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex justify-between items-center bg-white/5">
                    <div>
                        {!readOnly && projectId && (
                            <Link 
                                href={`/admin/finance/new?projectId=${projectId}${subProjectId ? `&subProjectId=${subProjectId}` : ''}&subProjectItemId=${task.id}&description=${encodeURIComponent(task.text || task.title || '')}&type=expense`}
                                className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-white bg-emerald-400/10 hover:bg-emerald-500 px-4 py-2 rounded-lg transition-all border border-emerald-500/20"
                                target="_blank"
                            >
                                <DollarSign size={14} /> Registrar Custo/Receita
                            </Link>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-text-muted hover:text-white transition-colors"
                        >
                            Fechar
                        </button>
                        {(!readOnly || ((currentClientId && (localTask.assignedTo || []).includes(currentClientId)) || (session?.user?.id && (localTask.assignedTo || []).includes(session.user.id)))) && (
                            <button 
                                onClick={handleSave}
                                className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium shadow-lg shadow-primary/20 transition-all"
                            >
                                Salvar Alterações
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}