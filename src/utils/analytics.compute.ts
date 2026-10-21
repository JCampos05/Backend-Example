export interface TaskRow {
    status: string;
    priority: string;
    user_id?: string | null;
    estimated_end_time?: Date | null;
    actual_start_time?: Date | null;
    actual_end_time?: Date | null;
}

export interface ProjectAnalytics {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    completionRate: number;
    overdue: number;
    unassigned: number;
    avgDurationHours: number | null;
}

export function computeProjectAnalytics(tasks: TaskRow[], now: Date = new Date()): ProjectAnalytics {
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let completed = 0, overdue = 0, unassigned = 0, durationMs = 0, durations = 0;

    for (const t of tasks) {
        byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
        byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
        if (!t.user_id) unassigned++;

        if (t.status === 'Completed') {
            completed++;
            if (t.actual_start_time && t.actual_end_time) {
                durationMs += new Date(t.actual_end_time).getTime() - new Date(t.actual_start_time).getTime();
                durations++;
            }
        } else if (t.estimated_end_time && new Date(t.estimated_end_time) < now) {
            overdue++;
        }
    }

    return {
        total: tasks.length,
        byStatus,
        byPriority,
        completionRate: tasks.length ? completed / tasks.length : 0,
        overdue,
        unassigned,
        avgDurationHours: durations ? durationMs / durations / 3_600_000 : null,
    };
}