'use client';

import { useState, useEffect, useMemo } from 'react';
import { getR2Files } from 'app/actions/file-actions';
import { Folder, FileText, ChevronRight, Home, Upload, Trash2, Download, RefreshCw, ArrowLeft, Link as LinkIcon, Box, File, ExternalLink } from 'lucide-react';
import R2Uploader from 'components/R2Uploader';
import { useTaskNavigation } from 'components/projects/TaskNavigationContext';
import TaskPreviewModal from './TaskPreviewModal';

export default function FileManager({ 
    initialPath = '', 
    title = "Gerenciador de Arquivos",
    projectSubProjects = [],
    projectFiles = []
}) {
    const { requestOpenTask } = useTaskNavigation(); // May be null if outside provider
    const [currentPath, setCurrentPath] = useState(initialPath);
    const [viewMode, setViewMode] = useState('folders'); // 'folders' or 'all'
    const [items, setItems] = useState({ folders: [], files: [] });
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Preview Modal State
    const [previewTask, setPreviewTask] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    useEffect(() => {
        loadFiles();
    }, [currentPath, viewMode, refreshTrigger]);

    const loadFiles = async () => {
        setLoading(true);
        try {
            // If viewing all files, we use the initialPath (root of project) and recursive=true
            // If viewing folders, we use currentPath and recursive=false
            const path = viewMode === 'all' ? initialPath : currentPath;
            const recursive = viewMode === 'all';
            
            const data = await getR2Files(path, recursive);
            setItems(data);
        } catch (error) {
            console.error("Failed to load files:", error);
        } finally {
            setLoading(false);
        }
    };

    // Create a map of File URL -> Context (Task Name, SubProject, etc.)
    const fileContextMap = useMemo(() => {
        const map = new Map();

        // 1. Map Project General Files
        if (projectFiles && Array.isArray(projectFiles)) {
            projectFiles.forEach(f => {
                if (f.url) map.set(f.url, { type: 'project', label: 'Arquivo Geral', color: 'text-blue-400', projectName: f.projectName });
            });
        }

        // 2. Map Task Attachments
        if (projectSubProjects && Array.isArray(projectSubProjects)) {
            projectSubProjects.forEach(sub => {
                const subProjectName = sub.name;
                const projectName = sub.projectName; // Assuming passed from parent
                const projectId = sub.projectId;
                (sub.content?.stages || []).forEach(stage => {
                    (stage.items || []).forEach(task => {
                        (task.attachments || []).forEach(att => {
                            if (att.url) {
                                map.set(att.url, { 
                                    type: 'task', 
                                    label: `Tarefa: ${task.text}`, 
                                    subLabel: subProjectName,
                                    color: 'text-emerald-400',
                                    subProjectId: sub.id,
                                    taskId: task.id,
                                    projectName,
                                    projectId,
                                    taskObj: task // Full task object for preview
                                });
                            }
                        });
                    });
                });
            });
        }

        return map;
    }, [projectSubProjects, projectFiles]);

    const getFileContext = (fileUrl) => {
        // Try exact match
        if (fileContextMap.has(fileUrl)) return fileContextMap.get(fileUrl);
        
        // Try matching by filename if exact URL fails (sometimes R2/S3 URLs vary slightly or just protocol)
        // This is a fuzzy fallback
        /* 
        for (const [url, context] of fileContextMap.entries()) {
            if (url.endsWith(fileUrl.split('/').pop())) return context;
        }
        */
        return null;
    };

    const handleOpenTask = (context) => {
        // If we are inside the project page context (TaskNavigationProvider exists), use it
        if (requestOpenTask) {
            requestOpenTask(context.subProjectId, context.taskId);
        } else {
            // Otherwise, we are likely in global view, open Preview Modal
            setPreviewTask({
                ...context.taskObj,
                projectName: context.projectName,
                subProjectName: context.subLabel,
                projectId: context.projectId
            });
            setIsPreviewOpen(true);
        }
    };

    const handleNavigate = (path) => {
        setCurrentPath(path);
    };

    const handleNavigateUp = () => {
        if (!currentPath) return;
        // Remove trailing slash if exists
        const cleanPath = currentPath.endsWith('/') ? currentPath.slice(0, -1) : currentPath;
        const parentPath = cleanPath.split('/').slice(0, -1).join('/');
        setCurrentPath(parentPath ? parentPath + '/' : '');
    };

    const handleDelete = async (url) => {
        if (!confirm("Tem certeza que deseja excluir este arquivo? Esta ação é irreversível.")) return;
        
        try {
            await fetch('/api/upload/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            console.error("Erro ao deletar:", err);
            alert("Erro ao deletar arquivo.");
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Breadcrumbs
    const pathParts = currentPath.split('/').filter(Boolean);

    return (
        <div className="bg-surface rounded-xl border border-white/5 shadow-xl flex flex-col h-[600px]">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-2">
                    <h2 className="font-bold text-white flex items-center gap-2">
                        <Folder className="text-primary" size={20} /> {title}
                    </h2>
                </div>
                <div className="flex gap-2">
                     <div className="flex bg-black/20 rounded-lg p-1 border border-white/5">
                        <button
                            onClick={() => setViewMode('folders')}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'folders' ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-white'}`}
                        >
                            <Folder size={14} /> Pastas
                        </button>
                        <button
                            onClick={() => setViewMode('all')}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'all' ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-white'}`}
                        >
                            <FileText size={14} /> Todos os Arquivos
                        </button>
                    </div>

                    <button 
                        onClick={() => setRefreshTrigger(prev => prev + 1)} 
                        className="p-2 text-text-muted hover:text-white hover:bg-white/10 rounded transition-colors"
                        title="Atualizar"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Toolbar & Breadcrumbs (Only visible in Folders mode) */}
            {viewMode === 'folders' && (
                <div className="p-4 border-b border-white/5 flex flex-col gap-4">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-1 text-sm overflow-x-auto whitespace-nowrap pb-2 scrollbar-thin">
                        <button 
                            onClick={() => setCurrentPath('')}
                            className={`flex items-center hover:bg-white/10 px-2 py-1 rounded transition-colors ${currentPath === '' ? 'text-white font-bold' : 'text-text-muted'}`}
                        >
                            <Home size={14} className="mr-1" /> Raiz
                        </button>
                        {pathParts.map((part, index) => {
                            const path = pathParts.slice(0, index + 1).join('/') + '/';
                            return (
                                <div key={path} className="flex items-center">
                                    <ChevronRight size={14} className="text-gray-600 mx-1" />
                                    <button 
                                        onClick={() => setCurrentPath(path)}
                                        className={`hover:bg-white/10 px-2 py-1 rounded transition-colors ${currentPath === path ? 'text-white font-bold' : 'text-text-muted'}`}
                                    >
                                        {part}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {currentPath && (
                            <button 
                                onClick={handleNavigateUp}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-sm rounded transition-colors border border-white/5"
                            >
                                <ArrowLeft size={14} /> Voltar
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Content Area - Table View */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-text-muted">
                        <RefreshCw className="animate-spin mr-2" /> Carregando...
                    </div>
                ) : items.folders.length === 0 && items.files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-muted opacity-50">
                        <Folder size={48} className="mb-2" />
                        <p>Pasta vazia</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                <th className="p-3 text-xs font-bold text-text-muted uppercase tracking-wider w-8"></th>
                                <th className="p-3 text-xs font-bold text-text-muted uppercase tracking-wider">Nome</th>
                                <th className="p-3 text-xs font-bold text-text-muted uppercase tracking-wider">Contexto</th>
                                <th className="p-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Tamanho</th>
                                <th className="p-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Data</th>
                                <th className="p-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right w-24">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {/* Folders */}
                            {items.folders.map((folder) => (
                                <tr 
                                    key={folder.path}
                                    onClick={() => handleNavigate(folder.path)}
                                    className="hover:bg-white/5 cursor-pointer group transition-colors"
                                >
                                    <td className="p-3 text-center">
                                        <Folder size={18} className="text-yellow-500 mx-auto" />
                                    </td>
                                    <td className="p-3 font-medium text-white">{folder.name}</td>
                                    <td className="p-3 text-xs text-text-muted">-</td>
                                    <td className="p-3 text-xs text-text-muted text-right">-</td>
                                    <td className="p-3 text-xs text-text-muted text-right">-</td>
                                    <td className="p-3 text-right">
                                        <button className="p-1.5 text-text-muted hover:text-white rounded hover:bg-white/10">
                                            <ChevronRight size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {/* Files */}
                            {items.files.map((file) => {
                                const context = getFileContext(file.url);
                                
                                return (
                                    <tr key={file.path} className="hover:bg-white/5 group transition-colors">
                                        <td className="p-3 text-center">
                                            <FileText size={18} className="text-blue-400 mx-auto" />
                                        </td>
                                        <td className="p-3">
                                            <div className="font-medium text-white break-all line-clamp-1" title={file.name}>{file.name}</div>
                                        </td>
                                        <td className="p-3">
                                            {context ? (
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-bold ${context.color}`}>{context.label}</span>
                                                    {context.subLabel && <span className="text-[10px] text-text-muted">{context.subLabel}</span>}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-text-muted opacity-50">-</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-xs text-text-muted text-right whitespace-nowrap">{formatSize(file.size)}</td>
                                        <td className="p-3 text-xs text-text-muted text-right whitespace-nowrap">
                                            {new Date(file.lastModified).toLocaleDateString()}
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {context?.type === 'task' && (
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            handleOpenTask(context);
                                                        }}
                                                        className="p-1.5 text-text-muted hover:text-emerald-400 hover:bg-white/10 rounded"
                                                        title="Abrir Tarefa"
                                                    >
                                                        <ExternalLink size={14} />
                                                    </button>
                                                )}
                                                <a 
                                                    href={file.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    download
                                                    className="p-1.5 text-text-muted hover:text-primary hover:bg-white/10 rounded"
                                                    title="Baixar"
                                                >
                                                    <Download size={14} />
                                                </a>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(file.url); }}
                                                    className="p-1.5 text-text-muted hover:text-red-400 hover:bg-white/10 rounded"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Upload Footer */}
            <div className="p-4 border-t border-white/5 bg-black/20">
                <div className="flex items-center gap-2 mb-2">
                    <Upload size={14} className="text-text-muted" />
                    <span className="text-xs text-text-muted uppercase tracking-wider">Upload para esta pasta</span>
                </div>
                <R2Uploader 
                    folderPath={currentPath.endsWith('/') ? currentPath.slice(0, -1) : currentPath}
                    onUploadComplete={() => setRefreshTrigger(prev => prev + 1)}
                />
            </div>

            {/* Preview Modal */}
            <TaskPreviewModal 
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                task={previewTask}
                projectName={previewTask?.projectName}
                subProjectName={previewTask?.subProjectName}
                projectId={previewTask?.projectId}
            />
        </div>
    );
}
