'use client';

import { useTaskNavigation } from './TaskNavigationContext';

export default function TaskLink({ taskId, subProjectId, children, className }) {
    const { requestOpenTask } = useTaskNavigation();

    const handleClick = (e) => {
        // Only prevent default if we have a valid requestOpenTask
        if (requestOpenTask) {
            e.preventDefault();
            requestOpenTask(subProjectId, taskId);
            
            // Also update hash for consistency
            window.location.hash = `task-${taskId}`;
        }
    };

    return (
        <a 
            href={`#task-${taskId}`} 
            onClick={handleClick}
            className={className}
        >
            {children}
        </a>
    );
}
