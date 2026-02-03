'use client';

import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Save, X, Eye, EyeOff, ExternalLink, Copy, Check } from 'lucide-react';

export default function ProjectCredentials({ 
    initialCredentials = [], 
    onSave, 
    title = "Acessos e Senhas",
    readOnly = false,
    variant = "default" // "default" or "slim"
}) {
    const [credentials, setCredentials] = useState(initialCredentials || []);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showPasswords, setShowPasswords] = useState({});
    const [copiedIndex, setCopiedIndex] = useState(null);

    // Sync with server data
    useEffect(() => {
        setCredentials(initialCredentials || []);
    }, [initialCredentials]);

    const isSlim = variant === "slim";

    const handleAddCredential = () => {
        setCredentials([...credentials, { name: '', url: '', username: '', password: '' }]);
        setIsEditing(true);
    };

    const handleRemoveCredential = (index) => {
        const newCredentials = [...credentials];
        newCredentials.splice(index, 1);
        setCredentials(newCredentials);
        if (newCredentials.length === 0) setIsEditing(false);
    };

    const handleChange = (index, field, value) => {
        const newCredentials = [...credentials];
        newCredentials[index] = { ...newCredentials[index], [field]: value };
        setCredentials(newCredentials);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Filter out empty credentials
            const filteredCredentials = credentials.filter(cred => 
                cred && (cred.name?.trim() || cred.username?.trim() || cred.password?.trim() || cred.url?.trim())
            );
            if (onSave) {
                await onSave(filteredCredentials);
            }
            setCredentials(filteredCredentials);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to save credentials:', error);
            alert('Erro ao salvar credenciais');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setCredentials(initialCredentials || []);
        setIsEditing(false);
    };

    const togglePasswordVisibility = (index) => {
        setShowPasswords(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const copyToClipboard = (text, index) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    if (readOnly && (!credentials || credentials.length === 0)) return null;

    if (isSlim) {
        return (
            <div className="flex flex-wrap items-center gap-2">
                {credentials.map((cred, index) => (
                    <div key={index} className="flex items-center group/item">
                        {isEditing ? (
                            <div className="flex flex-col gap-1 bg-black/40 border border-primary/30 rounded-lg p-2 min-w-[200px]">
                                <input 
                                    type="text"
                                    placeholder="Nome (ex: Hosting)"
                                    value={cred.name}
                                    onChange={(e) => handleChange(index, 'name', e.target.value)}
                                    className="bg-transparent text-[10px] text-white focus:outline-none border-b border-white/5 pb-1"
                                />
                                <input 
                                    type="text"
                                    placeholder="Link / URL"
                                    value={cred.url}
                                    onChange={(e) => handleChange(index, 'url', e.target.value)}
                                    className="bg-transparent text-[10px] text-text-muted focus:outline-none border-b border-white/5 pb-1 font-mono"
                                />
                                <input 
                                    type="text"
                                    placeholder="Usuário"
                                    value={cred.username}
                                    onChange={(e) => handleChange(index, 'username', e.target.value)}
                                    className="bg-transparent text-[10px] text-text-muted focus:outline-none border-b border-white/5 pb-1"
                                />
                                <div className="flex items-center gap-1">
                                    <input 
                                        type={showPasswords[index] ? "text" : "password"}
                                        placeholder="Senha"
                                        value={cred.password}
                                        onChange={(e) => handleChange(index, 'password', e.target.value)}
                                        className="bg-transparent text-[10px] text-text-muted focus:outline-none flex-1 font-mono"
                                    />
                                    <button onClick={() => togglePasswordVisibility(index)} className="text-gray-500 hover:text-white">
                                        {showPasswords[index] ? <EyeOff size={10} /> : <Eye size={10} />}
                                    </button>
                                    <button 
                                        onClick={() => handleRemoveCredential(index)}
                                        className="text-red-400 hover:text-red-300 ml-1"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/5 rounded-full hover:bg-white/10 hover:border-primary/30 transition-all group/cred">
                                <Key size={10} className="text-gray-500 group-hover/cred:text-primary transition-colors" />
                                <span className="text-[11px] font-medium text-white group-hover/cred:text-primary transition-colors">{cred.name || cred.username || 'Acesso'}</span>
                                <div className="hidden group-hover/cred:flex items-center gap-1 ml-1 pl-1 border-l border-white/10">
                                    <button 
                                        onClick={() => copyToClipboard(cred.password, index)}
                                        className="text-gray-500 hover:text-primary transition-colors"
                                        title="Copiar Senha"
                                    >
                                        {copiedIndex === index ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                                    </button>
                                    {cred.url && (
                                        <a href={cred.url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary transition-colors">
                                            <ExternalLink size={10} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                
                {!readOnly && (
                    <div className="flex items-center gap-2">
                        {!isEditing ? (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className={`text-[10px] flex items-center gap-1 transition-colors ${
                                    credentials.length === 0 
                                        ? 'text-text-muted hover:text-primary' 
                                        : 'text-primary hover:text-primary/80'
                                }`}
                            >
                                <Plus size={10} /> {credentials.length === 0 ? 'Adicionar Acessos' : 'Editar'}
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
                                    onClick={handleAddCredential}
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
                    {title && <Key size={18} className="text-primary" />}
                    {title}
                </h3>
                {!readOnly && (
                    !isEditing ? (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="text-xs text-primary hover:underline"
                        >
                            Editar Acessos
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

            <div className={`p-4 space-y-4 ${readOnly ? 'px-0 pb-0' : ''}`}>
                {credentials.length === 0 && !isEditing && (
                    <p className="text-sm text-text-muted italic text-center py-4">
                        Nenhum acesso registrado.
                    </p>
                )}

                <div className="space-y-4">
                    {credentials.map((cred, index) => (
                        <div key={index} className="bg-black/20 rounded-lg border border-white/5 overflow-hidden group">
                            {isEditing ? (
                                <div className="p-3 space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <input 
                                            type="text"
                                            placeholder="Nome (ex: WordPress)"
                                            value={cred.name}
                                            onChange={(e) => handleChange(index, 'name', e.target.value)}
                                            className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50"
                                        />
                                        <input 
                                            type="text"
                                            placeholder="URL (ex: https://...)"
                                            value={cred.url}
                                            onChange={(e) => handleChange(index, 'url', e.target.value)}
                                            className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50 font-mono"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input 
                                            type="text"
                                            placeholder="Usuário"
                                            value={cred.username}
                                            onChange={(e) => handleChange(index, 'username', e.target.value)}
                                            className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50"
                                        />
                                        <div className="relative">
                                            <input 
                                                type={showPasswords[index] ? "text" : "password"}
                                                placeholder="Senha"
                                                value={cred.password}
                                                onChange={(e) => handleChange(index, 'password', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50 font-mono"
                                            />
                                            <button 
                                                onClick={() => togglePasswordVisibility(index)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                            >
                                                {showPasswords[index] ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveCredential(index)}
                                        className="w-full py-1 text-[10px] text-red-400/50 hover:text-red-400 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Trash2 size={10} /> Remover Acesso
                                    </button>
                                </div>
                            ) : (
                                <div className="p-3">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-semibold text-white truncate">{cred.name || 'Acesso'}</h4>
                                            {cred.url && (
                                                <a href={cred.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-0.5 truncate">
                                                    {cred.url} <ExternalLink size={8} />
                                                </a>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            <button 
                                                onClick={() => copyToClipboard(cred.password, index)}
                                                className="p-1.5 text-gray-500 hover:text-primary transition-colors bg-white/5 rounded"
                                                title="Copiar Senha"
                                            >
                                                {copiedIndex === index ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-text-muted block uppercase">Usuário</span>
                                            <div className="flex items-center justify-between bg-black/40 rounded px-2 py-1 group/field">
                                                <span className="text-xs text-white truncate">{cred.username || '-'}</span>
                                                <button onClick={() => copyToClipboard(cred.username)} className="opacity-0 group-hover/field:opacity-100 text-gray-500 hover:text-white transition-all">
                                                    <Copy size={10} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-text-muted block uppercase">Senha</span>
                                            <div className="flex items-center justify-between bg-black/40 rounded px-2 py-1 group/field">
                                                <span className="text-xs text-white font-mono">
                                                    {showPasswords[index] ? cred.password : '••••••••'}
                                                </span>
                                                <button 
                                                    onClick={() => togglePasswordVisibility(index)} 
                                                    className="text-gray-500 hover:text-white transition-all"
                                                >
                                                    {showPasswords[index] ? <EyeOff size={10} /> : <Eye size={10} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {isEditing && (
                    <button 
                        onClick={handleAddCredential}
                        className="w-full py-2 border border-dashed border-white/10 rounded-lg text-xs text-text-muted hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                        <Plus size={14} />
                        Adicionar Novo Acesso
                    </button>
                )}
            </div>
        </section>
    );
}
