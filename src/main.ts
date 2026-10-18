import cluster from 'cluster';
import os from 'os';
import { ExpressServer } from './server';

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
    const server = new ExpressServer();

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
