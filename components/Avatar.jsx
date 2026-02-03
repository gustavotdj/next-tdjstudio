import Image from 'next/image';

export function Avatar({ seed, className = "", size = 32 }) {
    // Using Multiavatar API (free, open source)
    // Generates a unique SVG avatar based on the seed string (name, email, id, etc.)
    const avatarUrl = `https://api.multiavatar.com/${encodeURIComponent(seed || 'User')}.svg`;

    return (
        <div className={`relative overflow-hidden rounded-full bg-surface border border-white/10 ${className}`} style={{ width: size, height: size }}>
            <Image 
                src={avatarUrl}
                alt={`Avatar for ${seed}`}
                fill
                className="object-cover"
                unoptimized // Required for external SVG API if domain not in next.config
            />
        </div>
    );
}
