import path from 'node:path';
import { WorkerPool } from './worker.pool';

let pool: WorkerPool | undefined;

export const getAnalyticsPool = (): WorkerPool => {
    if (!pool) {
        const workerFile = path.join(__dirname, '../workers/analytics.worker' + path.extname(__filename));
        pool = new WorkerPool(workerFile, {
            size: Number(process.env.ANALYTICS_THREADS) || 2,
            taskTimeoutMs: 10_000,
        });
    }
    return pool;
};

export const destroyAnalyticsPool = async (): Promise<void> => {
    await pool?.destroy();
    pool = undefined;
};