'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Plus, Trash2, Save, X } from 'lucide-react';

export default function ProjectLinks({ 
    initialLinks = [], 
    onSave, 
    title = "Links Úteis",
    readOnly = false,
    variant = "default" // "default" or "slim"
}) {
    const [links, setLinks] = useState(initialLinks || []);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Sync with server data
    useEffect(() => {
        setLinks(initialLinks || []);
    }, [initialLinks]);

    const isSlim = variant === "slim";

    const handleAddLink = () => {
        setLinks([...links, { title: '', url: '' }]);
        setIsEditing(true);
    };

    const handleRemoveLink = (index) => {
        const newLinks = [...links];
        newLinks.splice(index, 1);
        setLinks(newLinks);
        if (newLinks.length === 0) setIsEditing(false);
    };

    const handleChange = (index, field, value) => {
        const newLinks = [...links];
        // Ensure the object exists and we're modifying a copy
        const updatedLink = { ...newLinks[index], [field]: value };
        newLinks[index] = updatedLink;
        setLinks(newLinks);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Filter out empty links
            const filteredLinks = links.filter(link => link && link.title?.trim() && link.url?.trim());
            if (onSave) {
                await onSave(filteredLinks);
            }
            setLinks(filteredLinks);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to save links:', error);
            alert('Erro ao salvar links');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setLinks(initialLinks || []);
        setIsEditing(false);
    };

    if (readOnly && (!links || links.length === 0)) return null;

    if (isSlim) {
        return (
            <div className="flex flex-wrap items-center gap-2">
                {links.map((link, index) => (
                    <div key={index} className="flex items-center group/item">
                        {isEditing ? (
                            <div className="flex items-center gap-1 bg-black/40 border border-primary/30 rounded-full px-2 py-0.5">
                                <input 
                                    type="text"
                                    placeholder="Título"
                                    value={link.title}
                                    onChange={(e) => handleChange(index, 'title', e.target.value)}
                                    className="bg-transparent text-[10px] text-white focus:outline-none w-16"
                                />
                                <input 
                                    type="text"
                                    placeholder="URL"
                                    value={link.url}
                                    onChange={(e) => handleChange(index, 'url', e.target.value)}
                                    className="bg-transparent text-[10px] text-text-muted focus:outline-none w-20 font-mono"
                                />
                                <button 
                                    onClick={() => handleRemoveLink(index)}
                                    className="text-red-400 hover:text-red-300 ml-1"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ) : (
                            <a 
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/5 rounded-full hover:bg-white/10 hover:border-primary/30 transition-all group/link"
                                title={link.url}
                            >
                                <ExternalLink size={10} className="text-gray-500 group-hover/link:text-primary transition-colors" />
                                <span className="text-[11px] font-medium text-white group-hover/link:text-primary transition-colors">{link.title}</span>
                            </a>
                        )}
                    </div>
                ))}
                
                {!readOnly && (
                    <div className="flex items-center gap-2">
                        {!isEditing ? (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className={`text-[10px] flex items-center gap-1 transition-colors ${
                                    links.length === 0 
                                        ? 'text-text-muted hover:text-primary' 
                                        : 'text-primary hover:text-primary/80'
                                }`}
                            >
                                <Plus size={10} /> {links.length === 0 ? 'Adicionar Links' : 'Editar'}
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="text-[10px] text-emerald-400 hover:text-emerald-300 disabled:opacity-50 font-medium"
                                >
                                    {isSaving ? '...' : 'Salvar'}
                                </button>
                                <div className="w-[1px] h-3 bg-white/10" />
                                <button 
                                    onClick={handleCancel}
                                    className="text-[10px] text-gray-400 hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <div className="w-[1px] h-3 bg-white/10" />
                                <button 
                                    onClick={handleAddLink}
                                    className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-0.5 font-medium"
                                >
                                    <Plus size={10} /> Novo
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <section className={`bg-surface rounded-xl border border-white/5 overflow-hidden ${readOnly ? 'bg-transparent border-none' : ''}`}>
            <div className={`p-4 border-b border-white/5 flex justify-between items-center ${readOnly ? 'px-0 pt-0 border-none' : ''}`}>
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <ExternalLink size={18} className="text-primary" />
                    {title}
                </h3>
                {!readOnly && (
                    !isEditing ? (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="text-xs text-primary hover:underline"
                        >
                            Editar Links
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button 
                                onClick={handleCancel}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                title="Cancelar"
                            >
                                <X size={18} />
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
                                title="Salvar"
                            >
                                <Save size={18} />
                            </button>
                        </div>
                    )
                )}
            </div>

            <div className={`p-4 space-y-3 ${readOnly ? 'px-0 pb-0' : ''}`}>
                {links.length === 0 && !isEditing && (
                    <p className="text-sm text-text-muted italic text-center py-4">
                        Nenhum link adicionado ainda.
                    </p>
                )}

                <div className={readOnly ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"}>
                    {links.map((link, index) => (
                        <div key={index} className="flex gap-3 items-start group">
                            {isEditing ? (
                                <>
                                    <div className="flex-1 space-y-2">
                                        <input 
                                            type="text"
                                            placeholder="Título (ex: Identidade Visual)"
                                            value={link.title}
                                            onChange={(e) => handleChange(index, 'title', e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50"
                                        />
                                        <input 
                                            type="text"
                                            placeholder="URL (ex: https://drive.google.com/...)"
                                            value={link.url}
                                            onChange={(e) => handleChange(index, 'url', e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50 font-mono"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveLink(index)}
                                        className="p-2 text-red-400/50 hover:text-red-400 transition-colors mt-1"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </>
                            ) : (
                                <a 
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 transition-all group/link"
                                >
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-medium text-white truncate">{link.title}</span>
                                        <span className="text-xs text-text-muted truncate">
                                            {link.url.startsWith('http') ? new URL(link.url).hostname : link.url}
                                        </span>
                                    </div>
                                    <ExternalLink size={14} className="text-gray-500 group-hover/link:text-primary transition-colors flex-shrink-0 ml-2" />
                                </a>
                            )}
                        </div>
                    ))}
                </div>

                {isEditing && (
                    <button 
                        onClick={handleAddLink}
                        className="w-full py-2 border border-dashed border-white/10 rounded-lg text-xs text-text-muted hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                        <Plus size={14} />
                        Adicionar Novo Link
                    </button>
                )}
            </div>
        </section>
    );
}
