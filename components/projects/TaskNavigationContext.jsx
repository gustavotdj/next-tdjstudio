'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const TaskNavigationContext = createContext({
    openTaskRequest: null, // { subProjectId, taskId }
    requestOpenTask: null, // Default to null to indicate no provider
    clearRequest: () => {}
});

export function TaskNavigationProvider({ children }) {
    const [openTaskRequest, setOpenTaskRequest] = useState(null);

    const requestOpenTask = useCallback((subProjectId, taskId) => {
        setOpenTaskRequest({ subProjectId, taskId, timestamp: Date.now() });
    }, []);

    const clearRequest = useCallback(() => {
        setOpenTaskRequest(null);
    }, []);

    return (
        <TaskNavigationContext.Provider value={{ openTaskRequest, requestOpenTask, clearRequest }}>
            {children}
        </TaskNavigationContext.Provider>
    );
}

export function useTaskNavigation() {
    return useContext(TaskNavigationContext);
}
