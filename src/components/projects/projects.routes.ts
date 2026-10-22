import { Express } from 'express';
import { body } from 'express-validator';
import { ProjectController } from './projects.controller';
import { ProjectStatus } from './projects.entity';
import { authorize, requirePermission } from '../../utils/auth.util';
import { validate } from '../../utils/validator';

const projectRules = (creating: boolean) => [
    creating
        ? body('name').trim().notEmpty().withMessage('El nombre del proyecto es obligatorio')
            .isLength({ min: 3, max: 30 }).withMessage('El nombre debe tener entre 3 y 30 caracteres')
        : body('name').optional().trim().isLength({ min: 3, max: 30 }).withMessage('El nombre debe tener entre 3 y 30 caracteres'),
    body('description').optional().isLength({ max: 500 }).withMessage('La descripción supera los 500 caracteres'),
    body('status').optional().isIn(Object.values(ProjectStatus)).withMessage(`status debe ser: ${Object.values(ProjectStatus).join(', ')}`),
    body('user_ids').optional().isArray().withMessage('user_ids debe ser un arreglo de UUIDs'),
    body('start_time').optional().isISO8601().withMessage('Fecha de inicio inválida (formato ISO 8601)'),
    body('end_time').optional().isISO8601().withMessage('Fecha de fin inválida (formato ISO 8601)')
        .custom((end, { req }) => {
            if (req.body.start_time && new Date(end) <= new Date(req.body.start_time)) {
                throw new Error('La fecha de fin debe ser posterior a la de inicio');
            }
            return true;
        }),
];

export class ProjectRoutes {
    private baseEndPoint = '/api/projects';

    constructor(app: Express) {
        const c = new ProjectController();

        // Ruta específica antes de '/:id'
        app.post(`${this.baseEndPoint}/transaccion-atomica`, authorize, requirePermission('add_project'), validate(projectRules(true)), c.addWithDefaultTaskHandler);

        app.route(this.baseEndPoint)
            .get(authorize, requirePermission('get_all_projects'), c.getAllHandler)
            .post(authorize, requirePermission('add_project'), validate(projectRules(true)), c.addHandler);

        app.route(`${this.baseEndPoint}/:id`)
            .get(authorize, requirePermission('get_details_project'), c.getOneHandler)
            .put(authorize, requirePermission('edit_project'), validate(projectRules(false)), c.updateHandler)
            .delete(authorize, requirePermission('delete_project'), c.deleteHandler);
    }
}
