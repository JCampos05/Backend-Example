import { Express, Router } from 'express';
import { RoleRoutes } from '../components/roles/roles.routes';
import { UserRoutes } from '../components/users/users.routes';
import { ProjectRoutes } from '../components/projects/projects.routes';
import { TaskRoutes } from '../components/tasks/tasks.routes';
import { CommentRoutes } from '../components/comments/comments.routes';
import { MetricsRoutes } from '../components/metrics/metrics.routes';

export class Routes {
    public router!: Router;

    constructor(app: Express) {
        const routeClasses: Array<new (app: Express) => unknown> = [
            RoleRoutes,
            UserRoutes,
            ProjectRoutes,
            TaskRoutes,
            CommentRoutes,
            MetricsRoutes
        ];

        for (const RouteClass of routeClasses) {
            try {
                new RouteClass(app);
                console.log(`Router : ${RouteClass.name} - Connected`);
            } catch (error) {
                console.log(`Router : ${RouteClass.name} - Failed`, error);
            }
        }
    }
}