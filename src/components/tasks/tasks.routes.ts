import { Express } from 'express';
import { body } from 'express-validator';
import { TaskController } from './tasks.controller';
import { authorize, requirePermission } from '../../utils/auth.util';
import { validate } from '../../utils/validator';
import { Priority, Status } from './tasks.entity';

const taskRules = (creating: boolean) => [
    creating
        ? body('name').trim().notEmpty().withMessage('El nombre de la tarea es obligatorio')
            .isLength({ min: 3, max: 60 }).withMessage('El nombre debe tener entre 3 y 60 caracteres')
        : body('name').optional().trim().isLength({ min: 3, max: 60 }).withMessage('El nombre debe tener entre 3 y 60 caracteres'),
    ...(creating ? [body('project_id').isUUID().withMessage('project_id debe ser un UUID válido')] : []),
    body('user_id').optional().isUUID().withMessage('user_id debe ser un UUID válido'),
    body('priority').optional().isIn(Object.values(Priority)).withMessage(`priority debe ser: ${Object.values(Priority).join(', ')}`),
    body('status').optional().isIn(Object.values(Status)).withMessage(`status debe ser: ${Object.values(Status).join(', ')}`),
    body('estimated_start_time').optional().isISO8601().withMessage('Fecha de inicio estimada inválida'),
    body('estimated_end_time').optional().isISO8601().withMessage('Fecha de fin estimada inválida')
        .custom((end, { req }) => {
            if (req.body.estimated_start_time && new Date(end) <= new Date(req.body.estimated_start_time)) {
                throw new Error('La fecha de fin estimada debe ser posterior a la de inicio');
            }
            return true;
        }),
];

const validStatusInput = [
    body('status').isIn(Object.values(Status)).withMessage(`status debe ser: ${Object.values(Status).join(', ')}`),
];

export class TaskRoutes {
    private baseEndPoint = '/api/tasks';

    constructor(app: Express) {
        const c = new TaskController();

        app.route(this.baseEndPoint)
            .get(authorize, requirePermission('get_all_tasks'), c.getAllHandler)
            .post(authorize, requirePermission('add_task'), validate(taskRules(true)), c.addHandler);

        app.patch(`${this.baseEndPoint}/:id/status`, authorize, requirePermission('edit_task'), validate(validStatusInput), c.updateStatusHandler);

        app.route(`${this.baseEndPoint}/:id`)
            .get(authorize, requirePermission('get_details_task'), c.getOneHandler)
            .put(authorize, requirePermission('edit_task'), validate(taskRules(false)), c.updateHandler)
            .delete(authorize, requirePermission('delete_task'), c.deleteHandler);
    }
}
