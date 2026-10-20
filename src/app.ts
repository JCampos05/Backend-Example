import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { Routes } from './routes/index';

export function createApp(): Express {
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

    return app;
}