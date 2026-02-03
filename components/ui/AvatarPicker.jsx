'use client';

import { useState, useEffect } from 'react';
import multiavatar from '@multiavatar/multiavatar';
import { RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';
import R2Uploader from '../R2Uploader';

export default function AvatarPicker({ initialValue, onChange, name = "avatar", clientName }) {
    // Parse initial value
    const parseInitialValue = (val) => {
        if (!val) return { type: 'upload', style: 'multiavatar', seed: crypto.randomUUID(), url: '' };
        
        // Check if it's a URL (Upload)
        if (val.startsWith('http') || val.startsWith('https://')) {
            return { type: 'upload', url: val };
        }

        const parts = val.split(':');
        if (parts.length > 1) return { type: 'generated', style: parts[0], seed: parts[1] };
        return { type: 'generated', style: 'multiavatar', seed: val };
    };

    const initial = parseInitialValue(initialValue);
    const [mode, setMode] = useState(initial.type); // 'generated' or 'upload'
    const [currentSeed, setCurrentSeed] = useState(initial.seed || crypto.randomUUID());
    const [currentStyle, setCurrentStyle] = useState(initial.style || 'multiavatar');
    const [uploadedUrl, setUploadedUrl] = useState(initial.url || '');
    const [displayContent, setDisplayContent] = useState(null);

    // Update parent and display content
    useEffect(() => {
        if (mode === 'upload') {
            if (uploadedUrl) {
                setDisplayContent({ type: 'img', value: uploadedUrl });
                if (onChange) onChange(uploadedUrl);
            }
            return;
        }

        // Generated Mode
        const fullValue = `${currentStyle}:${currentSeed}`;
        
        if (currentStyle === 'multiavatar') {
            setDisplayContent({ type: 'svg', value: multiavatar(currentSeed) });
        } else {
            let dicebearStyle = currentStyle;
            if (currentStyle === 'human') dicebearStyle = 'avataaars';
            if (currentStyle === 'bot') dicebearStyle = 'bottts';
            
            const url = `https://api.dicebear.com/9.x/${dicebearStyle}/svg?seed=${encodeURIComponent(currentSeed)}`;
            setDisplayContent({ type: 'img', value: url });
        }

        if (onChange) {
            onChange(fullValue);
        }
    }, [mode, currentSeed, currentStyle, uploadedUrl, onChange]);

    const handleRefresh = (e) => {
        e.preventDefault();
        setCurrentSeed(crypto.randomUUID());
    };

    const handleUploadComplete = (url) => {
        setUploadedUrl(url);
    };

    const STYLES = [
        { id: 'multiavatar', label: 'Abstrato', icon: '🎨' },
        { id: 'human', label: 'Pessoas', icon: '🧑' },
        { id: 'adventurer', label: 'Aventura', icon: '🧙‍♂️' },
        { id: 'bot', label: 'Robôs', icon: '🤖' },
        { id: 'initials', label: 'Iniciais', icon: '🔤' },
        { id: 'identicon', label: 'Padrões', icon: '🧩' },
    ];

    const PRESETS = [
        'Star', 'Rocket', 'Moon', 'Sun', 'Cloud', 
        'Ocean', 'Forest', 'Mountain', 'Fire', 'Water',
        'Tech', 'Cyber', 'Code', 'Data', 'Net'
    ];

    return (
        <div className="flex flex-col gap-6">
            <input type="hidden" name={name} value={mode === 'upload' ? uploadedUrl : `${currentStyle}:${currentSeed}`} />
            
            {/* Mode Switcher */}
            <div className="flex bg-black/20 p-1 rounded-lg border border-white/10 w-fit">
                <button
                    type="button"
                    onClick={() => setMode('generated')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                        mode === 'generated' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-white'
                    }`}
                >
                    <RefreshCw size={14} />
                    Gerar Avatar
                </button>
                <button
                    type="button"
                    onClick={() => setMode('upload')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                        mode === 'upload' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-white'
                    }`}
                >
                    <Upload size={14} />
                    Fazer Upload
                </button>
            </div>

            {mode === 'generated' ? (
                <>
                    {/* Style Selector */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
                        {STYLES.map((style) => (
                            <button
                                key={style.id}
                                onClick={(e) => { e.preventDefault(); setCurrentStyle(style.id); }}
                                className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm whitespace-nowrap transition-colors border ${
                                    currentStyle === style.id 
                                        ? 'bg-primary/20 border-primary text-white' 
                                        : 'bg-white/5 border-white/10 text-text-muted hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <span>{style.icon}</span>
                                {style.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6">
                        {/* Preview & Generator */}
                        <div className="flex flex-col items-center gap-3 shrink-0">
                            <div className="w-32 h-32 rounded-full bg-white/5 border border-white/10 overflow-hidden shadow-lg relative group">
                                {displayContent ? (
                                    displayContent.type === 'svg' ? (
                                        <div 
                                            className="w-full h-full"
                                            dangerouslySetInnerHTML={{ __html: displayContent.value }}
                                        />
                                    ) : (
                                        <img 
                                            src={displayContent.value} 
                                            alt="Avatar Preview" 
                                            className="w-full h-full object-cover"
                                        />
                                    )
                                ) : (
                                    <div className="w-full h-full animate-pulse bg-white/10" />
                                )}
                                
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        onClick={handleRefresh}
                                        className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
                                        title="Gerar novo aleatório"
                                    >
                                        <RefreshCw size={24} />
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleRefresh}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                                <RefreshCw size={12} /> Gerar Aleatório
                            </button>
                        </div>

                        {/* Presets Grid */}
                        <div className="flex-1">
                            <label className="text-xs text-text-muted mb-3 block">
                                Sugestões ({currentStyle === 'multiavatar' ? 'Abstrato' : 'Sementes'}):
                            </label>
                            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                                {PRESETS.map((preset) => (
                                    <div 
                                        key={preset}
                                        onClick={() => setCurrentSeed(preset)}
                                        className={`aspect-square rounded-lg overflow-hidden border cursor-pointer transition-all hover:scale-105 relative ${
                                            currentSeed === preset ? 'border-primary ring-2 ring-primary/30' : 'border-white/10 hover:border-white/30'
                                        }`}
                                        title={preset}
                                    >
                                        {currentStyle === 'multiavatar' ? (
                                            <div 
                                                className="w-full h-full"
                                                dangerouslySetInnerHTML={{ __html: multiavatar(preset) }}
                                            />
                                        ) : (
                                            <img 
                                                src={`https://api.dicebear.com/9.x/${currentStyle === 'human' ? 'avataaars' : currentStyle === 'bot' ? 'bottts' : currentStyle}/svg?seed=${preset}`}
                                                alt={preset}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col sm:flex-row gap-6">
                    {/* Upload Preview */}
                    <div className="flex flex-col items-center gap-3 shrink-0">
                        <div className="w-32 h-32 rounded-full bg-white/5 border border-white/10 overflow-hidden shadow-lg relative">
                            {uploadedUrl ? (
                                <img 
                                    src={uploadedUrl} 
                                    alt="Uploaded Avatar" 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/20">
                                    <ImageIcon size={40} />
                                </div>
                            )}
                        </div>
                        {uploadedUrl && (
                            <p className="text-xs text-emerald-400 flex items-center gap-1">
                                <span>✓</span> Imagem carregada
                            </p>
                        )}
                    </div>

                    {/* Uploader */}
                    <div className="flex-1">
                        <label className="text-xs text-text-muted mb-3 block">
                            Envie uma imagem (JPG, PNG, GIF):
                        </label>
                        <div className="max-w-md">
                            <R2Uploader 
                                folderPath={clientName ? `${clientName}/Avatar` : "avatars"}
                                onUploadComplete={handleUploadComplete} 
                            />
                        </div>
                    </div>
                </div>
            )}

            <p className="text-xs text-text-muted -mt-2">
                {mode === 'generated' 
                    ? '* Escolha um estilo e clique em "Gerar Aleatório" ou selecione uma sugestão.' 
                    : '* A imagem enviada substituirá o avatar gerado automaticamente.'}
            </p>
        </div>
    );
}
