'use client';

import { useMemo } from 'react';

export default function GanttChart({ subProjects }) {
    // Extract all tasks with dates from all subprojects
    const ganttData = useMemo(() => {
        const data = [];
        
        subProjects.forEach(sub => {
            const tasks = [];
            sub.content?.stages?.forEach(stage => {
                stage.items?.forEach(item => {
                    if (item.startDate && item.dueDate) {
                        tasks.push({
                            id: item.id,
                            name: item.text,
                            start: new Date(item.startDate),
                            end: new Date(item.dueDate),
                            completed: item.completed,
                            stageName: stage.name
                        });
                    }
                });
            });

            if (tasks.length > 0) {
                data.push({
                    subProjectId: sub.id,
                    subProjectName: sub.name,
                    tasks: tasks.sort((a, b) => a.start - b.start)
                });
            }
        });

        return data;
    }, [subProjects]);

    // Calculate chart range
    const { minDate, maxDate, totalDays } = useMemo(() => {
        let min = null;
        let max = null;

        ganttData.forEach(group => {
            group.tasks.forEach(task => {
                if (!min || task.start < min) min = task.start;
                if (!max || task.end > max) max = task.end;
            });
        });

        if (!min || !max) return { minDate: null, maxDate: null, totalDays: 0 };

        // Start from the first task's date and end at the last task's date
        const start = new Date(min);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(max);
        end.setHours(23, 59, 59, 999);

        // Add 1 day padding at start and end for better visibility
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() + 1);

        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return { minDate: start, maxDate: end, totalDays: diffDays };
    }, [ganttData]);

    if (ganttData.length === 0) return null;

    const getPosition = (date) => {
        const diffTime = Math.abs(date - minDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return (diffDays / totalDays) * 100;
    };

    const getWidth = (start, end) => {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return (diffDays / totalDays) * 100;
    };

    // Generate headers (Days or Months depending on duration)
    const headers = useMemo(() => {
        if (!minDate || !maxDate) return [];
        
        const items = [];
        let current = new Date(minDate);
        
        // If duration is less than 60 days, show day markers (every 5 days)
        if (totalDays <= 60) {
            while (current <= maxDate) {
                items.push({
                    label: `${current.getDate()}/${current.getMonth() + 1}`,
                    width: (1 / totalDays) * 100,
                    isMajor: current.getDate() === 1 || items.length === 0
                });
                current.setDate(current.getDate() + 1);
            }
        } else {
            // Show months
            while (current <= maxDate) {
                const month = current.toLocaleString('pt-BR', { month: 'short' });
                const year = current.getFullYear();
                const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
                
                // Adjust daysInMonth for the first and last month
                let actualDays = daysInMonth;
                if (current.getMonth() === minDate.getMonth() && current.getFullYear() === minDate.getFullYear()) {
                    actualDays = daysInMonth - minDate.getDate() + 1;
                } else if (current.getMonth() === maxDate.getMonth() && current.getFullYear() === maxDate.getFullYear()) {
                    actualDays = maxDate.getDate();
                }

                items.push({
                    label: `${month}/${year}`,
                    width: (actualDays / totalDays) * 100
                });
                
                current.setMonth(current.getMonth() + 1);
                current.setDate(1);
            }
        }
        return items;
    }, [minDate, maxDate, totalDays]);

    const todayPosition = useMemo(() => {
        if (!minDate || !maxDate) return null;
        const today = new Date();
        if (today < minDate || today > maxDate) return null;
        return getPosition(today);
    }, [minDate, maxDate]);

    return (
        <div className="bg-surface/50 rounded-2xl border border-white/5 p-6 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    📅
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Cronograma do Projeto</h3>
                    <p className="text-xs text-text-muted uppercase tracking-widest font-bold">Gantt Chart de Planejamento</p>
                </div>
            </div>

            <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <div className="min-w-[1000px] relative">
                    {/* Today Line */}
                    {todayPosition !== null && (
                        <div 
                            className="absolute top-0 bottom-0 w-px bg-blue-500 z-10 pointer-events-none shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            style={{ left: `${todayPosition}%` }}
                        >
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-500 shadow-sm"></div>
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                                Hoje
                            </div>
                        </div>
                    )}

                    {/* Headers */}
                    <div className="flex border-b border-white/5 mb-4">
                        <div className="w-48 flex-shrink-0"></div>
                        <div className="flex-1 flex">
                            {headers.map((h, i) => (
                                <div 
                                    key={i} 
                                    className={`text-[9px] font-black uppercase tracking-widest text-text-muted border-l border-white/5 px-1 py-1 truncate ${h.isMajor ? 'text-primary/70 bg-primary/5' : ''}`}
                                    style={{ width: `${h.width}%` }}
                                    title={h.label}
                                >
                                    {totalDays <= 60 ? (i % 5 === 0 || h.isMajor ? h.label : '') : h.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Gantt Rows */}
                    <div className="space-y-6">
                        {ganttData.map((group) => (
                            <div key={group.subProjectId} className="space-y-2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-primary/70 mb-2">
                                    {group.subProjectName}
                                </div>
                                {group.tasks.map((task) => (
                                    <div key={task.id} className="flex items-center group">
                                        <div className="w-48 flex-shrink-0 pr-4">
                                            <div className="text-xs font-medium text-white truncate" title={task.name}>
                                                {task.name}
                                            </div>
                                            <div className="text-[9px] text-text-muted uppercase">
                                                {task.stageName}
                                            </div>
                                        </div>
                                        <div className="flex-1 h-8 relative bg-white/[0.02] rounded-md">
                                            {/* Task Bar */}
                                            <div 
                                                className={`absolute top-1.5 h-5 rounded-full transition-all group-hover:h-6 group-hover:top-1 flex items-center justify-center px-2 overflow-hidden shadow-lg ${
                                                    task.completed 
                                                    ? 'bg-emerald-500/40 border border-emerald-500/30 text-emerald-100 shadow-emerald-500/10' 
                                                    : 'bg-primary/40 border border-primary/30 text-primary-100 shadow-primary/10'
                                                }`}
                                                style={{ 
                                                    left: `${getPosition(task.start)}%`,
                                                    width: `${getWidth(task.start, task.end)}%`,
                                                    minWidth: '60px'
                                                }}
                                            >
                                                <span className="text-[8px] font-bold whitespace-nowrap transition-opacity">
                                                    {task.start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {task.end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="mt-8 flex gap-6 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-primary/40 border border-primary/30"></div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Planejado</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-500/30"></div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Concluído</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
