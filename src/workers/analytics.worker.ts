import { parentPort } from 'node:worker_threads';
import { computeProjectAnalytics, TaskRow } from '../utils/analytics.compute';

parentPort?.on('message', (data: { tasks: TaskRow[] }) => {
    parentPort?.postMessage(computeProjectAnalytics(data.tasks));
});