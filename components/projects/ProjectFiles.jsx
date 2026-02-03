'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Save, X, ExternalLink } from 'lucide-react';
import R2Uploader from 'components/R2Uploader';

export default function ProjectFiles({ 
    initialFiles = [], 
    onSave, 
    title = "Arquivos Gerais",
    readOnly = false,
    projectId,
    projectName,
    clientName,
    variant = "default" // "default" or "slim"
}) {
    const [files, setFiles] = useState(initialFiles || []);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Sync with server data
    useEffect(() => {
        setFiles(initialFiles || []);
    }, [initialFiles]);

    const isSlim = variant === "slim";

    const handleAddFile = (url, name) => {
        const newFiles = [...files, { id: crypto.randomUUID(), name, url, createdAt: new Date().toISOString() }];
        setFiles(newFiles);
        // Auto-save when adding via upload
        handleSave(newFiles);
    };

    const handleRemoveFile = async (index) => {
        const fileToRemove = files[index];
        const newFiles = [...files];
        newFiles.splice(index, 1);
        setFiles(newFiles);
        
        // Delete from R2 if it's a file URL
        if (fileToRemove.url) {
            try {
                await fetch('/api/upload/delete', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: fileToRemove.url })
                });
            } catch (err) {
                console.error("Erro ao deletar arquivo do bucket:", err);
            }
        }

        await handleSave(newFiles);
    };

    const handleSave = async (filesToSave) => {
        setIsSaving(true);
        try {
            if (onSave) {
                await onSave(filesToSave);
            }
        } catch (error) {
            console.error("Erro ao salvar arquivos:", error);
            alert("Erro ao salvar arquivos.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={`
            ${isSlim ? 'w-full' : 'bg-surface/30 rounded-2xl border border-white/5 overflow-hidden'}
        `}>
            {/* Header - Only show if title is provided */}
            {title && (
                <div className={`
                    flex justify-between items-center
                    ${isSlim ? 'mb-2' : 'p-4 border-b border-white/5 bg-white/5'}
                `}>
                    <div className="flex items-center gap-2">
                        <h3 className={`font-bold text-white ${isSlim ? 'text-xs uppercase tracking-wider text-text-muted' : 'text-sm uppercase tracking-wider'}`}>
                            {title}
                        </h3>
                        {isSaving && <span className="text-xs text-primary animate-pulse">Salvando...</span>}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className={`${isSlim ? '' : 'p-4'}`}>
                {files.length === 0 && !isEditing ? (
                    <div className="text-center py-6 text-text-muted bg-black/20 rounded-lg border border-dashed border-white/5">
                        <FileText size={24} className="mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Nenhum arquivo anexado.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {files.map((file, index) => (
                            <div key={file.id || index} className="flex items-center gap-3 bg-white/5 p-2.5 rounded-lg border border-white/5 group hover:border-white/10 transition-colors">
                                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <FileText size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-white font-medium truncate" title={file.name}>
                                        {file.name}
                                    </div>
                                    <div className="flex gap-3 text-[10px] text-text-muted">
                                        <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline flex items-center gap-1">
                                            Abrir <ExternalLink size={10} />
                                        </a>
                                    </div>
                                </div>
                                
                                {!readOnly && (
                                    <button 
                                        onClick={() => handleRemoveFile(index)}
                                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remover arquivo"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Upload Action */}
                {!readOnly && (
                    <div className="mt-4">
                        <label className="text-xs text-text-muted mb-2 block">Adicionar novo arquivo:</label>
                        <R2Uploader 
                            folderPath={
                                clientName && projectName 
                                ? `${clientName}/${projectName}/Geral` 
                                : projectName 
                                    ? `${projectName}/Geral`
                                    : 'uploads/Geral'
                            }
                            onUploadComplete={handleAddFile}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
