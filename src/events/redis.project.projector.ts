import { getAnalyticsRedis } from '../utils/analytics.redis';
import { TaskEvents } from '../messaging/event.publisher';

export interface ProjectMetrics {
    total: number;
    byStatus: Record<string, number>;
}

export type ApplyResult = 'applied' | 'duplicate' | 'unknown_task' | 'skipped';

export interface ProjectorOptions {
    prefix?: string;
    dedupeTtlSeconds?: number;
}

const KNOWN_STATUSES = ['Not-Started', 'In-Progress', 'Completed'];

const CREATED_SCRIPT = `
if not redis.call('SET', KEYS[1], '1', 'NX', 'EX', ARGV[1]) then return 0 end
redis.call('HSET', KEYS[2], 'project_id', ARGV[3], 'status', 'Not-Started')
redis.call('HINCRBY', ARGV[2] .. ARGV[3], 'Not-Started', 1)
return 1
`;

const STATUS_CHANGED_SCRIPT = `
if not redis.call('SET', KEYS[1], '1', 'NX', 'EX', ARGV[1]) then return 0 end
local projectId = redis.call('HGET', KEYS[2], 'project_id')
if not projectId then
  redis.call('INCR', KEYS[3])
  return 2
end
local oldStatus = redis.call('HGET', KEYS[2], 'status')
local projectKey = ARGV[2] .. projectId
redis.call('HINCRBY', projectKey, oldStatus, -1)
redis.call('HINCRBY', projectKey, ARGV[3], 1)
redis.call('HSET', KEYS[2], 'status', ARGV[3])
return 1
`;

export class RedisProjectProjector {
    private readonly prefix: string;
    private readonly ttl: number;

    constructor(options: ProjectorOptions = {}) {
        this.prefix = options.prefix ?? 'pms:analytics';
        this.ttl = options.dedupeTtlSeconds ?? 86_400;
    }

    private projectKey = (projectId: string) => `${this.prefix}:project:${projectId}`;
    private taskKey = (taskId: string) => `${this.prefix}:task:${taskId}`;
    private processedKey = (eventId: string) => `${this.prefix}:processed:${eventId}`;
    private ignoredKey = () => `${this.prefix}:ignored`;

    public async apply(event: { eventId: string; type: string; payload: any }): Promise<ApplyResult> {
        const redis = await getAnalyticsRedis();
        const { task_id, project_id, new_status } = event.payload ?? {};

        let result: unknown;
        if (event.type === TaskEvents.Created && task_id && project_id) {
            result = await redis.eval(CREATED_SCRIPT, {
                keys: [this.processedKey(event.eventId), this.taskKey(task_id), this.ignoredKey()],
                arguments: [String(this.ttl), `${this.prefix}:project:`, String(project_id)],
            });
        } else if (event.type === TaskEvents.StatusChanged && task_id && new_status) {
            result = await redis.eval(STATUS_CHANGED_SCRIPT, {
                keys: [this.processedKey(event.eventId), this.taskKey(task_id), this.ignoredKey()],
                arguments: [String(this.ttl), `${this.prefix}:project:`, String(new_status)],
            });
        } else {
            return 'skipped';
        }
        return result === 0 ? 'duplicate' : result === 2 ? 'unknown_task' : 'applied';
    }

    public async getMetrics(projectId: string): Promise<ProjectMetrics> {
        const redis = await getAnalyticsRedis();
        const raw = await redis.hGetAll(this.projectKey(projectId));
        const byStatus: Record<string, number> = {};
        KNOWN_STATUSES.forEach((s) => (byStatus[s] = 0));
        for (const [status, count] of Object.entries(raw)) byStatus[status] = Number(count);
        return { total: Object.values(byStatus).reduce((a, b) => a + b, 0), byStatus };
    }

    public async getIgnoredCount(): Promise<number> {
        const redis = await getAnalyticsRedis();
        return Number((await redis.get(this.ignoredKey())) ?? 0);
    }

    public async rebuild(tasks: Array<{ task_id: string; project_id: string; status: string }>): Promise<void> {
        const redis = await getAnalyticsRedis();

        for (const pattern of ['project', 'task']) {
            const stale: string[] = [];
            for await (const key of redis.scanIterator({ MATCH: `${this.prefix}:${pattern}:*`, COUNT: 500 })) {
                stale.push(...(Array.isArray(key) ? key : [key]));
            }
            if (stale.length) await redis.del(stale);
        }
        await redis.del(this.ignoredKey());

        for (let i = 0; i < tasks.length; i += 1000) {
            const multi = redis.multi();
            for (const t of tasks.slice(i, i + 1000)) {
                multi.hSet(this.taskKey(t.task_id), { project_id: t.project_id, status: t.status });
                multi.hIncrBy(this.projectKey(t.project_id), t.status, 1);
            }
            await multi.exec();
        }
    }
}