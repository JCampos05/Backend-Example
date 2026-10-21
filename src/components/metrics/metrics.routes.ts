import { Express } from 'express';
import { param } from 'express-validator';
import { MetricsController } from './metrics.controller';
import { authorize } from '../../utils/auth.util';
import { validate } from '../../utils/validator';

export class MetricsRoutes {
    private baseEndPoint = '/api/metrics';

    constructor(app: Express) {
        const c = new MetricsController();

        app.get(
            `${this.baseEndPoint}/projects/:id`,
            authorize,
            validate([param('id').isUUID().withMessage('El id del proyecto debe ser un UUID válido')]),
            c.getProjectMetricsHandler
        );
    }
}