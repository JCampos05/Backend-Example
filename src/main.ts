import 'dotenv/config';
import 'reflect-metadata';
import cluster from 'cluster';
import os from 'os';
import { ExpressServer } from './server';
import { CacheUtil } from './utils/cache.util';
import { UsersUtil } from './components/users/users.controller';

if (cluster.isPrimary) {
    const numCPUs = os.cpus().length;
    console.log(`Master process ${process.pid} is running. Forking for ${numCPUs} CPUs...`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker process ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });
} else {
    // Cada worker abre su propia conexión a Redis (el primario no la necesita)
    new CacheUtil();

    const server = new ExpressServer();

    // Precarga de caché diferida: solo un worker la ejecuta para no repetirla N veces
    if (cluster.worker?.id === 1) {
        setTimeout(() => {
            UsersUtil.putAllUsersInCache();
        }, 10000);
    }

    process.on('uncaughtException', (error: Error) => {
        console.error(`Uncaught exception in worker process ${process.pid}:`, error);
        server.closeServer();
    });

    process.on('SIGINT', () => {
        console.log('Received SIGINT. Closing worker process...');
        server.closeServer();
    });

    process.on('SIGTERM', () => {
        console.log('Received SIGTERM. Closing worker process...');
        server.closeServer();
    });
}