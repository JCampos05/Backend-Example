import 'reflect-metadata';
import { NotificationUtil } from '../utils/notification.util';
import { QueueWorker } from './queue.worker';

new QueueWorker().beginProcessing();

const shutdown = async () => {
    console.log('Cerrando worker de colas...');
    await NotificationUtil.emailQueue.close();
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);