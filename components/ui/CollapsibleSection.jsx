'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function CollapsibleSection({ 
    title, 
    children, 
    defaultOpen = true, 
    icon = null,
    headerRight = null,
    className = "",
    id = null // Unique ID for persistence
}) {
    // Initialize state with defaultOpen to match server SSR
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (id) {
            const savedState = localStorage.getItem(`collapsible_${id}`);
            if (savedState !== null) {
                setIsOpen(JSON.parse(savedState));
            }
        }
    }, [id]);

    // Update localStorage when state changes (only after mount)
    useEffect(() => {
        if (isMounted && id) {
            localStorage.setItem(`collapsible_${id}`, JSON.stringify(isOpen));
        }
    }, [isOpen, id, isMounted]);

    return (
        <div className={`border border-white/5 rounded-2xl overflow-hidden transition-all ${className} ${isOpen ? 'bg-surface/30' : 'bg-surface/10 hover:bg-surface/20'}`}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`p-5 flex items-center justify-between cursor-pointer select-none transition-colors ${isOpen ? 'border-b border-white/5' : ''}`}
            >
                <div className="flex items-center gap-3">
                    {icon && <span className="text-primary">{icon}</span>}
                    <h3 className="font-bold text-white text-lg">{title}</h3>
                </div>
                
                <div className="flex items-center gap-4">
                    {headerRight && <div onClick={e => e.stopPropagation()}>{headerRight}</div>}
                    <button className="text-text-muted hover:text-white transition-colors">
                        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>
            </div>
            
            {isOpen && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
}
