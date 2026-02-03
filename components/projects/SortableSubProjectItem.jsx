'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SubProjectCard from './SubProjectCard';
import { GripVertical } from 'lucide-react';

export default function SortableSubProjectItem({ subProject, projectId, projectName, clientName, availableClients, currentClientId }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: subProject.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="relative group">
            {/* Drag Handle */}
            <div 
                {...attributes} 
                {...listeners} 
                className="absolute -left-8 top-6 p-1 cursor-grab text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity touch-none"
                title="Arraste para reordenar"
            >
                <GripVertical size={20} />
            </div>
            
            <SubProjectCard 
                subProject={subProject} 
                projectId={projectId} 
                projectName={projectName}
                clientName={clientName}
                availableClients={availableClients}
                currentClientId={currentClientId}
            />
        </div>
    );
}
