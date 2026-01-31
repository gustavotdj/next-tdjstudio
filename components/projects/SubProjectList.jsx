'use client';

import { useState, useEffect } from 'react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableSubProjectItem from './SortableSubProjectItem';
import { updateSubProjectPositions } from 'app/actions/project-actions';

export default function SubProjectList({ initialSubProjects, projectId }) {
  const [items, setItems] = useState(initialSubProjects);

  // Sync with server data if it changes (e.g. after adding a new one)
  useEffect(() => {
    setItems(initialSubProjects);
  }, [initialSubProjects]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Trigger server action
        updateSubProjectPositions(projectId, newItems);
        
        return newItems;
      });
    }
  };

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={items.map(i => i.id)} 
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4 ml-8"> {/* Added margin-left for the handle */}
            {items.length > 0 ? (
                items.map((sub) => (
                    <SortableSubProjectItem key={sub.id} subProject={sub} projectId={projectId} />
                ))
            ) : (
                <div className="p-12 text-center text-text-muted bg-surface rounded-xl border border-white/5 -ml-8">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-2xl opacity-50">📋</div>
                        <p>Nenhum sub-projeto criado ainda.</p>
                        <p className="text-sm">Crie um acima para gerenciar etapas e checklists.</p>
                    </div>
                </div>
            )}
        </div>
      </SortableContext>
    </DndContext>
  );
}
