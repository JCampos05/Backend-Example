import 'dotenv/config';
import 'reflect-metadata';
import { DatabaseUtil } from '../utils/db';
import { Tasks } from '../components/tasks/tasks.entity';
import { RedisProjectProjector } from '../events/redis.project.projector';
import { closeAnalyticsRedis } from '../utils/analytics.redis';

(async () => {
    await DatabaseUtil.connect();
    const tasks = await new DatabaseUtil().getRepository(Tasks).find({
        select: { task_id: true, project_id: true, status: true },
    });
    await new RedisProjectProjector().rebuild(tasks.map((t) => ({ task_id: t.task_id, project_id: t.project_id, status: t.status })));
    console.log(`[Rebuild] ${tasks.length} tareas cargadas en Redis`);
    await closeAnalyticsRedis();
    process.exit(0);
})().catch((error) => {
    console.error('[Rebuild] Error:', error.message);
    process.exit(1);
});