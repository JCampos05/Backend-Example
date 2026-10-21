import { Level } from 'level';

export interface ActivityEvent {
    taskId: string;
    userId: string;
    action: string;
    timestamp: string;
}

export class ActivityLoggerService {
    private db: Level<string, ActivityEvent>;
    private sequence = 0;

    constructor(dbPath: string) {
        this.db = new Level<string, ActivityEvent>(dbPath, { valueEncoding: 'json' });
    }

    public async logEvent(taskId: string, userId: string, action: string): Promise<void> {
        const timestamp = new Date().toISOString();
        const seq = String(this.sequence++ % 1_000_000).padStart(6, '0');
        const key = `event:${taskId}:${timestamp}:${seq}`;
        await this.db.put(key, { taskId, userId, action, timestamp });
    }

    public async getTaskHistory(taskId: string): Promise<ActivityEvent[]> {
        const prefix = `event:${taskId}:`;
        const events: ActivityEvent[] = [];
        for await (const value of this.db.values({ gte: prefix, lte: `${prefix}\uffff` })) {
            events.push(value);
        }
        return events;
    }

    public async close(): Promise<void> {
        await this.db.close();
    }
}