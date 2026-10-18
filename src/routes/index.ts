import { Express, Router } from 'express';
import { RoleRoutes } from '../components/roles/roles.routes';
//import { UserRoutes } from '../components/users/users_routes';
//import { ProjectRoutes } from '../components/projects/projects_routes';
//import { TaskRoutes } from '../components/tasks/tasks_routes';
//import { CommentRoutes } from '../components/comments/comments_routes';

export class Routes {
    public router!: Router;

    constructor(app: Express) {
        const routeClasses = [
            RoleRoutes,
            //UserRoutes,
            //ProjectRoutes,
            //TaskRoutes,
            //CommentRoutes
        ];

        for (const RouteClass of routeClasses) {
            try {
                new RouteClass(app);
                console.log(`Router : ${RouteClass.name} - Connected`);
            } catch (error) {
                console.log(`Router : ${RouteClass.name} - Failed`);
            }
        }
    }
}
