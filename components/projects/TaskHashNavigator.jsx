'use client';

import { useEffect } from 'react';
import { useTaskNavigation } from './TaskNavigationContext';

export default function TaskHashNavigator({ subProjects }) {
    const { requestOpenTask } = useTaskNavigation();

    useEffect(() => {
        const handleHashChange = (e) => {
            const hash = window.location.hash;
            if (hash.startsWith('#task-')) {
                // If this was triggered by a hashchange event, prevent default if possible
                // Note: hashchange doesn't allow preventDefault to stop the scroll, 
                // but we can manage the scroll position or use a different ID pattern.
                
                const taskId = hash.replace('#task-', '');
                
                // Find which subProject this task belongs to
                let foundSubProjectId = null;
                for (const sub of subProjects) {
                    const stages = sub.content?.stages || [];
                    for (const stage of stages) {
                        if (stage.items?.find(item => item.id === taskId)) {
                            foundSubProjectId = sub.id;
                            break;
                        }
                    }
                    if (foundSubProjectId) break;
                }

                if (foundSubProjectId) {
                    requestOpenTask(foundSubProjectId, taskId);
                }
            }
        };

        // Check on mount
        handleHashChange();

        // Listen for changes
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [subProjects, requestOpenTask]);

    return null;
}
