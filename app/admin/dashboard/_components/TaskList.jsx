'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Briefcase, ArrowRight, Clock } from 'lucide-react';
import { updateSubProjectContent } from 'app/actions/project-actions';

export default function TaskList({ tasksByProject, userRole = 'admin' }) {
    // State to track active tab for each project
    // { projectId: subProjectId }
    const [activeTabs, setActiveTabs] = useState({});

    const toggleTab = (projectId, subProjectId) => {
        setActiveTabs(prev => ({
            ...prev,
            [projectId]: subProjectId
        }));
    };

    return (
        <div className="space-y-8 flex-1">
            {Object.entries(tasksByProject).map(([projectId, { projectName, projectStatus, tasks }]) => {
                const pPending = tasks.filter(t => !t.isCompleted).length;
                const pCompleted = tasks.filter(t => t.isCompleted).length;

                // Group tasks by subProject
                const tasksBySubProject = tasks.reduce((acc, task) => {
                    if (!acc[task.subProjectId]) {
                        acc[task.subProjectId] = {
                            name: task.subProjectName,
                            tasks: []
                        };
                    }
                    acc[task.subProjectId].tasks.push(task);
                    return acc;
                }, {});

                const subProjectIds = Object.keys(tasksBySubProject);
                const activeSubProjectId = activeTabs[projectId] || subProjectIds[0];
                const activeSubProject = tasksBySubProject[activeSubProjectId];

                return (
                    <div key={projectId} className={`border rounded-xl overflow-hidden shadow-inner flex flex-col ${
                        projectStatus === 'archived' ? 'bg-black/40 border-white/5 opacity-70' : 
                        projectStatus === 'completed' ? 'bg-blue-950/10 border-blue-500/10' : 
                        projectStatus === 'paused' ? 'bg-amber-950/10 border-amber-500/10' :
                        'bg-black/20 border-white/5'
                    }`}>
                        {/* Header */}
                        <div className={`px-5 py-3 flex justify-between items-center border-b ${
                            projectStatus === 'completed' ? 'bg-blue-500/5 border-blue-500/10' : 
                            projectStatus === 'paused' ? 'bg-amber-500/5 border-amber-500/10' :
                            'bg-white/5 border-white/5'
                        }`}>
                            <h4 className="font-bold text-white text-base flex items-center gap-2">
                                <Briefcase size={14} className={projectStatus === 'active' ? "text-primary" : projectStatus === 'paused' ? "text-amber-500" : "text-text-muted"} />
                                {projectName}
                                {projectStatus !== 'active' && (
                                    <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                                        projectStatus === 'completed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                        projectStatus === 'paused' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                        'bg-white/5 text-text-muted border-white/10'
                                    }`}>
                                        {projectStatus === 'completed' ? 'Concluído' : projectStatus === 'paused' ? 'Pausado' : 'Arquivado'}
                                    </span>
                                )}
                            </h4>
                            <div className="flex gap-2">
                                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                                    projectStatus === 'paused' ? 'bg-amber-500/20 text-amber-500 border-amber-500/20' :
                                    'bg-primary/20 text-primary border-primary/20'
                                }`}>{pPending} pendentes</span>
                                {pCompleted > 0 && (
                                    <span className="text-xs font-bold px-3 py-1 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                        {pCompleted} concluídas
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        {subProjectIds.length > 1 && (
                            <div className="flex overflow-x-auto border-b border-white/5 bg-black/20 px-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                {subProjectIds.map(subId => {
                                    const sub = tasksBySubProject[subId];
                                    const isActive = subId === activeSubProjectId;
                                    const subPending = sub.tasks.filter(t => !t.isCompleted).length;
                                    
                                    return (
                                        <button
                                            key={subId}
                                            onClick={() => toggleTab(projectId, subId)}
                                            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                                                isActive 
                                                    ? 'border-primary text-white bg-white/5' 
                                                    : 'border-transparent text-text-muted hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            {sub.name}
                                            {subPending > 0 && (
                                                <span className="bg-primary/20 text-primary px-1.5 rounded-full text-[10px]">{subPending}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Task List */}
                        <div className="divide-y divide-white/5 flex-1 overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {activeSubProject ? (
                                activeSubProject.tasks.map((task, idx) => (
                                    <div 
                                        key={`${task.id}-${idx}`}
                                        className={`flex items-start gap-4 px-5 py-4 transition-colors group ${
                                            task.isCompleted ? 'hover:bg-emerald-500/5 opacity-60 hover:opacity-100' : 'hover:bg-white/5'
                                        }`}
                                    >
                                        {/* Checkbox Action */}
                                        <div className="mt-1">
                                            <div 
                                                onClick={async (e) => {
                                                    e.preventDefault(); // Prevent navigation if clicking checkbox area
                                                    const newContent = JSON.parse(JSON.stringify(task.subProjectContent));
                                                    let found = false;
                                                    if (newContent.stages) {
                                                        for (const stage of newContent.stages) {
                                                            if (stage.items) {
                                                                for (const item of stage.items) {
                                                                    if (item.id === task.id) {
                                                                        item.completed = !item.completed;
                                                                        found = true;
                                                                        break;
                                                                    }
                                                                }
                                                            }
                                                            if (found) break;
                                                        }
                                                    }
                                                    if (found) {
                                                        await updateSubProjectContent(task.subProjectId, newContent, projectId);
                                                    }
                                                }}
                                                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                                                    task.isCompleted 
                                                        ? 'border-emerald-500 bg-emerald-500/20' 
                                                        : 'border-primary/40 hover:border-primary hover:bg-primary/20'
                                                }`} 
                                                title={task.isCompleted ? "Marcar como pendente" : "Marcar como concluído"}
                                            >
                                                {task.isCompleted ? (
                                                    <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                                                ) : (
                                                    <div className="w-3 h-3 bg-primary rounded-sm opacity-0 hover:opacity-50 transition-opacity"></div>
                                                )}
                                            </div>
                                        </div>

                                        <Link 
                                            href={userRole === 'client' 
                                                ? `/client/projects/${task.projectId}#task-${task.id}` 
                                                : `/admin/projects/${task.projectId}#task-${task.id}`
                                            }
                                            className="flex-1 min-w-0 group-hover:cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {task.isCompleted && <div className="text-emerald-400 text-[10px] font-bold border border-emerald-500/20 bg-emerald-500/10 px-1.5 rounded">FEITO</div>}
                                                        <span className={`text-sm transition-colors block font-medium ${
                                                            task.isCompleted ? 'text-text-muted line-through decoration-white/20' : 'text-gray-300 group-hover:text-white'
                                                        }`}>{task.text}</span>
                                                    </div>
                                                    <div className="flex flex-col gap-1 text-[10px] text-text-muted">
                                                        {/* Subproject name is redundant if tabs are active, but keep if only 1 subproject or for context */}
                                                        {subProjectIds.length === 1 && (
                                                            <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5 w-fit">{task.subProjectName}</span>
                                                        )}
                                                        {task.description && <span className={`whitespace-pre-wrap ${task.isCompleted ? 'opacity-40' : 'opacity-60'}`}>{task.description}</span>}
                                                    </div>
                                                </div>
                                                
                                                {task.dueDate && !task.isCompleted && (
                                                    <span className={`text-[10px] font-mono whitespace-nowrap px-2 py-1 rounded border ${
                                                        new Date(task.dueDate) < new Date() 
                                                            ? 'bg-red-500/10 text-red-400 border-red-500/20 font-bold' 
                                                            : 'bg-white/5 text-text-muted border-white/10'
                                                    }`}>
                                                        <Clock size={12} />
                                                        {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-text-muted italic">
                                    Selecione uma fase para ver as tarefas.
                                </div>
                            )}
                        </div>

                        <div className="bg-white/5 px-5 py-2 text-center border-t border-white/5">
                            <Link 
                                href={userRole === 'client' 
                                    ? `/client/projects/${projectId}` 
                                    : `/admin/projects/${projectId}`
                                } 
                                className="text-xs text-text-muted hover:text-white transition-colors flex items-center justify-center gap-1 py-1"
                            >
                                Ver projeto completo <ArrowRight size={10} />
                            </Link>
                        </div>
                    </div>
                );
            })}
            {Object.keys(tasksByProject).length === 0 && (
                <div className="text-center text-text-muted py-12 italic bg-black/20 rounded-xl border border-white/5 border-dashed">
                    <CheckSquare size={32} className="mx-auto mb-3 opacity-20" />
                    Nenhuma tarefa encontrada.
                </div>
            )}
        </div>
    );
}