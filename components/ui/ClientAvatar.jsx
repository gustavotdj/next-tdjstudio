'use client';

import { useEffect, useState } from 'react';
import multiavatar from '@multiavatar/multiavatar';

export default function ClientAvatar({ seed, size = "w-12 h-12", className = "" }) {
    const [content, setContent] = useState(null);

    useEffect(() => {
        if (!seed) return;

        // Check if it's a URL (Upload)
        if (seed.startsWith('http') || seed.startsWith('https://')) {
            setContent({ type: 'img', value: seed });
            return;
        }

        // Check for style prefix (style:seed)
        const parts = seed.split(':');
        const style = parts.length > 1 ? parts[0] : 'multiavatar';
        const seedValue = parts.length > 1 ? parts[1] : seed;

        if (style === 'multiavatar') {
            setContent({ type: 'svg', value: multiavatar(seedValue) });
        } else {
            // Use DiceBear API for other styles
            // Styles mapping: 
            // human -> avataaars
            // adventurer -> adventurer
            // bot -> bottts
            // initials -> initials
            let dicebearStyle = style;
            if (style === 'human') dicebearStyle = 'avataaars';
            if (style === 'bot') dicebearStyle = 'bottts';
            
            const url = `https://api.dicebear.com/9.x/${dicebearStyle}/svg?seed=${encodeURIComponent(seedValue)}`;
            setContent({ type: 'img', value: url });
        }
    }, [seed]);

    if (!seed) return <div className={`${size} rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold ${className}`}>?</div>;

    if (!content) return <div className={`${size} rounded-full bg-white/5 animate-pulse ${className}`} />;

    if (content.type === 'svg') {
        return (
            <div 
                className={`${size} rounded-full overflow-hidden bg-white/5 ${className}`}
                dangerouslySetInnerHTML={{ __html: content.value }}
            />
        );
    }

    return (
        <div className={`${size} rounded-full overflow-hidden bg-white/5 ${className}`}>
            <img 
                src={content.value} 
                alt="Avatar" 
                className="w-full h-full object-cover"
            />
        </div>
    );
}
