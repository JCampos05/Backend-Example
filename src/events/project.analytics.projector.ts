import { StoredEvent } from './event.store';
import { TaskEvents } from '../messaging/event.publisher';

export interface ProjectMetrics {
    total: number;
    byStatus: Record<string, number>;
}

export class ProjectAnalyticsProjector {
    private readonly processed = new Set<string>();
    private readonly tasks = new Map<string, { projectId: string; status: string }>();
    private readonly projects = new Map<string, Record<string, number>>();
    public ignoredEvents = 0;

    public handleEvent(event: StoredEvent): void {
        if (this.processed.has(event.eventId)) return;

        switch (event.eventType) {
            case TaskEvents.Created: {
                const { task_id, project_id } = event.payload;
                this.tasks.set(task_id, { projectId: project_id, status: 'Not-Started' });
                this.adjust(project_id, 'Not-Started', +1);
                break;
            }
            case TaskEvents.StatusChanged: {
                const { task_id, new_status } = event.payload;
                const known = this.tasks.get(task_id);
                if (!known) {
                    this.ignoredEvents++;
                    break;
                }
                this.adjust(known.projectId, known.status, -1);
                this.adjust(known.projectId, new_status, +1);
                known.status = new_status;
                break;
            }
            default:
                break;
        }
        this.processed.add(event.eventId);
    }

    private adjust(projectId: string, status: string, delta: number): void {
        const counts = this.projects.get(projectId) ?? {};
        counts[status] = (counts[status] ?? 0) + delta;
        this.projects.set(projectId, counts);
    }

    public getMetrics(projectId: string): ProjectMetrics {
        const byStatus = { ...(this.projects.get(projectId) ?? {}) };
        const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
        return { total, byStatus };
    }
}

export function foldTaskStatus(events: StoredEvent[], until?: Date): string | null {
    let status: string | null = null;
    for (const event of events) {
        if (until && event.timestamp > until) break;
        if (event.eventType === TaskEvents.Created) status = 'Not-Started';
        else if (event.eventType === TaskEvents.StatusChanged) status = event.payload.new_status;
    }
    return status;
}