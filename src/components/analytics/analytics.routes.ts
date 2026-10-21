import { Express } from 'express';
import { param } from 'express-validator';
import { AnalyticsController } from './analytics.controller';
import { authorize } from '../../utils/auth.util';
import { validate } from '../../utils/validator';

export class AnalyticsRoutes {
    private baseEndPoint = '/api/analytics';

    constructor(app: Express) {
        const c = new AnalyticsController();

        app.get(
            `${this.baseEndPoint}/projects/:id`,
            authorize,
            validate([param('id').isUUID().withMessage('El id del proyecto debe ser un UUID válido')]),
            c.getProjectAnalyticsHandler
        );
    }
}