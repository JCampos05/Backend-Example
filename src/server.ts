import { Express } from 'express';
import { IServerConfig } from './utils/config';
import config from '../server_config.json';
import { DatabaseUtil } from './utils/db';
import { createApp } from './app';

export class ExpressServer {
    public static server: any = null;
    public server_config: IServerConfig = config;

    constructor() {
        const port = this.server_config.port ?? 3000;
        const app: Express = createApp();

        // Conectar base de datos
        new DatabaseUtil();

        ExpressServer.server = app.listen(port, () => {
            console.log(`Server is running on port ${port} with pid = ${process.pid}`);
        });
    }

    public closeServer(): void {
        if (ExpressServer.server) {
            ExpressServer.server.close(() => {
                console.log('Server closed gracefully');
                process.exit(0);
            });
        }
    }
}