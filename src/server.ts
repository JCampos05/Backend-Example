import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { IServerConfig } from './utils/config';
import config from '../server_config.json';
import { Routes } from './routes/index';
import { DatabaseUtil } from './utils/db';

export class ExpressServer {
    public static server: any = null;
    public server_config: IServerConfig = config;

    constructor() {
        const port = this.server_config.port ?? 3000;
        const app: Express = express();

        app.use(bodyParser.urlencoded({ extended: false }));
        app.use(bodyParser.json());

        app.get('/ping', (req: Request, res: Response) => {
            res.send('pong');
        });

        // Conectar rutas centralizadas
        const routes = new Routes(app);
        if (routes) {
            console.log('Server Routes started for server');
        }

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
